import {
  type AnyDbClient,
  createD1Client,
  createJob,
  installations,
  loadOrder,
  markOrderExpired,
  markOrderPaid,
  markOrderRefunded,
  orders,
} from '@migrate-bot/db';
import type { JobQueueMessage, QueueProducer } from '@migrate-bot/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type Stripe from 'stripe';
import { isEeaUkCh } from '../eea-countries';
import { createResendClient, type EmailClient } from '../email';
import { notifyEeaRejection, notifyPaymentReceived } from '../notifications';
import { type CloudflareQueue, wrapCloudflareQueue } from '../queue';
import { createStripeClient, type StripeClient } from '../stripe';

// Stripe webhook 受信ハンドラ。
//
// 扱う event:
//   - checkout.session.completed → 注文を paid に進め、job を作成し queue に流す
//   - charge.refunded            → 注文を refunded に進める (job 状態は別経路で更新)
//   - checkout.session.expired   → 注文を expired に進める
//
// idempotency:
//   - DB 層 (markOrderPaid 等) が state 遷移を idempotent にする
//   - 同じ Stripe event を 2 回受け取っても二重 job 作成にならないよう、
//     paid 済 order は再度 job を作らない (alreadyHandled でガード)

export interface StripeWebhookEnv {
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly DB?: D1Database;
  readonly JOBS_QUEUE?: CloudflareQueue<JobQueueMessage>;
  readonly RESEND_API_KEY?: string;
  readonly EMAIL_FROM_ADDRESS?: string;
}

export interface StripeWebhookContext {
  Bindings: StripeWebhookEnv;
  Variables: {
    readonly db?: AnyDbClient;
    readonly stripe?: StripeClient;
    readonly jobsQueue?: QueueProducer<JobQueueMessage>;
    readonly email?: EmailClient;
  };
}

function resolveDb(c: {
  var: StripeWebhookContext['Variables'];
  env: StripeWebhookEnv;
}): AnyDbClient | null {
  if (c.var.db) return c.var.db;
  if (c.env.DB) return createD1Client(c.env.DB);
  return null;
}

function resolveStripe(c: {
  var: StripeWebhookContext['Variables'];
  env: StripeWebhookEnv;
}): StripeClient {
  if (c.var.stripe) return c.var.stripe;
  return createStripeClient({
    secretKey: c.env.STRIPE_SECRET_KEY,
    webhookSecret: c.env.STRIPE_WEBHOOK_SECRET,
  });
}

function resolveQueue(c: {
  var: StripeWebhookContext['Variables'];
  env: StripeWebhookEnv;
}): QueueProducer<JobQueueMessage> | null {
  if (c.var.jobsQueue) return c.var.jobsQueue;
  if (c.env.JOBS_QUEUE) return wrapCloudflareQueue(c.env.JOBS_QUEUE);
  return null;
}

function resolveEmail(c: {
  var: StripeWebhookContext['Variables'];
  env: StripeWebhookEnv;
}): EmailClient | null {
  if (c.var.email) return c.var.email;
  if (!c.env.RESEND_API_KEY || !c.env.EMAIL_FROM_ADDRESS) return null;
  return createResendClient({
    apiKey: c.env.RESEND_API_KEY,
    fromAddress: c.env.EMAIL_FROM_ADDRESS,
  });
}

export function createStripeWebhookRouter(): Hono<StripeWebhookContext> {
  const app = new Hono<StripeWebhookContext>();

  app.post('/', async (c) => {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({ error: 'missing stripe-signature header' }, 400);
    }

    const rawBody = await c.req.text();
    const stripe = resolveStripe(c);

    let event: Stripe.Event;
    try {
      event = await stripe.verifyWebhookSignature(rawBody, signature);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `signature verification failed: ${msg}` }, 400);
    }

    const db = resolveDb(c);
    if (!db) return c.json({ error: 'DB binding unavailable' }, 503);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(c, db, event.data.object);
          break;
        case 'checkout.session.expired':
          await handleCheckoutExpired(db, event.data.object);
          break;
        case 'charge.refunded':
          await handleChargeRefunded(db, event.data.object);
          break;
        // 他の event は ack だけする (Stripe は不要な event を送ってくることがある)
      }
      return c.json({ ok: true, eventType: event.type });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // permanent failures (event payload が壊れている、DB row が無い等)
      // を 500 で返すと Stripe が 3 日間 retry し続け Sentry alert spam に
      // なるため、200 + 警告 log で固定する。
      // transient failures (DB 一時不能、Stripe API 不能) は 500 を返して
      // retry させたいため別経路。
      if (err instanceof PermanentWebhookError) {
        console.warn('stripe webhook permanent failure, ack with 200', {
          eventType: event.type,
          eventId: event.id,
          reason: msg,
        });
        return c.json({ ok: false, reason: msg, permanent: true });
      }
      console.error('stripe webhook transient failure, return 500 for retry', {
        eventType: event.type,
        eventId: event.id,
        error: msg,
      });
      return c.json({ error: msg }, 500);
    }
  });

  return app;
}

// permanent failures (Stripe retry してもまず再現しない、対応不能なエラー)
// と transient failures (Stripe retry すれば回復する見込み) を区別するための
// マーカ例外。throw 側は理由を message に詳述する。
class PermanentWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentWebhookError';
  }
}

