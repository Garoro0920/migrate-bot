import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createOrder,
  createSqliteClient,
  loadOrder,
  type SqliteClient,
  upsertCustomerByEmail,
  upsertInstallation,
} from '@migrate-bot/db';
import {
  InMemoryQueue,
  type JobQueueMessage,
  type QueueProducer,
} from '@migrate-bot/shared';
import Database from 'better-sqlite3';
import { Hono } from 'hono';
import type Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStripeWebhookRouter,
  type StripeWebhookContext,
} from '../routes/stripe-webhook';
import type { StripeClient } from '../stripe';

const here = dirname(fileURLToPath(import.meta.url));
const INITIAL_SQL = readFileSync(
  resolve(here, '../../../../packages/db/migrations/0000_initial.sql'),
  'utf-8',
);
const ORDERS_SQL = readFileSync(
  resolve(here, '../../../../packages/db/migrations/0001_orders.sql'),
  'utf-8',
);

const ENV = {
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
};

function buildApp(
  db: SqliteClient,
  stripe: StripeClient,
  queue: QueueProducer<JobQueueMessage>,
) {
  const app = new Hono<StripeWebhookContext>();
  app.use('*', async (c, next) => {
    c.set('db', db);
    c.set('stripe', stripe);
    c.set('jobsQueue', queue);
    await next();
  });
  app.route('/webhooks/stripe', createStripeWebhookRouter());
  return app;
}

function makeStripeStub(
  verifyImpl: (rawBody: string, signature: string) => Promise<Stripe.Event>,
): StripeClient {
  return {
    createCheckoutSession: vi.fn().mockRejectedValue(new Error('not used')),
    verifyWebhookSignature: vi.fn(verifyImpl),
    createRefund: vi.fn().mockRejectedValue(new Error('not used')),
  } as unknown as StripeClient;
}

async function seedPaidOrder(db: SqliteClient): Promise<{
  orderId: string;
  installationId: string;
  customerId: string;
  githubInstallationId: number;
}> {
  const inst = await upsertInstallation(db, {
    githubInstallationId: 4242,
    accountLogin: 'octocat',
  });
  const cust = await upsertCustomerByEmail(db, { email: 'pay@example.com' });
  const { orderId } = await createOrder(db, {
    customerId: cust.id,
    installationId: inst.id,
    repoFullName: 'octocat/hello',
    plan: 'small',
    amountUsdCents: 9900,
    stripeSessionId: 'cs_seed',
  });
  return {
    orderId,
    installationId: inst.id,
    customerId: cust.id,
    githubInstallationId: 4242,
  };
}

