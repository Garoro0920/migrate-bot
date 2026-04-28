import {
  type AnyDbClient,
  createD1Client,
  installations,
  loadJob,
  recordJobUsage,
  transitionJob,
} from '@migrate-bot/db';
import { JOB_STATES, type JobState } from '@migrate-bot/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { checkBearerAuth } from '../auth';

// runner (Fly.io Machine) から呼ばれる internal API。
// Bearer auth (INTERNAL_API_TOKEN) で apps/runner と shared secret 認証。
//
// runner は Workers binding を直接使えないので、ここを HTTP 経由で叩いて
// D1 を読み書きする。

export interface InternalEnv {
  readonly INTERNAL_API_TOKEN: string;
  readonly DB?: D1Database;
}

export interface InternalContext {
  Bindings: InternalEnv;
  Variables: {
    readonly db?: AnyDbClient;
  };
}

interface TransitionBody {
  readonly toState: JobState;
  readonly reason: string;
}

interface UsageBody {
  readonly tokensInput: number;
  readonly tokensOutput: number;
  readonly costUsd: number;
}

function isJobState(v: unknown): v is JobState {
  return typeof v === 'string' && (JOB_STATES as readonly string[]).includes(v);
}

function isTransitionBody(v: unknown): v is TransitionBody {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return isJobState(o.toState) && typeof o.reason === 'string';
}

function isUsageBody(v: unknown): v is UsageBody {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.tokensInput === 'number' &&
    typeof o.tokensOutput === 'number' &&
    typeof o.costUsd === 'number'
  );
}

export function createInternalRouter(): Hono<InternalContext> {
  const app = new Hono<InternalContext>();

  app.use('*', async (c, next) => {
    const auth = c.req.header('authorization') ?? null;
    if (!checkBearerAuth(auth, c.env.INTERNAL_API_TOKEN)) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    await next();
  });

  app.get('/jobs/:id', async (c) => {
    const db = resolveDb(c);
    if (!db) return c.json({ error: 'DB binding unavailable' }, 503);
    const job = await loadJob(db, c.req.param('id'));
    if (!job) return c.json({ error: 'not found' }, 404);
    // runner needs the GitHub installation id (integer) to authenticate via Octokit;
    // jobs.installation_id is the internal UUID FK, so join installations here.
    const instRows = await db
      .select()
      .from(installations)
      .where(eq(installations.id, job.installationId))
      .limit(1);
    const githubInstallationId = instRows[0]?.githubInstallationId ?? null;
    return c.json({ ...job, githubInstallationId });
  });

  app.post('/jobs/:id/transition', async (c) => {
    const db = resolveDb(c);
    if (!db) return c.json({ error: 'DB binding unavailable' }, 503);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid json' }, 400);
    }
    if (!isTransitionBody(body)) {
      return c.json({ error: 'invalid body shape' }, 400);
    }
    const jobId = c.req.param('id');
    try {
      const result = await transitionJob(db, {
        jobId,
        toState: body.toState,
        reason: body.reason,
      });
      return c.json({ ok: true, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found')) return c.json({ error: msg }, 404);
      if (msg.includes('invalid')) return c.json({ error: msg }, 409);
      return c.json({ error: msg }, 500);
    }
  });

  app.post('/jobs/:id/usage', async (c) => {
    const db = resolveDb(c);
    if (!db) return c.json({ error: 'DB binding unavailable' }, 503);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid json' }, 400);
    }
    if (!isUsageBody(body)) {
      return c.json({ error: 'invalid body shape' }, 400);
    }
    const jobId = c.req.param('id');
    try {
      await recordJobUsage(db, jobId, body);
      return c.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found')) return c.json({ error: msg }, 404);
      return c.json({ error: msg }, 500);
    }
  });

  return app;
}

function resolveDb(c: { var: InternalContext['Variables']; env: InternalEnv }): AnyDbClient | null {
  if (c.var.db) return c.var.db;
  if (c.env.DB) return createD1Client(c.env.DB);
  return null;
}
