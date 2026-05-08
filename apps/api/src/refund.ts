import {
  type AnyDbClient,
  getOrderByJobId,
  markOrderRefunded,
  transitionJob,
} from '@migrate-bot/db';
import { newCustomerId } from '@migrate-bot/shared';
import { sql } from 'drizzle-orm';
import type { StripeClient } from './stripe';

// 課金統合 Phase 3 の返金処理。job が refunding 状態に遷移した後で呼ぶ。
//
// 流れ:
//   1. job に紐付く order を取得
//   2. order が paid + payment_intent あり → Stripe createRefund を呼ぶ
//   3. refunds 表に insert + order を refunded に進める
//   4. job を refunded (terminal) に遷移
//
// order がない (admin/trigger 経由の job) または既に refunded 済の場合は
// Stripe を叩かずに job を直接 refunded に進める (返金不要)。
//
// 例外発生時 (Stripe API 失敗等) は throw して caller が handle する。job は
// refunding のまま残るので後で manual retry できる。
//
// A13: Stripe API call が hang した場合に Workers の request 全体が無限に
// 待ち状態になるのを防ぐため、Stripe createRefund に timeout を被せる。
// 既定 30s。テスト時は ProcessRefundOptions で上書き可能。

export interface ProcessRefundResult {
  readonly skipped: boolean;
  readonly refunded: boolean;
  readonly stripeRefundId?: string;
}

export interface ProcessRefundOptions {
  readonly stripeTimeoutMs?: number;
}

const DEFAULT_STRIPE_TIMEOUT_MS = 30_000;

export class StripeRefundTimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Stripe createRefund timed out after ${timeoutMs}ms`);
    this.name = 'StripeRefundTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new StripeRefundTimeoutError(timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function processRefund(
  db: AnyDbClient,
  stripe: StripeClient,
  jobId: string,
  reason: string,
  options: ProcessRefundOptions = {},
): Promise<ProcessRefundResult> {
  const order = await getOrderByJobId(db, jobId);

  if (!order) {
    // admin/trigger 経由など、決済が紐付いていない job → 直接 refunded に進める
    await transitionJob(db, {
      jobId,
      toState: 'refunded',
      reason: 'no payment to refund',
    });
    return { skipped: true, refunded: false };
  }

  if (order.state === 'refunded') {
    // 既に refunded (例: 重複実行)。job も refunded に整合させる。
    await transitionJob(db, {
      jobId,
      toState: 'refunded',
      reason: 'order already refunded',
    });
    return { skipped: true, refunded: false };
  }

  if (order.state !== 'paid' || !order.stripePaymentIntentId) {
    // pending / failed / expired は決済未確定なので返金不要。
    await transitionJob(db, {
      jobId,
      toState: 'refunded',
      reason: `order state ${order.state}, no Stripe charge to refund`,
    });
    return { skipped: true, refunded: false };
  }

  // ここから Stripe を叩く (timeout 付き)
  const stripeTimeoutMs = options.stripeTimeoutMs ?? DEFAULT_STRIPE_TIMEOUT_MS;
  const refund = await withTimeout(
    stripe.createRefund(order.stripePaymentIntentId, order.amountUsdCents),
    stripeTimeoutMs,
  );

  // refunds 表に記録 (drizzle 経由で raw insert)
  await db.run(sql`
    INSERT INTO refunds (id, job_id, amount_usd, reason, stripe_refund_id, created_at)
    VALUES (
      ${newCustomerId()},
      ${jobId},
      ${order.amountUsdCents / 100},
      ${reason},
      ${refund.refundId},
      ${Date.now()}
    )
  `);

  await markOrderRefunded(db, order.id);

  await transitionJob(db, {
    jobId,
    toState: 'refunded',
    reason: `stripe refund processed (${refund.refundId})`,
  });

  return { skipped: false, refunded: true, stripeRefundId: refund.refundId };
}