async function handleCheckoutCompleted(
  c: { var: StripeWebhookContext['Variables']; env: StripeWebhookEnv },
  db: AnyDbClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const email = resolveEmail(c);
  const orderId = session.client_reference_id;
  if (!orderId) {
    throw new PermanentWebhookError(
      `checkout.session.completed without client_reference_id: ${session.id}`,
    );
  }
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  if (!paymentIntentId) {
    throw new PermanentWebhookError(
      `checkout.session.completed without payment_intent: ${session.id}`,
    );
  }

  const initialOrder = await loadOrder(db, orderId);
  if (!initialOrder) {
    throw new PermanentWebhookError(
      `order not found for client_reference_id: ${orderId}`,
    );
  }

  // markOrderPaid は idempotent。既に paid でも payment_intent_id を保存する。
  const paidResult = await markOrderPaid(db, {
    orderId,
    stripePaymentIntentId: paymentIntentId,
  });
  // 既に paid な場合は最新 state を再 load (refundedAt 等が必要)
  const order = paidResult.alreadyHandled
    ? ((await loadOrder(db, orderId)) ?? initialOrder)
    : initialOrder;

  // GDPR / UK GDPR / Swiss FADP 対策の 5 段目防御:
  // billing country が EEA / UK / Switzerland か、または欠落 (fail-closed)
  // なら ToS §2 違反のため job 作成せず即時 refund + 拒否通知。
  // Stripe Checkout は billing_address_collection: 'required' で
  // customer_details.address.country を必ず提供するはずだが、saved customer
  // / async payment 等で null になる edge case が報告されている。
  const billingCountry = session.customer_details?.address?.country ?? null;
  const shouldReject = isEeaUkCh(billingCountry) || billingCountry === null;
  if (shouldReject) {
    if (order.refundedAt !== null) {
      // 既に refunded 済 (Stripe webhook retry) → 何もしない
      return;
    }
    await rejectEeaUkChOrder(
      c,
      db,
      order,
      paymentIntentId,
      billingCountry ?? 'missing_billing_country',
    );
    return;
  }

  // 非 EEA path: 既に処理済ならここで早期 return (idempotent)
  if (paidResult.alreadyHandled) return;

  // 該当 installation を取得して GitHub integer ID を queue message に含める
  const instRows = await db
    .select()
    .from(installations)
    .where(eq(installations.id, order.installationId))
    .limit(1);
  const inst = instRows[0];
  if (!inst) {
    throw new PermanentWebhookError(`installation not found: ${order.installationId}`);
  }

  const { jobId, traceId } = await createJob(db, {
    installationId: order.installationId,
    repoFullName: order.repoFullName,
    plan: order.plan,
  });

  // order に jobId を後から関連付け (job が作成された後)
  await db.update(orders).set({ jobId }).where(eq(orders.id, orderId));

  const queue = resolveQueue(c);
  if (!queue) {
    throw new Error('JOBS_QUEUE binding unavailable');
  }
  await queue.send({
    jobId,
    installationId: inst.githubInstallationId,
    traceId,
  });

  // Notify customer that their migration job has started.
  if (email) {
    await notifyPaymentReceived(db, email, orderId);
  }
}

async function rejectEeaUkChOrder(
  c: { var: StripeWebhookContext['Variables']; env: StripeWebhookEnv },
  db: AnyDbClient,
  order: { readonly id: string; readonly amountUsdCents: number },
  paymentIntentId: string,
  countryCode: string,
): Promise<void> {
  const stripe = resolveStripe(c);
  // Stripe createRefund は idempotent ではないが、二度目の呼出は
  // "already refunded" のような error を返すので、そのケースを捕捉して
  // markOrderRefunded に進める (DB の refundedAt 設定が前回失敗していた等)
  try {
    await stripe.createRefund(paymentIntentId, order.amountUsdCents);
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (
      msg.includes('already refunded') ||
      msg.includes('charge_already_refunded') ||
      msg.includes('refund already issued')
    ) {
      console.warn('Stripe refund already issued for EEA reject, proceeding to mark refunded', {
        orderId: order.id,
        paymentIntentId,
      });
    } else {
      // transient or unknown error → throw → Stripe retry, retry でも refundedAt
      // 未設定なので再 enter で同じ流れに到達する
      throw err;
    }
  }
  await markOrderRefunded(db, order.id);

  const email = resolveEmail(c);
  if (email) {
    await notifyEeaRejection(db, email, order.id, countryCode);
  }
}

async function handleCheckoutExpired(
  db: AnyDbClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const orderId = session.client_reference_id;
  if (!orderId) return; // expired session for unknown order — ignore
  const existing = await loadOrder(db, orderId);
  if (!existing) return;
  await markOrderExpired(db, orderId);
}

async function handleChargeRefunded(
  db: AnyDbClient,
  charge: Stripe.Charge,
): Promise<void> {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : (charge.payment_intent?.id ?? null);
  if (!paymentIntentId) return;

  const orderRow = (
    await db
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, paymentIntentId))
      .limit(1)
  )[0];
  if (!orderRow) return;
  await markOrderRefunded(db, orderRow.id);
}
