import { type AnyDbClient, customers, getOrderByJobId, loadJob, loadOrder, orders } from '@migrate-bot/db';
import { eq } from 'drizzle-orm';
import {
  eeaRejectionEmail,
  type EmailClient,
  paymentReceivedEmail,
  prReadyEmail,
  refundedEmail,
} from './email';

// 通知ヘルパー。各 trigger は (db, email, id) を受け取り、customer を引き、
// テンプレを組み立てて送る。送信失敗は throw せず log のみ — メール送信失敗で
// state machine が止まらないように。

async function lookupCustomerEmail(
  db: AnyDbClient,
  customerId: string,
): Promise<string | null> {
  const rows = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  return rows[0]?.email ?? null;
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
    console.error('notifyPaymentReceived failed', { orderId, error: err });
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
    console.error('notifyPrReady failed', { jobId, error: err });
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
    console.error('notifyEeaRejection failed', { orderId, error: err });
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
    console.error('notifyRefunded failed', { jobId, error: err });
  }
}

// orders は import 時に副作用なし (re-export 用に確保) — drizzle table 参照を保持
export { orders };
