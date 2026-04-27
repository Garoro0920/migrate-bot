import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSqliteClient, installations, jobs, type SqliteClient } from '@migrate-bot/db';
import { InMemoryQueue, type JobQueueMessage } from '@migrate-bot/shared';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type AdminContext, createAdminRouter } from '../routes/admin';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(
  resolve(here, '../../../../packages/db/migrations/0000_initial.sql'),
  'utf-8',
);

const TOKEN = 'test-internal-token';

function buildApp(db: SqliteClient, queue: InMemoryQueue<JobQueueMessage>) {
  const app = new Hono<AdminContext>();
  app.use('*', async (c, next) => {
    c.set('db', db);
    c.set('jobsQueue', queue);
    await next();
  });
  app.route('/admin', createAdminRouter());
  return app;
}

describe('admin router', () => {
  let sqlite: Database.Database;
  let db: SqliteClient;
  let queue: InMemoryQueue<JobQueueMessage>;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(MIGRATION_SQL);
    db = createSqliteClient(sqlite);
    queue = new InMemoryQueue<JobQueueMessage>();
    app = buildApp(db, queue);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('POST /admin/trigger rejects without bearer auth', async () => {
    const res = await app.request(
      '/admin/trigger',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          githubInstallationId: 1,
          accountLogin: 'a',
          repoFullName: 'a/b',
          plan: 'small',
        }),
      },
      { INTERNAL_API_TOKEN: TOKEN },
    );
    expect(res.status).toBe(401);
  });

  it('POST /admin/trigger rejects mismatched token', async () => {
    const res = await app.request(
      '/admin/trigger',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer wrong',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          githubInstallationId: 1,
          accountLogin: 'a',
          repoFullName: 'a/b',
          plan: 'small',
        }),
      },
      { INTERNAL_API_TOKEN: TOKEN },
    );
    expect(res.status).toBe(401);
  });

  it('POST /admin/trigger rejects malformed body', async () => {
    const res = await app.request(
      '/admin/trigger',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ githubInstallationId: 'not-a-number' }),
      },
      { INTERNAL_API_TOKEN: TOKEN },
    );
    expect(res.status).toBe(400);
  });

  it('POST /admin/trigger creates job + enqueues message', async () => {
    const res = await app.request(
      '/admin/trigger',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          githubInstallationId: 12345,
          accountLogin: 'octocat',
          repoFullName: 'octocat/hello',
          plan: 'medium',
        }),
      },
      { INTERNAL_API_TOKEN: TOKEN },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; jobId: string; traceId: string };
    expect(json.ok).toBe(true);
    expect(json.jobId).toMatch(/^[0-9a-f-]{36}$/);

    // installation persisted
    const insts = await db
      .select()
      .from(installations)
      .where(eq(installations.githubInstallationId, 12345));
    expect(insts).toHaveLength(1);

    // job persisted
    const jobsRow = await db.select().from(jobs).where(eq(jobs.id, json.jobId));
    expect(jobsRow[0]?.repoFullName).toBe('octocat/hello');
    expect(jobsRow[0]?.plan).toBe('medium');
    expect(jobsRow[0]?.state).toBe('queued');

    // queue received exactly 1 message
    const messages = queue.drain();
    expect(messages).toHaveLength(1);
    expect(messages[0]?.body.jobId).toBe(json.jobId);
    expect(messages[0]?.body.installationId).toBe(12345);
  });

  it('POST /admin/trigger reuses existing installation on second call', async () => {
    const fire = () =>
      app.request(
        '/admin/trigger',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${TOKEN}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            githubInstallationId: 99,
            accountLogin: 'octocat',
            repoFullName: 'a/b',
            plan: 'small',
          }),
        },
        { INTERNAL_API_TOKEN: TOKEN },
      );

    await fire();
    await fire();

    const insts = await db.select().from(installations);
    expect(insts).toHaveLength(1);
    const jobsAll = await db.select().from(jobs);
    expect(jobsAll).toHaveLength(2);
    expect(queue.size()).toBe(2);
  });
});
