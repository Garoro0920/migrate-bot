import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createJob,
  createSqliteClient,
  installations,
  jobs,
  type SqliteClient,
  upsertInstallation,
} from '@migrate-bot/db';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInternalRouter, type InternalContext } from '../routes/internal';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(
  resolve(here, '../../../../packages/db/migrations/0000_initial.sql'),
  'utf-8',
);

const TOKEN = 'test-internal-token';

function buildApp(db: SqliteClient) {
  const app = new Hono<InternalContext>();
  app.use('*', async (c, next) => {
    c.set('db', db);
    await next();
  });
  app.route('/internal', createInternalRouter());
  return app;
}

async function seedJob(db: SqliteClient): Promise<string> {
  const inst = await upsertInstallation(db, { githubInstallationId: 1, accountLogin: 'a' });
  const { jobId } = await createJob(db, {
    installationId: inst.id,
    repoFullName: 'a/b',
    plan: 'small',
  });
  return jobId;
}

describe('internal router', () => {
  let sqlite: Database.Database;
  let db: SqliteClient;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(MIGRATION_SQL);
    db = createSqliteClient(sqlite);
    app = buildApp(db);
  });

  afterEach(() => {
    sqlite.close();
  });

  describe('GET /internal/jobs/:id', () => {
    it('rejects without bearer auth', async () => {
      const res = await app.request(
        '/internal/jobs/abc',
        { method: 'GET' },
        { INTERNAL_API_TOKEN: TOKEN },
      );
      expect(res.status).toBe(401);
    });

    it('returns the job for a valid id', async () => {
      const jobId = await seedJob(db);
      const res = await app.request(
        `/internal/jobs/${jobId}`,
        {
          method: 'GET',
          headers: { authorization: `Bearer ${TOKEN}` },
        },
        { INTERNAL_API_TOKEN: TOKEN },
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as { state: string; repoFullName: string };
      expect(json.state).toBe('queued');
      expect(json.repoFullName).toBe('a/b');
    });

    it('returns 404 for unknown id', async () => {
      const res = await app.request(
        '/internal/jobs/missing',
        { method: 'GET', headers: { authorization: `Bearer ${TOKEN}` } },
        { INTERNAL_API_TOKEN: TOKEN },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /internal/jobs/:id/transition', () => {
    it('updates state and writes job_event', async () => {
      const jobId = await seedJob(db);
      const res = await app.request(
        `/internal/jobs/${jobId}/transition`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${TOKEN}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ toState: 'analyzing', reason: 'runner started' }),
        },
        { INTERNAL_API_TOKEN: TOKEN },
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean; from: string; to: string };
      expect(json).toEqual({ ok: true, from: 'queued', to: 'analyzing' });

      // verify db state
      const rows = await db.select().from(jobs).where(eq(jobs.id, jobId));
      expect(rows[0]?.state).toBe('analyzing');
    });

    it('returns 409 on invalid transition', async () => {
      const jobId = await seedJob(db);
      const res = await app.request(
        `/internal/jobs/${jobId}/transition`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${TOKEN}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ toState: 'pr_ready', reason: 'skip' }),
        },
        { INTERNAL_API_TOKEN: TOKEN },
      );
      expect(res.status).toBe(409);
    });

    it('returns 404 for unknown job id', async () => {
      const res = await app.request(
        '/internal/jobs/missing/transition',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${TOKEN}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ toState: 'analyzing', reason: 'x' }),
        },
        { INTERNAL_API_TOKEN: TOKEN },
      );
      expect(res.status).toBe(404);
    });

    it('returns 400 on invalid body shape', async () => {
      const jobId = await seedJob(db);
      const res = await app.request(
        `/internal/jobs/${jobId}/transition`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${TOKEN}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ toState: 'not-a-state', reason: 'x' }),
        },
        { INTERNAL_API_TOKEN: TOKEN },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('POST /internal/jobs/:id/usage', () => {
    it('accumulates tokens and cost', async () => {
      const jobId = await seedJob(db);

      const fire = (delta: { tokensInput: number; tokensOutput: number; costUsd: number }) =>
        app.request(
          `/internal/jobs/${jobId}/usage`,
          {
            method: 'POST',
            headers: {
              authorization: `Bearer ${TOKEN}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify(delta),
          },
          { INTERNAL_API_TOKEN: TOKEN },
        );

      const r1 = await fire({ tokensInput: 100, tokensOutput: 50, costUsd: 0.01 });
      const r2 = await fire({ tokensInput: 200, tokensOutput: 100, costUsd: 0.02 });
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);

      const rows = await db.select().from(jobs).where(eq(jobs.id, jobId));
      expect(rows[0]?.tokensInput).toBe(300);
      expect(rows[0]?.tokensOutput).toBe(150);
      expect(rows[0]?.costUsd).toBeCloseTo(0.03);
    });

    it('returns 404 for unknown job id', async () => {
      const res = await app.request(
        '/internal/jobs/missing/usage',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${TOKEN}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ tokensInput: 1, tokensOutput: 1, costUsd: 0.001 }),
        },
        { INTERNAL_API_TOKEN: TOKEN },
      );
      expect(res.status).toBe(404);
    });

    it('returns 400 on invalid body shape', async () => {
      const jobId = await seedJob(db);
      const res = await app.request(
        `/internal/jobs/${jobId}/usage`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${TOKEN}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ tokensInput: 'not-a-number' }),
        },
        { INTERNAL_API_TOKEN: TOKEN },
      );
      expect(res.status).toBe(400);
    });
  });
});

// keep installations import to avoid unused warning (referenced for future tests)
void installations;
