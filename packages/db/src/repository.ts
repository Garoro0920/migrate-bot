import {
  assertTransition,
  type JobState,
  newCustomerId,
  newInstallationId,
  newJobId,
  newOrderId,
  newTraceId,
} from '@migrate-bot/shared';
import { eq } from 'drizzle-orm';
import type { AnyDbClient } from './client';
import {
  customers,
  installations,
  type Job,
  jobEvents,
  jobs,
  type NewJob,
  type Order,
  orders,
} from './schema';

// 高レベル repository 関数。dialect を意識せず select/insert/update を行うため
// 純粋に drizzle のクエリビルダだけを使う (raw SQL は使わない)。
// SQLite/D1 で同じ API なので AnyDbClient で受ける。

export interface UpsertInstallationInput {
  readonly githubInstallationId: number;
  readonly accountLogin: string;
}

export async function upsertInstallation(
  db: AnyDbClient,
  input: UpsertInstallationInput,
): Promise<{ id: string; created: boolean }> {
  const existing = await db
    .select()
    .from(installations)
    .where(eq(installations.githubInstallationId, input.githubInstallationId))
    .limit(1);
  const first = existing[0];
  if (first) {
    if (first.revokedAt !== null) {
      // re-install: revokedAt をクリア
      await db
        .update(installations)
        .set({ revokedAt: null, accountLogin: input.accountLogin })
        .where(eq(installations.id, first.id));
    } else if (first.accountLogin !== input.accountLogin) {
      await db
        .update(installations)
        .set({ accountLogin: input.accountLogin })
        .where(eq(installations.id, first.id));
    }
    return { id: first.id, created: false };
  }
  const id = newInstallationId();
  await db.insert(installations).values({
    id,
    githubInstallationId: input.githubInstallationId,
    accountLogin: input.accountLogin,
  });
  return { id, created: true };
}

export async function markInstallationRevoked(
  db: AnyDbClient,
  githubInstallationId: number,
): Promise<void> {
  await db
    .update(installations)
    .set({ revokedAt: Date.now() })
    .where(eq(installations.githubInstallationId, githubInstallationId));
}

export interface CreateJobInput {
  readonly installationId: string;
  readonly repoFullName: string;
  readonly plan: 'small' | 'medium' | 'large' | 'enterprise';
}

export async function createJob(
  db: AnyDbClient,
  input: CreateJobInput,
): Promise<{ jobId: string; traceId: string }> {
  const jobId = newJobId();
  const traceId = newTraceId();
  const newJob: NewJob = {
    id: jobId,
    installationId: input.installationId,
    repoFullName: input.repoFullName,
    plan: input.plan,
    state: 'queued',
    traceId,
  };
  await db.insert(jobs).values(newJob);
  return { jobId, traceId };
}

export async function loadJob(db: AnyDbClient, jobId: string): Promise<Job | null> {
  const rows = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return rows[0] ?? null;
}

export interface TransitionJobInput {
  readonly jobId: string;
  readonly toState: JobState;
  readonly reason: string;
  readonly prUrl?: string;
}

export async function transitionJob(
  db: AnyDbClient,
  input: TransitionJobInput,
): Promise<{ from: JobState; to: JobState }> {
  const job = await loadJob(db, input.jobId);
  if (!job) throw new Error(`job not found: ${input.jobId}`);
  assertTransition(job.state, input.toState);

  const now = Date.now();
  const startedAt = job.state === 'queued' && input.toState === 'analyzing' ? now : undefined;
  const completedAt =
    input.toState === 'pr_ready' || input.toState === 'refunded' || input.toState === 'cancelled'
      ? now
      : undefined;

  await db
    .update(jobs)
    .set({
      state: input.toState,
      ...(startedAt !== undefined ? { startedAt } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
      ...(input.prUrl !== undefined ? { prUrl: input.prUrl } : {}),
    })
    .where(eq(jobs.id, input.jobId));

  await db.insert(jobEvents).values({
    id: newCustomerId(), // re-use uuid factory (not customer specific, just unique id)
    jobId: input.jobId,
    fromState: job.state,
    toState: input.toState,
    reason: input.reason,
  });

  return { from: job.state, to: input.toState };
}

export async function recordJobUsage(
  db: AnyDbClient,
  jobId: string,
  delta: { tokensInput: number; tokensOutput: number; costUsd: number },
): Promise<void> {
  const job = await loadJob(db, jobId);
  if (!job) throw new Error(`job not found: ${jobId}`);
  await db
    .update(jobs)
    .set({
      tokensInput: job.tokensInput + delta.tokensInput,
      tokensOutput: job.tokensOutput + delta.tokensOutput,
      costUsd: job.costUsd + delta.costUsd,
    })
    .where(eq(jobs.id, jobId));
}

// ─── customers ──────────────────────────────────────────────────────────────

export interface UpsertCustomerInput {
  readonly email: string;
  readonly stripeCustomerId?: string;
}

export async function upsertCustomerByEmail(
  db: AnyDbClient,
  input: UpsertCustomerInput,
): Promise<{ id: string; created: boolean }> {
  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.email, input.email))
    .limit(1);
  const first = existing[0];
  if (first) {
    if (input.stripeCustomerId !== undefined && first.stripeCustomerId !== input.stripeCustomerId) {
      await db
        .update(customers)
        .set({ stripeCustomerId: input.stripeCustomerId })
        .where(eq(customers.id, first.id));
    }
    return { id: first.id, created: false };
  }
  const id = newCustomerId();
  await db.insert(customers).values({
    id,
    email: input.email,
    ...(input.stripeCustomerId !== undefined ? { stripeCustomerId: input.stripeCustomerId } : {}),
  });
  return { id, created: true };
}

