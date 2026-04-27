import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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

// drizzle-kit generate で生成された本番マイグレーションをそのままテストでも使う。
// 二重保守の解消、本番と同じ DDL で型・FK・制約を検証できる。
const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(
  resolve(here, '../../migrations/0000_initial.sql'),
  'utf-8',
);

describe('schema CRUD against in-memory SQLite (uses drizzle-kit migration SQL)', () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.exec(MIGRATION_SQL);
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
    sqliteFk.exec(MIGRATION_SQL);
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
