import {
  type AnyDbClient,
  createD1Client,
  createOrder,
  upsertCustomerByEmail,
} from '@migrate-bot/db';
import { newOrderId } from '@migrate-bot/shared';
import { eq } from 'drizzle-orm';
import { installations } from '@migrate-bot/db';
import { Hono } from 'hono';
import { createStripeClient, PLAN_AMOUNT_USD_CENTS, type StripeClient } from '../stripe';

// Customer 向け Checkout 開始エンドポイント。
//
// flow:
//   1. 入力検証 (installationId / repoFullName / plan / customerEmail)
//   2. installations から GitHub installation を ID で引く (= 顧客が install 済か検証)
//   3. customers を email で upsert
//   4. orderId を pre-generate (Stripe session の client_reference_id に使う)
//   5. Stripe Checkout session を作成
//   6. orders 表に insert (state=pending)
//   7. session.url を返す
//
// 認証: Phase 3 PoC では bearer auth を要求しない (Phase 4 のダッシュボード化で
// session-based auth に置き換える)。

export interface CheckoutEnv {
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly CHECKOUT_SUCCESS_URL: string;
  readonly CHECKOUT_CANCEL_URL: string;
  readonly DB?: D1Database;
}

export interface CheckoutContext {
  Bindings: CheckoutEnv;
  Variables: {
    readonly db?: AnyDbClient;
    readonly stripe?: StripeClient;
  };
}

interface CreateSessionBody {
  readonly githubInstallationId: number;
  readonly repoFullName: string;
  readonly plan: 'small' | 'medium' | 'large';
  readonly customerEmail: string;
}

function isCreateSessionBody(v: unknown): v is CreateSessionBody {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.githubInstallationId === 'number' &&
    typeof o.repoFullName === 'string' &&
    (o.plan === 'small' || o.plan === 'medium' || o.plan === 'large') &&
    typeof o.customerEmail === 'string' &&
    o.customerEmail.includes('@')
  );
}

function resolveDb(c: { var: CheckoutContext['Variables']; env: CheckoutEnv }): AnyDbClient | null {
  if (c.var.db) return c.var.db;
  if (c.env.DB) return createD1Client(c.env.DB);
  return null;
}

function resolveStripe(c: {
  var: CheckoutContext['Variables'];
  env: CheckoutEnv;
}): StripeClient {
  if (c.var.stripe) return c.var.stripe;
  return createStripeClient({
    secretKey: c.env.STRIPE_SECRET_KEY,
    webhookSecret: c.env.STRIPE_WEBHOOK_SECRET,
  });
}

export function createCheckoutRouter(): Hono<CheckoutContext> {
  const app = new Hono<CheckoutContext>();

  app.post('/create-session', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid json' }, 400);
    }
    if (!isCreateSessionBody(body)) {
      return c.json({ error: 'invalid body shape' }, 400);
    }

    const db = resolveDb(c);
    if (!db) return c.json({ error: 'DB binding unavailable' }, 503);

    // installation lookup: github_installation_id -> internal UUID
    const instRows = await db
      .select()
      .from(installations)
      .where(eq(installations.githubInstallationId, body.githubInstallationId))
      .limit(1);
    const inst = instRows[0];
    if (!inst) {
      return c.json({ error: 'installation not found; install the GitHub App first' }, 404);
    }
    if (inst.revokedAt !== null) {
      return c.json({ error: 'installation has been revoked; reinstall the App' }, 409);
    }

    const customer = await upsertCustomerByEmail(db, { email: body.customerEmail });
    const orderId = newOrderId();
    const amountUsdCents = PLAN_AMOUNT_USD_CENTS[body.plan];

    const stripe = resolveStripe(c);
    const session = await stripe.createCheckoutSession({
      orderId,
      customerEmail: body.customerEmail,
      plan: body.plan,
      amountUsdCents,
      repoFullName: body.repoFullName,
      successUrl: c.env.CHECKOUT_SUCCESS_URL,
      cancelUrl: c.env.CHECKOUT_CANCEL_URL,
    });

    await createOrder(db, {
      orderId,
      customerId: customer.id,
      installationId: inst.id,
      repoFullName: body.repoFullName,
      plan: body.plan,
      amountUsdCents,
      stripeSessionId: session.sessionId,
    });

    return c.json({
      ok: true,
      orderId,
      checkoutUrl: session.url,
    });
  });

  return app;
}