// ─── orders ─────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  // 省略時は newOrderId() で生成。Stripe Checkout の client_reference_id に
  // pre-generated id を使うために caller が指定するケースに対応。
  readonly orderId?: string;
  readonly customerId: string;
  readonly installationId: string;
  readonly repoFullName: string;
  readonly plan: 'small' | 'medium' | 'large' | 'enterprise';
  readonly amountUsdCents: number;
  readonly stripeSessionId: string;
}

export async function createOrder(
  db: AnyDbClient,
  input: CreateOrderInput,
): Promise<{ orderId: string }> {
  const orderId = input.orderId ?? newOrderId();
  await db.insert(orders).values({
    id: orderId,
    customerId: input.customerId,
    installationId: input.installationId,
    repoFullName: input.repoFullName,
    plan: input.plan,
    amountUsdCents: input.amountUsdCents,
    state: 'pending',
    stripeSessionId: input.stripeSessionId,
  });
  return { orderId };
}

export async function loadOrder(db: AnyDbClient, orderId: string): Promise<Order | null> {
  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return rows[0] ?? null;
}

export async function getOrderByStripeSessionId(
  db: AnyDbClient,
  stripeSessionId: string,
): Promise<Order | null> {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.stripeSessionId, stripeSessionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOrderByJobId(db: AnyDbClient, jobId: string): Promise<Order | null> {
  const rows = await db.select().from(orders).where(eq(orders.jobId, jobId)).limit(1);
  return rows[0] ?? null;
}

export interface MarkOrderPaidInput {
  readonly orderId: string;
  readonly stripePaymentIntentId: string;
  readonly jobId?: string;
}

// 二重支払/重複イベントへの idempotency: state が既に paid 以降ならスキップ。
export async function markOrderPaid(
  db: AnyDbClient,
  input: MarkOrderPaidInput,
): Promise<{ alreadyHandled: boolean }> {
  const order = await loadOrder(db, input.orderId);
  if (!order) throw new Error(`order not found: ${input.orderId}`);
  if (order.state !== 'pending') return { alreadyHandled: true };
  await db
    .update(orders)
    .set({
      state: 'paid',
      stripePaymentIntentId: input.stripePaymentIntentId,
      paidAt: Date.now(),
      ...(input.jobId !== undefined ? { jobId: input.jobId } : {}),
    })
    .where(eq(orders.id, input.orderId));
  return { alreadyHandled: false };
}

export async function linkOrderToJob(
  db: AnyDbClient,
  orderId: string,
  jobId: string,
): Promise<void> {
  await db.update(orders).set({ jobId }).where(eq(orders.id, orderId));
}

export async function markOrderRefunded(
  db: AnyDbClient,
  orderId: string,
): Promise<{ alreadyHandled: boolean }> {
  const order = await loadOrder(db, orderId);
  if (!order) throw new Error(`order not found: ${orderId}`);
  if (order.state === 'refunded') return { alreadyHandled: true };
  await db
    .update(orders)
    .set({ state: 'refunded', refundedAt: Date.now() })
    .where(eq(orders.id, orderId));
  return { alreadyHandled: false };
}

export async function markOrderExpired(db: AnyDbClient, orderId: string): Promise<void> {
  const order = await loadOrder(db, orderId);
  if (!order) throw new Error(`order not found: ${orderId}`);
  if (order.state !== 'pending') return;
  await db.update(orders).set({ state: 'expired' }).where(eq(orders.id, orderId));
}

export async function markOrderFailed(db: AnyDbClient, orderId: string): Promise<void> {
  const order = await loadOrder(db, orderId);
  if (!order) throw new Error(`order not found: ${orderId}`);
  if (order.state !== 'pending') return;
  await db.update(orders).set({ state: 'failed' }).where(eq(orders.id, orderId));
}

export type { Job, Order };
export { customers, orders };
