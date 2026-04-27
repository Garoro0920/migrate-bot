import { type AnyDbClient, createD1Client, createJob, upsertInstallation } from '@migrate-bot/db';
import type { JobQueueMessage, QueueProducer } from '@migrate-bot/shared';
import { Hono } from 'hono';
import { checkBearerAuth } from '../auth';
import { type CloudflareQueue, wrapCloudflareQueue } from '../queue';

// 開発・運用補助 API。本番では INTERNAL_API_TOKEN 認証必須、認証失敗時 401。
// admin-trigger CLI / 内部スクリプトから呼ばれる。

export interface AdminEnv {
  readonly INTERNAL_API_TOKEN: string;
  readonly DB?: D1Database;
  readonly JOBS_QUEUE?: CloudflareQueue<JobQueueMessage>;
}

export interface AdminContext {
  Bindings: AdminEnv;
  Variables: {
    readonly db?: AnyDbClient;
    readonly jobsQueue?: QueueProducer<JobQueueMessage>;
  };
}

interface TriggerBody {
  readonly githubInstallationId: number;
  readonly accountLogin: string;
  readonly repoFullName: string;
  readonly plan: 'small' | 'medium' | 'large' | 'enterprise';
}

function isTriggerBody(value: unknown): value is TriggerBody {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.githubInstallationId === 'number' &&
    typeof v.accountLogin === 'string' &&
    typeof v.repoFullName === 'string' &&
    (v.plan === 'small' || v.plan === 'medium' || v.plan === 'large' || v.plan === 'enterprise')
  );
}

export function createAdminRouter(): Hono<AdminContext> {
  const app = new Hono<AdminContext>();

  app.post('/trigger', async (c) => {
    const auth = c.req.header('authorization') ?? null;
    if (!checkBearerAuth(auth, c.env.INTERNAL_API_TOKEN)) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid json' }, 400);
    }
    if (!isTriggerBody(body)) {
      return c.json({ error: 'invalid body shape' }, 400);
    }

    const db = resolveDb(c);
    if (!db) return c.json({ error: 'DB binding unavailable' }, 503);
    const queue = resolveQueue(c);
    if (!queue) return c.json({ error: 'JOBS_QUEUE binding unavailable' }, 503);

    const inst = await upsertInstallation(db, {
      githubInstallationId: body.githubInstallationId,
      accountLogin: body.accountLogin,
    });

    const { jobId, traceId } = await createJob(db, {
      installationId: inst.id,
      repoFullName: body.repoFullName,
      plan: body.plan,
    });

    await queue.send({
      jobId,
      installationId: body.githubInstallationId,
      traceId,
    });

    return c.json({
      ok: true,
      jobId,
      traceId,
      installationId: inst.id,
      installation: { created: inst.created, githubId: body.githubInstallationId },
    });
  });

  return app;
}

function resolveDb(c: { var: AdminContext['Variables']; env: AdminEnv }): AnyDbClient | null {
  if (c.var.db) return c.var.db;
  if (c.env.DB) return createD1Client(c.env.DB);
  return null;
}

function resolveQueue(c: {
  var: AdminContext['Variables'];
  env: AdminEnv;
}): QueueProducer<JobQueueMessage> | null {
  if (c.var.jobsQueue) return c.var.jobsQueue;
  if (c.env.JOBS_QUEUE) return wrapCloudflareQueue(c.env.JOBS_QUEUE);
  return null;
}
