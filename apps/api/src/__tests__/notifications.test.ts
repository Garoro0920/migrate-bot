import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createJob,
  createOrder,
  createSqliteClient,
  linkOrderToJob,
  markOrderPaid,
  type SqliteClient,
  transitionJob,
  upsertCustomerByEmail,
  upsertInstallation,
} from '@migrate-bot/db';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type EmailClient, ResendError } from '../email';
import { notifyPaymentReceived, notifyPrReady, notifyRefunded } from '../notifications';

const here = dirname(fileURLToPath(import.meta.url));
const INITIAL_SQL = readFileSync(
  resolve(here, '../../../../packages/db/migrations/0000_initial.sql'),
  'utf-8',
);
const ORDERS_SQL = readFileSync(
  resolve(here, '../../../../packages/db/migrations/0001_orders.sql'),
  'utf-8',
);

function makeEmailStub(): { email: EmailClient; sent: ReturnType<typeof vi.fn> } {
  const sent = vi.fn().mockResolvedValue({ id: 'em_x' });
  return { email: { send: sent }, sent };
}

async function seedFullScenario(
  db: SqliteClient,
  options: { paid: boolean; prUrl?: string } = { paid: true },
): Promise<{ orderId: string; jobId: string; customerEmail: string }> {
  const customerEmail = `notif-${Math.random().toString(36).slice(2)}@example.com`;
  const inst = await upsertInstallation(db, {
    githubInstallationId: Math.floor(Math.random() * 1_000_000),
    accountLogin: 'octocat',
  });
  const cust = await upsertCustomerByEmail(db, { email: customerEmail });
  const { jobId } = await createJob(db, {
    installationId: inst.id,
    repoFullName: 'octocat/hello',
    plan: 'medium',
  });
  const { orderId } = await createOrder(db, {
    customerId: cust.id,
    installationId: inst.id,
    repoFullName: 'octocat/hello',
    plan: 'medium',
    amountUsdCents: 24900,
    stripeSessionId: `cs_${jobId}`,
  });
  await linkOrderToJob(db, orderId, jobId);
  if (options.paid) {
    await markOrderPaid(db, { orderId, stripePaymentIntentId: 'pi_n', jobId });
  }
  if (options.prUrl) {
    await transitionJob(db, { jobId, toState: 'analyzing', reason: 'seed' });
    await transitionJob(db, { jobId, toState: 'planning', reason: 'seed' });
    await transitionJob(db, { jobId, toState: 'migrating', reason: 'seed' });
    await transitionJob(db, { jobId, toState: 'verifying', reason: 'seed' });
    await transitionJob(db, {
      jobId,
      toState: 'pr_ready',
      reason: 'seed',
      prUrl: options.prUrl,
    });
  }
  return { orderId, jobId, customerEmail };
}

describe('notifyPaymentReceived', () => {
  let sqlite: Database.Database;
  let db: SqliteClient;
  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(INITIAL_SQL);
    sqlite.exec(ORDERS_SQL);
    db = createSqliteClient(sqlite);
  });
  afterEach(() => sqlite.close());

  it('sends payment received email to the customer', async () => {
    const { orderId, customerEmail } = await seedFullScenario(db, { paid: true });
    const { email, sent } = makeEmailStub();
    await notifyPaymentReceived(db, email, orderId);
    expect(sent).toHaveBeenCalledTimes(1);
    const arg = sent.mock.calls[0]?.[0];
    expect(arg.to).toBe(customerEmail);
    expect(arg.subject).toContain('octocat/hello');
    expect(arg.subject).toContain('medium');
  });

  it('does not throw if email send fails (logs only)', async () => {
    const { orderId } = await seedFullScenario(db, { paid: true });
    const email: EmailClient = {
      send: vi.fn().mockRejectedValue(new Error('SMTP down')),
    };
    await expect(notifyPaymentReceived(db, email, orderId)).resolves.toBeUndefined();
  });

  // A12: Resend 4xx (permanent) と 5xx (transient) を log で区別する
  it('logs EMAIL_PERMANENT_FAILURE on Resend 4xx (e.g. invalid email)', async () => {
    const { orderId } = await seedFullScenario(db, { paid: true });
    const email: EmailClient = {
      send: vi.fn().mockRejectedValue(new ResendError(422, '{"error":"invalid_to"}')),
    };
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await notifyPaymentReceived(db, email, orderId);
    expect(errSpy).toHaveBeenCalledWith(
      'notifyPaymentReceived failed',
      expect.objectContaining({ alert: 'EMAIL_PERMANENT_FAILURE', status: 422 }),
    );
    errSpy.mockRestore();
  });

  it('logs EMAIL_TRANSIENT_FAILURE on Resend 5xx (e.g. provider outage)', async () => {
    const { orderId } = await seedFullScenario(db, { paid: true });
    const email: EmailClient = {
      send: vi.fn().mockRejectedValue(new ResendError(503, 'Service Unavailable')),
    };
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await notifyPaymentReceived(db, email, orderId);
    expect(errSpy).toHaveBeenCalledWith(
      'notifyPaymentReceived failed',
      expect.objectContaining({ alert: 'EMAIL_TRANSIENT_FAILURE', status: 503 }),
    );
    errSpy.mockRestore();
  });

  it('logs EMAIL_UNKNOWN_FAILURE on non-Resend errors (e.g. network)', async () => {
    const { orderId } = await seedFullScenario(db, { paid: true });
    const email: EmailClient = {
      send: vi.fn().mockRejectedValue(new Error('ECONNRESET')),
    };
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await notifyPaymentReceived(db, email, orderId);
    expect(errSpy).toHaveBeenCalledWith(
      'notifyPaymentReceived failed',
      expect.objectContaining({ alert: 'EMAIL_UNKNOWN_FAILURE' }),
    );
    errSpy.mockRestore();
  });

  it('is a no-op for unknown orderId', async () => {
    const { email, sent } = makeEmailStub();
    await notifyPaymentReceived(db, email, 'missing');
    expect(sent).not.toHaveBeenCalled();
  });
});

