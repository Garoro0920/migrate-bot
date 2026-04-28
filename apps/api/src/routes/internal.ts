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
import { createResendClient, type EmailClient } from '../email';
import { notifyPrReady, notifyRefunded } from '../notifications';
import { processRefund } from '../refund';
import { createStripeClient, type StripeClient } from '../stripe';

// runner (Fly.io Machine) から呼ばれる internal API。
// Bearer auth (INTERNAL_API_TOKEN) で apps/runner と shared secret 認証。
//
// runner は Workers binding を直接使えないので、ここを HTTP 経由で叩いて
// D1 を読み書きする。

export interface InternalEnv {
  readonly INTERNAL_API_TOKEN: string;
  readonly DB?: D1Database;
  // Stripe key は refund 経路でのみ必要。テストでは stripe variable に DI する。
  readonly STRIPE_SECRET_KEY?: string;
  readonly STRIPE_WEBHOOK_SECRET?: string;
  readonly RESEND_API_KEY?: string;
  readonly EMAIL_FROM_ADDRESS?: string;
}

export interface InternalContext {
  Bindings: InternalEnv;
  Variables: {
    readonly db?: AnyDbClient;
    readonly stripe?: StripeClient;
    readonly email?: EmailClient;
  };
}

interface TransitionBody {
  readonly toState: JobState;
  readonly reason: string;
  readonly prUrl?: string;
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
  if (!isJobState(o.toState)) return false;
  if (typeof o.reason !== 'string') return false;
  if (o.prUrl !== undefined && typeof o.prUrl !== 'string') return false;
  return true;
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
        ...(body.prUrl !== undefined ? { prUrl: body.prUrl } : {}),
      });

      // 課金済 job が refunding に入った直後に Stripe 返金を試みる。
      // 失敗した場合は job を refunding のまま残し、ログのみ。手動 retry できる。
      if (body.toState === 'refunding') {
        const stripe = resolveStripe(c);
        if (stripe) {
          try {
            await processRefund(db, stripe, jobId, body.reason);
            // refund 成功時に refunded メールを送信 (refunded 状態に進んでいる)
            const email = resolveEmail(c);
            if (email) {
              await notifyRefunded(db, email, jobId, body.reason);
            }
          } catch (err) {
            console.error('refund failed', { jobId, error: err });
          }
        }
      }

      // 顧客に PR 準備完了を通知
      if (body.toState === 'pr_ready') {
        const email = resolveEmail(c);
        if (email) {
          await notifyPrReady(db, email, jobId);
        }
      }

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

function resolveStripe(c: {
  var: InternalContext['Variables'];
  env: InternalEnv;
}): StripeClient | null {
  if (c.var.stripe) return c.var.stripe;
  if (c.env.STRIPE_SECRET_KEY === undefined || c.env.STRIPE_WEBHOOK_SECRET === undefined) {
    return null;
  }
  return createStripeClient({
    secretKey: c.env.STRIPE_SECRET_KEY,
    webhookSecret: c.env.STRIPE_WEBHOOK_SECRET,
  });
}

function resolveEmail(c: {
  var: InternalContext['Variables'];
  env: InternalEnv;
}): EmailClient | null {
  if (c.var.email) return c.var.email;
  if (!c.env.RESEND_API_KEY || !c.env.EMAIL_FROM_ADDRESS) return null;
  return createResendClient({
    apiKey: c.env.RESEND_API_KEY,
    fromAddress: c.env.EMAIL_FROM_ADDRESS,
  });
}