describe('POST /webhooks/stripe', () => {
  let sqlite: Database.Database;
  let db: SqliteClient;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(INITIAL_SQL);
    sqlite.exec(ORDERS_SQL);
    db = createSqliteClient(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const stripe = makeStripeStub(async () => ({
      type: 'checkout.session.completed',
    }) as Stripe.Event);
    const queue = new InMemoryQueue<JobQueueMessage>();
    const app = buildApp(db, stripe, queue);
    const res = await app.request(
      '/webhooks/stripe',
      { method: 'POST', body: '{}' },
      ENV,
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature verification fails', async () => {
    const stripe = makeStripeStub(async () => {
      throw new Error('signature mismatch');
    });
    const queue = new InMemoryQueue<JobQueueMessage>();
    const app = buildApp(db, stripe, queue);
    const res = await app.request(
      '/webhooks/stripe',
      {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=bad' },
        body: '{}',
      },
      ENV,
    );
    expect(res.status).toBe(400);
  });

  it('handles checkout.session.completed by paying order, creating job, queuing message', async () => {
    const seed = await seedPaidOrder(db);
    const stripe = makeStripeStub(async () => ({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_seed',
          client_reference_id: seed.orderId,
          payment_intent: 'pi_xyz',
        },
      },
    }) as unknown as Stripe.Event);
    const queue = new InMemoryQueue<JobQueueMessage>();
    const app = buildApp(db, stripe, queue);
    const res = await app.request(
      '/webhooks/stripe',
      {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=ok' },
        body: '{}',
      },
      ENV,
    );
    expect(res.status).toBe(200);
    const order = await loadOrder(db, seed.orderId);
    expect(order?.state).toBe('paid');
    expect(order?.stripePaymentIntentId).toBe('pi_xyz');
    expect(order?.jobId).not.toBeNull();
    const queued = queue.drain();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.body.installationId).toBe(seed.githubInstallationId);
    expect(queued[0]?.body.jobId).toBe(order?.jobId);
  });

  it('is idempotent: receiving checkout.session.completed twice creates only one job', async () => {
    const seed = await seedPaidOrder(db);
    const event = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_seed',
          client_reference_id: seed.orderId,
          payment_intent: 'pi_xyz',
        },
      },
    } as unknown as Stripe.Event;
    const stripe = makeStripeStub(async () => event);
    const queue = new InMemoryQueue<JobQueueMessage>();
    const app = buildApp(db, stripe, queue);

    const r1 = await app.request(
      '/webhooks/stripe',
      { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}' },
      ENV,
    );
    expect(r1.status).toBe(200);
    const r2 = await app.request(
      '/webhooks/stripe',
      { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}' },
      ENV,
    );
    expect(r2.status).toBe(200);

    const queued = queue.drain();
    expect(queued).toHaveLength(1);
  });

  it('handles checkout.session.expired by marking order expired', async () => {
    const seed = await seedPaidOrder(db);
    const stripe = makeStripeStub(async () => ({
      id: 'evt_2',
      type: 'checkout.session.expired',
      data: {
        object: {
          id: 'cs_seed',
          client_reference_id: seed.orderId,
        },
      },
    }) as unknown as Stripe.Event);
    const queue = new InMemoryQueue<JobQueueMessage>();
    const app = buildApp(db, stripe, queue);
    const res = await app.request(
      '/webhooks/stripe',
      { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}' },
      ENV,
    );
    expect(res.status).toBe(200);
    const order = await loadOrder(db, seed.orderId);
    expect(order?.state).toBe('expired');
  });

  it('handles charge.refunded by marking order refunded (lookup via payment_intent)', async () => {
    const seed = await seedPaidOrder(db);
    // first mark paid so payment_intent_id is set
    const completedEvent = makeStripeStub(async () => ({
      id: 'evt_pay',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_seed',
          client_reference_id: seed.orderId,
          payment_intent: 'pi_for_refund',
        },
      },
    }) as unknown as Stripe.Event);
    const queue = new InMemoryQueue<JobQueueMessage>();
    const app1 = buildApp(db, completedEvent, queue);
    await app1.request(
      '/webhooks/stripe',
      { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}' },
      ENV,
    );

    // now refund event
    const refundedEvent = makeStripeStub(async () => ({
      id: 'evt_refund',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_1',
          payment_intent: 'pi_for_refund',
        },
      },
    }) as unknown as Stripe.Event);
    const app2 = buildApp(db, refundedEvent, queue);
    const res = await app2.request(
      '/webhooks/stripe',
      { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}' },
      ENV,
    );
    expect(res.status).toBe(200);
    const order = await loadOrder(db, seed.orderId);
    expect(order?.state).toBe('refunded');
    expect(order?.refundedAt).not.toBeNull();
  });

  it('ignores unknown event types with 200 ack', async () => {
    const stripe = makeStripeStub(async () => ({
      id: 'evt_unknown',
      type: 'invoice.payment_succeeded', // not handled
      data: { object: {} },
    }) as unknown as Stripe.Event);
    const queue = new InMemoryQueue<JobQueueMessage>();
    const app = buildApp(db, stripe, queue);
    const res = await app.request(
      '/webhooks/stripe',
      { method: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}' },
      ENV,
    );
    expect(res.status).toBe(200);
  });
});
