// Resend HTTP API thin wrapper。Workers 互換のため fetch ベースで書く。
//
// Phase 3 では 3 種類のメールを送る:
//   - paymentReceived: 課金完了 → migration 開始
//   - prReady: PR が draft で作成された
//   - refunded: 失敗 → 返金完了
//
// テンプレートは plain text + HTML 両方持つ (一部メールクライアントが HTML 不可)。

const RESEND_API_BASE = 'https://api.resend.com';

export interface SendEmailInput {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface EmailClient {
  send(input: SendEmailInput): Promise<{ id: string }>;
}

export interface ResendOptions {
  readonly apiKey: string;
  readonly fromAddress: string;
  readonly fetch?: typeof fetch;
}

export class ResendError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string) {
    super(`Resend API ${status}: ${body.slice(0, 200)}`);
    this.name = 'ResendError';
    this.status = status;
    this.body = body;
  }
}

export function createResendClient(opts: ResendOptions): EmailClient {
  const fetchFn = opts.fetch ?? fetch;
  return {
    async send(input) {
      const res = await fetchFn(`${RESEND_API_BASE}/emails`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${opts.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: opts.fromAddress,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new ResendError(res.status, body);
      }
      const json = (await res.json()) as { id: string };
      return { id: json.id };
    },
  };
}

// ─── Templates ──────────────────────────────────────────────────────────────

export interface PaymentReceivedData {
  readonly repoFullName: string;
  readonly plan: 'small' | 'medium' | 'large' | 'enterprise';
}

export interface PrReadyData {
  readonly repoFullName: string;
  readonly prUrl: string;
}

export interface RefundedData {
  readonly repoFullName: string;
  readonly reason: string;
  readonly amountUsdCents: number;
}

export function paymentReceivedEmail(data: PaymentReceivedData): SendEmailInput {
  const subject = `migrate-bot: starting ${data.plan} migration for ${data.repoFullName}`;
  const text = [
    `Thanks — payment received for ${data.repoFullName} (${data.plan} plan).`,
    '',
    'We are now analyzing your repository and will open a draft pull request',
    'when the migration is ready. You will receive another email at that point.',
    '',
    'No further action needed from you right now.',
    '',
    '— migrate-bot',
  ].join('\n');
  return {
    to: '', // caller sets this
    subject,
    text,
    html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
  };
}

export function prReadyEmail(data: PrReadyData): SendEmailInput {
  const subject = `migrate-bot: PR ready for ${data.repoFullName}`;
  const text = [
    `Your migration PR for ${data.repoFullName} is ready for review:`,
    '',
    data.prUrl,
    '',
    'The PR is in draft so CI can run before you decide to merge. Once CI is',
    'green, please review and either mark ready for review or merge directly.',
    '',
    'If you find issues with the migration, reply to this email and we will',
    'investigate.',
    '',
    '— migrate-bot',
  ].join('\n');
  return {
    to: '',
    subject,
    text,
    html: `<p>Your migration PR for <code>${data.repoFullName}</code> is ready:</p><p><a href="${data.prUrl}">${data.prUrl}</a></p><p>The PR is in draft so CI can run before you decide to merge.</p>`,
  };
}

export function refundedEmail(data: RefundedData): SendEmailInput {
  const dollars = (data.amountUsdCents / 100).toFixed(2);
  const subject = `migrate-bot: refund issued for ${data.repoFullName}`;
  const text = [
    `We were unable to complete the migration for ${data.repoFullName}.`,
    '',
    `A full refund of $${dollars} has been processed back to your card.`,
    '',
    `Reason: ${data.reason}`,
    '',
    'No further action needed from you. The refund typically clears in 5-10',
    'business days depending on your card issuer.',
    '',
    '— migrate-bot',
  ].join('\n');
  return {
    to: '',
    subject,
    text,
    html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
  };
}

export interface EeaRejectionData {
  readonly repoFullName: string;
  readonly amountUsdCents: number;
  readonly countryCode: string;
}

export function eeaRejectionEmail(data: EeaRejectionData): SendEmailInput {
  const dollars = (data.amountUsdCents / 100).toFixed(2);
  const subject = `migrate-bot: full refund issued (service not available in your region)`;
  const text = [
    `Thanks for trying migrate-bot. Unfortunately, our Service is currently`,
    `not offered to residents of the European Economic Area, the United`,
    `Kingdom, or Switzerland (Terms of Service Section 2).`,
    '',
    `Your billing address (country: ${data.countryCode}) falls within that`,
    `scope, so we've issued a full refund of $${dollars} back to your card`,
    `via Stripe. It typically clears in 5-10 business days depending on`,
    `the issuer.`,
    '',
    `The migration job for ${data.repoFullName} did not run; no repository`,
    `data was processed by our agent.`,
    '',
    `The reason for this restriction is GDPR / UK GDPR / Swiss FADP`,
    `compliance. As a small operator we cannot credibly meet the full`,
    `data-controller obligations on day 1, so we exclude those`,
    `jurisdictions for now. We may revisit this once we have proper`,
    `DPA infrastructure.`,
    '',
    `If your billing address is in the EEA / UK / CH but your residency`,
    `is not (e.g., a corporate card issued there but you live elsewhere),`,
    `please reply with that context and we'll re-evaluate.`,
    '',
    `— migrate-bot`,
  ].join('\n');
  return {
    to: '',
    subject,
    text,
    html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
  };
}