describe('notifyPrReady', () => {
  let sqlite: Database.Database;
  let db: SqliteClient;
  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(INITIAL_SQL);
    sqlite.exec(ORDERS_SQL);
    db = createSqliteClient(sqlite);
  });
  afterEach(() => sqlite.close());

  it('sends PR ready email with the PR URL', async () => {
    const prUrl = 'https://github.com/octocat/hello/pull/42';
    const { jobId, customerEmail } = await seedFullScenario(db, { paid: true, prUrl });
    const { email, sent } = makeEmailStub();
    await notifyPrReady(db, email, jobId);
    expect(sent).toHaveBeenCalledTimes(1);
    const arg = sent.mock.calls[0]?.[0];
    expect(arg.to).toBe(customerEmail);
    expect(arg.text).toContain(prUrl);
  });

  it('is a no-op when job has no prUrl', async () => {
    const { jobId } = await seedFullScenario(db, { paid: true });
    const { email, sent } = makeEmailStub();
    await notifyPrReady(db, email, jobId);
    expect(sent).not.toHaveBeenCalled();
  });

  it('is a no-op when no order exists for the job (admin/trigger path)', async () => {
    const inst = await upsertInstallation(db, {
      githubInstallationId: 9999,
      accountLogin: 'octocat',
    });
    const { jobId } = await createJob(db, {
      installationId: inst.id,
      repoFullName: 'octocat/hello',
      plan: 'small',
    });
    await transitionJob(db, { jobId, toState: 'analyzing', reason: 'seed' });
    await transitionJob(db, { jobId, toState: 'planning', reason: 'seed' });
    await transitionJob(db, { jobId, toState: 'migrating', reason: 'seed' });
    await transitionJob(db, { jobId, toState: 'verifying', reason: 'seed' });
    await transitionJob(db, {
      jobId,
      toState: 'pr_ready',
      reason: 'seed',
      prUrl: 'https://example.com/pr',
    });
    const { email, sent } = makeEmailStub();
    await notifyPrReady(db, email, jobId);
    expect(sent).not.toHaveBeenCalled();
  });
});

describe('notifyRefunded', () => {
  let sqlite: Database.Database;
  let db: SqliteClient;
  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(INITIAL_SQL);
    sqlite.exec(ORDERS_SQL);
    db = createSqliteClient(sqlite);
  });
  afterEach(() => sqlite.close());

  it('sends refunded email mentioning the amount and reason', async () => {
    const { jobId, customerEmail } = await seedFullScenario(db, { paid: true });
    const { email, sent } = makeEmailStub();
    await notifyRefunded(db, email, jobId, 'verify failed: typecheck');
    expect(sent).toHaveBeenCalledTimes(1);
    const arg = sent.mock.calls[0]?.[0];
    expect(arg.to).toBe(customerEmail);
    expect(arg.text).toContain('$249.00');
    expect(arg.text).toContain('verify failed: typecheck');
  });

  it('is a no-op for jobs with no order (admin path)', async () => {
    const inst = await upsertInstallation(db, {
      githubInstallationId: 7777,
      accountLogin: 'octocat',
    });
    const { jobId } = await createJob(db, {
      installationId: inst.id,
      repoFullName: 'octocat/hello',
      plan: 'small',
    });
    const { email, sent } = makeEmailStub();
    await notifyRefunded(db, email, jobId, 'reason');
    expect(sent).not.toHaveBeenCalled();
  });
});
