import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSqliteClient, type SqliteClient } from '../client';
import {
  createOrder,
  getOrderByStripeSessionId,
  linkOrderToJob,
  loadOrder,
  markOrderExpired,
  markOrderFailed,
  markOrderPaid,
  markOrderRefunded,
  upsertCustomerByEmail,
  upsertInstallation,
} from '../repository';

const here = dirname(fileURLToPath(import.meta.url));
const INITIAL_SQL = readFileSync(resolve(here, '../../migrations/0000_initial.sql'), 'utf-8');
const ORDERS_SQL = readFileSync(resolve(here, '../../migrations/0001_orders.sql'), 'utf-8');

async function seedCustomerAndInstallation(db: SqliteClient): Promise<{
  customerId: string;
  installationId: string;
}> {
  const inst = await upsertInstallation(db, {
    githubInstallationId: 1234,
    accountLogin: 'octocat',
  });
  const cust = await upsertCustomerByEmail(db, { email: 'a@example.com' });
  return { customerId: cust.id, installationId: inst.id };
}

describe('orders repository', () => {
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

  describe('upsertCustomerByEmail', () => {
    it('creates a new customer when email is new', async () => {
      const result = await upsertCustomerByEmail(db, { email: 'new@example.com' });
      expect(result.created).toBe(true);
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('returns existing customer for the same email', async () => {
      const a = await upsertCustomerByEmail(db, { email: 'same@example.com' });
      const b = await upsertCustomerByEmail(db, { email: 'same@example.com' });
      expect(b.created).toBe(false);
      expect(b.id).toBe(a.id);
    });

    it('updates stripeCustomerId when supplied and different', async () => {
      const first = await upsertCustomerByEmail(db, { email: 'x@example.com' });
      await upsertCustomerByEmail(db, { email: 'x@example.com', stripeCustomerId: 'cus_X' });
      const second = await upsertCustomerByEmail(db, { email: 'x@example.com' });
      expect(second.id).toBe(first.id);
    });
  });

  describe('createOrder', () => {
    it('creates a new pending order', async () => {
      const seed = await seedCustomerAndInstallation(db);
      const result = await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
        amountUsdCents: 9900,
        stripeSessionId: 'cs_test_1',
      });
      expect(result.orderId).toMatch(/^[0-9a-f-]{36}$/);
      const order = await loadOrder(db, result.orderId);
      expect(order?.state).toBe('pending');
      expect(order?.amountUsdCents).toBe(9900);
      expect(order?.stripeSessionId).toBe('cs_test_1');
      expect(order?.paidAt).toBeNull();
    });

    it('rejects duplicate stripe_session_id', async () => {
      const seed = await seedCustomerAndInstallation(db);
      await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
        amountUsdCents: 9900,
        stripeSessionId: 'cs_dup',
      });
      await expect(
        createOrder(db, {
          customerId: seed.customerId,
          installationId: seed.installationId,
          repoFullName: 'octocat/hello',
          plan: 'small',
          amountUsdCents: 9900,
          stripeSessionId: 'cs_dup',
        }),
      ).rejects.toThrow();
    });
  });

  describe('getOrderByStripeSessionId', () => {
    it('returns null for unknown session id', async () => {
      const found = await getOrderByStripeSessionId(db, 'cs_unknown');
      expect(found).toBeNull();
    });

    it('returns the order for a known session id', async () => {
      const seed = await seedCustomerAndInstallation(db);
      const created = await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'medium',
        amountUsdCents: 24900,
        stripeSessionId: 'cs_lookup',
      });
      const found = await getOrderByStripeSessionId(db, 'cs_lookup');
      expect(found?.id).toBe(created.orderId);
    });
  });

  describe('markOrderPaid', () => {
    it('transitions pending to paid and sets payment_intent_id', async () => {
      const seed = await seedCustomerAndInstallation(db);
      const { orderId } = await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
        amountUsdCents: 9900,
        stripeSessionId: 'cs_pay',
      });
      const result = await markOrderPaid(db, {
        orderId,
        stripePaymentIntentId: 'pi_123',
      });
      expect(result.alreadyHandled).toBe(false);
      const order = await loadOrder(db, orderId);
      expect(order?.state).toBe('paid');
      expect(order?.stripePaymentIntentId).toBe('pi_123');
      expect(order?.paidAt).not.toBeNull();
    });

    it('returns alreadyHandled=true on second call (idempotent)', async () => {
      const seed = await seedCustomerAndInstallation(db);
      const { orderId } = await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
        amountUsdCents: 9900,
        stripeSessionId: 'cs_pay2',
      });
      await markOrderPaid(db, { orderId, stripePaymentIntentId: 'pi_123' });
      const second = await markOrderPaid(db, { orderId, stripePaymentIntentId: 'pi_123' });
      expect(second.alreadyHandled).toBe(true);
    });

    it('throws for unknown orderId', async () => {
      await expect(
        markOrderPaid(db, { orderId: 'missing', stripePaymentIntentId: 'pi_x' }),
      ).rejects.toThrow(/order not found/);
    });
  });

  describe('linkOrderToJob', () => {
    it('sets the jobId on an order', async () => {
      const seed = await seedCustomerAndInstallation(db);
      const { orderId } = await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
        amountUsdCents: 9900,
        stripeSessionId: 'cs_link',
      });
      // create a real job row to satisfy FK
      const { createJob } = await import('../repository');
      const { jobId } = await createJob(db, {
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
      });
      await linkOrderToJob(db, orderId, jobId);
      const order = await loadOrder(db, orderId);
      expect(order?.jobId).toBe(jobId);
    });
  });

  describe('markOrderRefunded', () => {
    it('transitions paid to refunded and sets refundedAt', async () => {
      const seed = await seedCustomerAndInstallation(db);
      const { orderId } = await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
        amountUsdCents: 9900,
        stripeSessionId: 'cs_refund',
      });
      await markOrderPaid(db, { orderId, stripePaymentIntentId: 'pi_r' });
      const result = await markOrderRefunded(db, orderId);
      expect(result.alreadyHandled).toBe(false);
      const order = await loadOrder(db, orderId);
      expect(order?.state).toBe('refunded');
      expect(order?.refundedAt).not.toBeNull();
    });

    it('is idempotent on second call', async () => {
      const seed = await seedCustomerAndInstallation(db);
      const { orderId } = await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
        amountUsdCents: 9900,
        stripeSessionId: 'cs_refund_idempo',
      });
      await markOrderPaid(db, { orderId, stripePaymentIntentId: 'pi_r' });
      await markOrderRefunded(db, orderId);
      const second = await markOrderRefunded(db, orderId);
      expect(second.alreadyHandled).toBe(true);
    });
  });

  describe('markOrderExpired / markOrderFailed', () => {
    it('marks pending order as expired', async () => {
      const seed = await seedCustomerAndInstallation(db);
      const { orderId } = await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
        amountUsdCents: 9900,
        stripeSessionId: 'cs_exp',
      });
      await markOrderExpired(db, orderId);
      const order = await loadOrder(db, orderId);
      expect(order?.state).toBe('expired');
    });

    it('does nothing if order is already paid (no transition from paid to expired)', async () => {
      const seed = await seedCustomerAndInstallation(db);
      const { orderId } = await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
        amountUsdCents: 9900,
        stripeSessionId: 'cs_exp_paid',
      });
      await markOrderPaid(db, { orderId, stripePaymentIntentId: 'pi_x' });
      await markOrderExpired(db, orderId);
      const order = await loadOrder(db, orderId);
      expect(order?.state).toBe('paid');
    });

    it('marks pending order as failed', async () => {
      const seed = await seedCustomerAndInstallation(db);
      const { orderId } = await createOrder(db, {
        customerId: seed.customerId,
        installationId: seed.installationId,
        repoFullName: 'octocat/hello',
        plan: 'small',
        amountUsdCents: 9900,
        stripeSessionId: 'cs_fail',
      });
      await markOrderFailed(db, orderId);
      const order = await loadOrder(db, orderId);
      expect(order?.state).toBe('failed');
    });
  });
});
