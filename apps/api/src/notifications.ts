import { type AnyDbClient, customers, getOrderByJobId, loadJob, loadOrder } from '@migrate-bot/db';
import { eq } from 'drizzle-orm';
import {
  type EmailClient,
  eeaRejectionEmail,
  paymentReceivedEmail,
  prReadyEmail,
  ResendError,
  refundedEmail,
} from './email';

// 通知ヘルパー。各 trigger は (db, email, id) を受け取り、customer を引き、
// テンプレを組み立てて送る。送信失敗は throw せず log のみ — メール送信失敗で
// state machine が止まらないように。
//
// ただし「永続的失敗 (4xx: 不正アドレス・auth NG・RLS 違反)」と「一時的失敗
// (5xx: Resend 障害)」は性質が違うので、log で区別する。
//   - 4xx 'EMAIL_PERMANENT_FAILURE' → operator が顧客アドレス再確認すべき
//   - 5xx 'EMAIL_TRANSIENT_FAILURE' → Resend 復旧待ち、頻発したら incident
// それ以外 (network 例外等) は 'EMAIL_UNKNOWN_FAILURE'。

async function lookupCustomerEmail(db: AnyDbClient, customerId: string): Promise<string | null> {
  const rows = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  return rows[0]?.email ?? null;
}

function classifyEmailFailure(err: unknown): {
  alert: 'EMAIL_PERMANENT_FAILURE' | 'EMAIL_TRANSIENT_FAILURE' | 'EMAIL_UNKNOWN_FAILURE';
  status?: number;
} {
  if (err instanceof ResendError) {
    if (err.status >= 400 && err.status < 500) {
      return { alert: 'EMAIL_PERMANENT_FAILURE', status: err.status };
    }
    if (err.status >= 500) {
      return { alert: 'EMAIL_TRANSIENT_FAILURE', status: err.status };
    }
  }
  return { alert: 'EMAIL_UNKNOWN_FAILURE' };
}

function logEmailFailure(scope: string, context: Record<string, unknown>, err: unknown): void {
  const classification = classifyEmailFailure(err);
  console.error(`${scope} failed`, {
    ...context,
    ...classification,
    error: err instanceof Error ? err.message : String(err),
  });
}

export async function notifyPaymentReceived(
  db: AnyDbClient,
  email: EmailClient,
  orderId: string,
): Promise<void> {
  try {
    const order = await loadOrder(db, orderId);
    if (!order) return;
    const to = await lookupCustomerEmail(db, order.customerId);
    if (!to) return;
    const tpl = paymentReceivedEmail({ repoFullName: order.repoFullName, plan: order.plan });
    await email.send({ ...tpl, to });
  } catch (err) {
    logEmailFailure('notifyPaymentReceived', { orderId }, err);
  }
}

export async function notifyPrReady(
  db: AnyDbClient,
  email: EmailClient,
  jobId: string,
): Promise<void> {
  try {
    const job = await loadJob(db, jobId);
    if (!job?.prUrl) return;
    const order = await getOrderByJobId(db, jobId);
    if (!order) return; // admin/trigger path: no notification
    const to = await lookupCustomerEmail(db, order.customerId);
    if (!to) return;
    const tpl = prReadyEmail({ repoFullName: job.repoFullName, prUrl: job.prUrl });
    await email.send({ ...tpl, to });
  } catch (err) {
    logEmailFailure('notifyPrReady', { jobId }, err);
  }
}

export async function notifyEeaRejection(
  db: AnyDbClient,
  email: EmailClient,
  orderId: string,
  countryCode: string,
): Promise<void> {
  try {
    const order = await loadOrder(db, orderId);
    if (!order) return;
    const to = await lookupCustomerEmail(db, order.customerId);
    if (!to) return;
    const tpl = eeaRejectionEmail({
      repoFullName: order.repoFullName,
      amountUsdCents: order.amountUsdCents,
      countryCode,
    });
    await email.send({ ...tpl, to });
  } catch (err) {
    logEmailFailure('notifyEeaRejection', { orderId }, err);
  }
}

export async function notifyRefunded(
  db: AnyDbClient,
  email: EmailClient,
  jobId: string,
  reason: string,
): Promise<void> {
  try {
    const order = await getOrderByJobId(db, jobId);
    if (!order) return;
    const to = await lookupCustomerEmail(db, order.customerId);
    if (!to) return;
    const tpl = refundedEmail({
      repoFullName: order.repoFullName,
      reason,
      amountUsdCents: order.amountUsdCents,
    });
    await email.send({ ...tpl, to });
  } catch (err) {
    logEmailFailure('notifyRefunded', { jobId }, err);
  }
}
