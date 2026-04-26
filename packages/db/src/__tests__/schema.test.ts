import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  customers,
  installations,
  jobEvents,
  jobs,
  type NewInstallation,
  type NewJob,
  type NewJobEvent,
} from '../schema';

// 最小マイグレーション SQL。本番は drizzle-kit generate で同等のものが出る想定。
const SETUP_SQL = `
CREATE TABLE installations (
  id TEXT PRIMARY KEY,
  github_installation_id INTEGER NOT NULL UNIQUE,
  account_login TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000),
  revoked_at INTEGER
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000)
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL REFERENCES installations(id),
  customer_id TEXT REFERENCES customers(id),
  repo_full_name TEXT NOT NULL,
  plan TEXT NOT NULL,
  state TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  trace_id TEXT NOT NULL UNIQUE,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  pr_url TEXT,
  error_code TEXT,
  error_detail TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000),
  started_at INTEGER,
  completed_at INTEGER
);

CREATE TABLE job_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000)
);

CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  amount_usd REAL NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000)
);

CREATE TABLE eval_runs (
  id TEXT PRIMARY KEY,
  corpus_item TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  passed INTEGER NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000)
);
`;

describe('schema CRUD against in-memory SQLite', () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.exec(SETUP_SQL);
    db = drizzle(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('inserts and reads an installation', () => {
    const row: NewInstallation = {
      id: 'inst-1',
      githubInstallationId: 12345,
      accountLogin: 'octocat',
    };
    db.insert(installations).values(row).run();
    const found = db.select().from(installations).where(eq(installations.id, 'inst-1')).all();
    expect(found).toHaveLength(1);
    expect(found[0]?.accountLogin).toBe('octocat');
    expect(found[0]?.createdAt).toBeGreaterThan(0);
    expect(found[0]?.revokedAt).toBeNull();
  });

  it('enforces unique githubInstallationId', () => {
    db.insert(installations).values({ id: 'a', githubInstallationId: 1, accountLogin: 'x' }).run();
    expect(() =>
      db
        .insert(installations)
        .values({ id: 'b', githubInstallationId: 1, accountLogin: 'y' })
        .run(),
    ).toThrow();
  });

  it('inserts a job referencing an installation, then a job_event', () => {
    db.insert(installations)
      .values({ id: 'inst-1', githubInstallationId: 1, accountLogin: 'octocat' })
      .run();
    const job: NewJob = {
      id: 'job-1',
      installationId: 'inst-1',
      repoFullName: 'octocat/hello',
      plan: 'small',
      state: 'queued',
      traceId: 'trace-1',
    };
    db.insert(jobs).values(job).run();

    const event: NewJobEvent = {
      id: 'evt-1',
      jobId: 'job-1',
      fromState: 'queued',
      toState: 'analyzing',
      reason: 'worker started',
    };
    db.insert(jobEvents).values(event).run();

    const events = db.select().from(jobEvents).all();
    expect(events).toHaveLength(1);
    expect(events[0]?.fromState).toBe('queued');
    expect(events[0]?.toState).toBe('analyzing');
  });

  it('rejects job with FK to missing installation', () => {
    const sqliteFk = new Database(':memory:');
    sqliteFk.pragma('foreign_keys = ON');
    sqliteFk.exec(SETUP_SQL);
    const dbFk = drizzle(sqliteFk);
    expect(() =>
      dbFk
        .insert(jobs)
        .values({
          id: 'job-x',
          installationId: 'missing',
          repoFullName: 'a/b',
          plan: 'small',
          state: 'queued',
          traceId: 'trace-x',
        })
        .run(),
    ).toThrow();
    sqliteFk.close();
  });

  it('round-trips a customer with optional stripe id', () => {
    db.insert(customers).values({ id: 'c-1', email: 'a@b.com' }).run();
    db.insert(customers).values({ id: 'c-2', email: 'c@d.com', stripeCustomerId: 'cus_xxx' }).run();
    const all = db.select().from(customers).all();
    expect(all).toHaveLength(2);
    const stripeIds = all.map((r) => r.stripeCustomerId);
    expect(stripeIds).toContain(null);
    expect(stripeIds).toContain('cus_xxx');
  });
});
