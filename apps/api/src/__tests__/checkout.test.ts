import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSqliteClient,
  installations,
  orders,
  type SqliteClient,
  upsertInstallation,
} from '@migrate-bot/db';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CheckoutContext, createCheckoutRouter } from '../routes/checkout';
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

interface AppEnv {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  CHECKOUT_SUCCESS_URL: string;
  CHECKOUT_CANCEL_URL: string;
}

const ENV: AppEnv = {
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  CHECKOUT_SUCCESS_URL: 'https://app/success',
  CHECKOUT_CANCEL_URL: 'https://app/cancel',
};

function buildApp(db: SqliteClient, stripe: StripeClient) {
  const app = new Hono<CheckoutContext>();
  app.use('*', async (c, next) => {
    c.set('db', db);
    c.set('stripe', stripe);
    await next();
  });
  app.route('/checkout', createCheckoutRouter());
  return app;
}

function makeStripeStub(
  overrides: Partial<{
    createCheckoutSession: ReturnType<typeof vi.fn>;
    verifyWebhookSignature: ReturnType<typeof vi.fn>;
    createRefund: ReturnType<typeof vi.fn>;
  }> = {},
): StripeClient {
  return {
    createCheckoutSession:
      overrides.createCheckoutSession ??
      vi.fn().mockResolvedValue({
        sessionId: 'cs_default',
        url: 'https://checkout.stripe.com/c/pay/cs_default',
      }),
    verifyWebhookSignature:
      overrides.verifyWebhookSignature ?? vi.fn().mockRejectedValue(new Error('not used')),
    createRefund: overrides.createRefund ?? vi.fn().mockRejectedValue(new Error('not used')),
  };
}

describe('POST /checkout/create-session', () => {
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

  it('returns 400 for invalid body shape', async () => {
    const stripe = makeStripeStub();
    const app = buildApp(db, stripe);
    const res = await app.request(
      '/checkout/create-session',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ githubInstallationId: 'not a number' }),
      },
      ENV,
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when the installation is unknown', async () => {
    const stripe = makeStripeStub();
    const app = buildApp(db, stripe);
    const res = await app.request(
      '/checkout/create-session',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          githubInstallationId: 99999,
          repoFullName: 'octocat/hello',
          plan: 'small',
          customerEmail: 'a@example.com',
        }),
      },
      ENV,
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/installation not found/);
  });

  it('returns 409 when the installation is revoked', async () => {
    const inst = await upsertInstallation(db, {
      githubInstallationId: 100,
      accountLogin: 'octocat',
    });
    sqlite.prepare('UPDATE installations SET revoked_at = 1 WHERE id = ?').run(inst.id);
    const stripe = makeStripeStub();
    const app = buildApp(db, stripe);
    const res = await app.request(
      '/checkout/create-session',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          githubInstallationId: 100,
          repoFullName: 'octocat/hello',
          plan: 'small',
          customerEmail: 'a@example.com',
        }),
      },
      ENV,
    );
    expect(res.status).toBe(409);
  });

  it('happy path: creates session, persists order, returns checkout url', async () => {
    await upsertInstallation(db, {
      githubInstallationId: 200,
      accountLogin: 'octocat',
    });
    const createCheckoutSession = vi.fn().mockResolvedValue({
      sessionId: 'cs_test_happy',
      url: 'https://checkout.stripe.com/c/pay/cs_test_happy',
    });
    const stripe = makeStripeStub({ createCheckoutSession });
    const app = buildApp(db, stripe);

    const res = await app.request(
      '/checkout/create-session',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          githubInstallationId: 200,
          repoFullName: 'octocat/hello',
          plan: 'medium',
          customerEmail: 'happy@example.com',
        }),
      },
      ENV,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      orderId: string;
      checkoutUrl: string;
    };
    expect(body.ok).toBe(true);
    expect(body.orderId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.checkoutUrl).toBe('https://checkout.stripe.com/c/pay/cs_test_happy');

    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    const arg = createCheckoutSession.mock.calls[0]?.[0];
    expect(arg.orderId).toBe(body.orderId);
    expect(arg.customerEmail).toBe('happy@example.com');
    expect(arg.plan).toBe('medium');
    expect(arg.amountUsdCents).toBe(24900);
    expect(arg.repoFullName).toBe('octocat/hello');

    // verify order row was inserted
    const orderRow = (
      await db.select().from(orders).where(eq(orders.id, body.orderId)).limit(1)
    )[0];
    expect(orderRow?.state).toBe('pending');
    expect(orderRow?.amountUsdCents).toBe(24900);
    expect(orderRow?.stripeSessionId).toBe('cs_test_happy');
    expect(orderRow?.repoFullName).toBe('octocat/hello');
  });

  it('uses the correct price for each plan (small/medium/large)', async () => {
    await upsertInstallation(db, {
      githubInstallationId: 300,
      accountLogin: 'octocat',
    });

    for (const [plan, expectedCents] of [
      ['small', 9900],
      ['medium', 24900],
      ['large', 49900],
    ] as const) {
      const createCheckoutSession = vi.fn().mockResolvedValue({
        sessionId: `cs_${plan}`,
        url: `https://stripe/${plan}`,
      });
      const stripe = makeStripeStub({ createCheckoutSession });
      const app = buildApp(db, stripe);
      const res = await app.request(
        '/checkout/create-session',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            githubInstallationId: 300,
            repoFullName: 'octocat/repo',
            plan,
            customerEmail: `${plan}@example.com`,
          }),
        },
        ENV,
      );
      expect(res.status).toBe(200);
      const arg = createCheckoutSession.mock.calls[0]?.[0];
      expect(arg.amountUsdCents).toBe(expectedCents);
    }
  });
});
