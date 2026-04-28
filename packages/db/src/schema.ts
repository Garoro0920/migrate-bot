// docs/architecture.md §5.1 のテーブル定義。Cloudflare D1 = SQLite ベース。
// 命名規則: テーブル名 snake_case 複数形、カラム名 camelCase。

import type { JobState } from '@migrate-bot/shared';
import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const nowEpochMs = sql`(unixepoch('subsec') * 1000)`;

export const installations = sqliteTable('installations', {
  id: text('id').primaryKey(),
  githubInstallationId: integer('github_installation_id').notNull().unique(),
  accountLogin: text('account_login').notNull(),
  createdAt: integer('created_at').notNull().default(nowEpochMs),
  revokedAt: integer('revoked_at'),
});

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  createdAt: integer('created_at').notNull().default(nowEpochMs),
});

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  installationId: text('installation_id')
    .notNull()
    .references(() => installations.id),
  customerId: text('customer_id').references(() => customers.id),
  repoFullName: text('repo_full_name').notNull(),
  plan: text('plan', { enum: ['small', 'medium', 'large', 'enterprise'] }).notNull(),
  state: text('state').notNull().$type<JobState>(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  traceId: text('trace_id').notNull().unique(),
  tokensInput: integer('tokens_input').notNull().default(0),
  tokensOutput: integer('tokens_output').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
  prUrl: text('pr_url'),
  errorCode: text('error_code'),
  errorDetail: text('error_detail'), // JSON encoded
  createdAt: integer('created_at').notNull().default(nowEpochMs),
  startedAt: integer('started_at'),
  completedAt: integer('completed_at'),
});

export const jobEvents = sqliteTable('job_events', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id),
  fromState: text('from_state').notNull().$type<JobState>(),
  toState: text('to_state').notNull().$type<JobState>(),
  reason: text('reason').notNull(),
  createdAt: integer('created_at').notNull().default(nowEpochMs),
});

export const refunds = sqliteTable('refunds', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => jobs.id),
  amountUsd: real('amount_usd').notNull(),
  reason: text('reason').notNull(),
  stripeRefundId: text('stripe_refund_id').unique(),
  createdAt: integer('created_at').notNull().default(nowEpochMs),
});

// Stripe Checkout で開始される注文。state machine:
//   pending --(stripe paid)--> paid --(job created)--> linked to a job
//   pending --(stripe expired)--> expired
//   pending --(stripe failed)--> failed
//   paid --(job failed_ci/aborted_blocker)--> refunded
// idempotency は stripe_session_id (unique) で確保。
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id),
  installationId: text('installation_id')
    .notNull()
    .references(() => installations.id),
  repoFullName: text('repo_full_name').notNull(),
  plan: text('plan', { enum: ['small', 'medium', 'large', 'enterprise'] }).notNull(),
  amountUsdCents: integer('amount_usd_cents').notNull(),
  state: text('state', {
    enum: ['pending', 'paid', 'failed', 'expired', 'refunded'],
  }).notNull(),
  stripeSessionId: text('stripe_session_id').notNull().unique(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  jobId: text('job_id').references(() => jobs.id),
  createdAt: integer('created_at').notNull().default(nowEpochMs),
  paidAt: integer('paid_at'),
  refundedAt: integer('refunded_at'),
});

export const evalRuns = sqliteTable('eval_runs', {
  id: text('id').primaryKey(),
  corpusItem: text('corpus_item').notNull(),
  agentVersion: text('agent_version').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  tokensInput: integer('tokens_input').notNull().default(0),
  tokensOutput: integer('tokens_output').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
  createdAt: integer('created_at').notNull().default(nowEpochMs),
});

export type Installation = typeof installations.$inferSelect;
export type NewInstallation = typeof installations.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobEvent = typeof jobEvents.$inferSelect;
export type NewJobEvent = typeof jobEvents.$inferInsert;
export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderState = Order['state'];
export type EvalRun = typeof evalRuns.$inferSelect;
export type NewEvalRun = typeof evalRuns.$inferInsert;
