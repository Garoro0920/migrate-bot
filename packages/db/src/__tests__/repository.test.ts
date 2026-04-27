import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSqliteClient, type SqliteClient } from '../client';
import {
  createJob,
  loadJob,
  markInstallationRevoked,
  recordJobUsage,
  transitionJob,
  upsertInstallation,
} from '../repository';
import { installations, jobEvents } from '../schema';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(resolve(here, '../../migrations/0000_initial.sql'), 'utf-8');

describe('repository functions', () => {
  let sqlite: Database.Database;
  let db: SqliteClient;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(MIGRATION_SQL);
    db = createSqliteClient(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  describe('upsertInstallation', () => {
    it('creates a new installation with a generated UUID id', async () => {
      const result = await upsertInstallation(db, {
        githubInstallationId: 12345,
        accountLogin: 'octocat',
      });
      expect(result.created).toBe(true);
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
      const rows = await db
        .select()
        .from(installations)
        .where(eq(installations.id, result.id))
        .limit(1);
      expect(rows[0]?.accountLogin).toBe('octocat');
    });

    it('returns existing installation on second call (no duplicate)', async () => {
      const a = await upsertInstallation(db, { githubInstallationId: 1, accountLogin: 'x' });
      const b = await upsertInstallation(db, { githubInstallationId: 1, accountLogin: 'x' });
      expect(b.created).toBe(false);
      expect(b.id).toBe(a.id);
    });

    it('updates accountLogin on rename', async () => {
      const a = await upsertInstallation(db, { githubInstallationId: 1, accountLogin: 'old' });
      await upsertInstallation(db, { githubInstallationId: 1, accountLogin: 'new' });
      const row = (
        await db.select().from(installations).where(eq(installations.id, a.id)).limit(1)
      )[0];
      expect(row?.accountLogin).toBe('new');
    });

    it('clears revokedAt on re-install', async () => {
      const a = await upsertInstallation(db, { githubInstallationId: 1, accountLogin: 'a' });
      await markInstallationRevoked(db, 1);
      const before = (
        await db.select().from(installations).where(eq(installations.id, a.id)).limit(1)
      )[0];
      expect(before?.revokedAt).not.toBeNull();
      await upsertInstallation(db, { githubInstallationId: 1, accountLogin: 'a' });
      const after = (
        await db.select().from(installations).where(eq(installations.id, a.id)).limit(1)
      )[0];
      expect(after?.revokedAt).toBeNull();
    });
  });

  describe('createJob + loadJob', () => {
    it('creates a queued job linked to an installation', async () => {
      const inst = await upsertInstallation(db, { githubInstallationId: 1, accountLogin: 'a' });
      const { jobId, traceId } = await createJob(db, {
        installationId: inst.id,
        repoFullName: 'a/b',
        plan: 'small',
      });
      expect(jobId).toMatch(/^[0-9a-f-]{36}$/);
      expect(traceId).toMatch(/^[0-9a-f-]{36}$/);
      const job = await loadJob(db, jobId);
      expect(job?.state).toBe('queued');
      expect(job?.repoFullName).toBe('a/b');
      expect(job?.plan).toBe('small');
    });

    it('loadJob returns null for unknown id', async () => {
      const found = await loadJob(db, 'nope');
      expect(found).toBeNull();
    });
  });

  describe('transitionJob', () => {
    async function seedJob() {
      const inst = await upsertInstallation(db, { githubInstallationId: 1, accountLogin: 'a' });
      const { jobId } = await createJob(db, {
        installationId: inst.id,
        repoFullName: 'a/b',
        plan: 'small',
      });
      return jobId;
    }

    it('updates state and writes a job_events row', async () => {
      const jobId = await seedJob();
      const r = await transitionJob(db, { jobId, toState: 'analyzing', reason: 'start' });
      expect(r).toEqual({ from: 'queued', to: 'analyzing' });
      const after = await loadJob(db, jobId);
      expect(after?.state).toBe('analyzing');
      const events = await db.select().from(jobEvents).where(eq(jobEvents.jobId, jobId));
      expect(events).toHaveLength(1);
      expect(events[0]?.fromState).toBe('queued');
      expect(events[0]?.toState).toBe('analyzing');
      expect(events[0]?.reason).toBe('start');
    });

    it('sets startedAt on first transition into analyzing', async () => {
      const jobId = await seedJob();
      await transitionJob(db, { jobId, toState: 'analyzing', reason: 'go' });
      const after = await loadJob(db, jobId);
      expect(after?.startedAt).toBeGreaterThan(0);
    });

    it('sets completedAt on transition into terminal pr_ready', async () => {
      const jobId = await seedJob();
      await transitionJob(db, { jobId, toState: 'analyzing', reason: 'a' });
      await transitionJob(db, { jobId, toState: 'planning', reason: 'b' });
      await transitionJob(db, { jobId, toState: 'migrating', reason: 'c' });
      await transitionJob(db, { jobId, toState: 'verifying', reason: 'd' });
      await transitionJob(db, { jobId, toState: 'pr_ready', reason: 'done' });
      const after = await loadJob(db, jobId);
      expect(after?.completedAt).toBeGreaterThan(0);
    });

    it('rejects invalid transitions', async () => {
      const jobId = await seedJob();
      await expect(
        transitionJob(db, { jobId, toState: 'pr_ready', reason: 'skip' }),
      ).rejects.toThrow(/invalid job state transition/);
    });

    it('throws on unknown job id', async () => {
      await expect(
        transitionJob(db, { jobId: 'nope', toState: 'analyzing', reason: 'x' }),
      ).rejects.toThrow(/job not found/);
    });
  });

  describe('recordJobUsage', () => {
    it('accumulates tokens and cost', async () => {
      const inst = await upsertInstallation(db, { githubInstallationId: 1, accountLogin: 'a' });
      const { jobId } = await createJob(db, {
        installationId: inst.id,
        repoFullName: 'a/b',
        plan: 'small',
      });
      await recordJobUsage(db, jobId, { tokensInput: 100, tokensOutput: 50, costUsd: 0.01 });
      await recordJobUsage(db, jobId, { tokensInput: 200, tokensOutput: 100, costUsd: 0.02 });
      const job = await loadJob(db, jobId);
      expect(job?.tokensInput).toBe(300);
      expect(job?.tokensOutput).toBe(150);
      expect(job?.costUsd).toBeCloseTo(0.03);
    });
  });
});
