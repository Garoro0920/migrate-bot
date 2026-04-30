import Stripe from 'stripe';

// Stripe SDK の Workers 互換薄ラッパ。
// - Workers では Node の http が無いので Stripe.createFetchHttpClient() を使う
// - テストではこの interface を満たす fake を流し込む
//
// 提供メソッドは Phase 3 で必要な最小:
//   - createCheckoutSession: orderId 紐付け済の Checkout セッションを発行
//   - verifyWebhookSignature: Stripe webhook の event を署名検証付きで parse
//   - createRefund: 完了済 PaymentIntent を返金
//
// API バージョンは Stripe SDK と一致させる。新バージョンに上げるときは
// `stripe.com/docs/api/versioning` を確認。

export interface CreateCheckoutSessionInput {
  readonly orderId: string;
  readonly customerEmail: string;
  readonly plan: 'small' | 'medium' | 'large' | 'enterprise';
  readonly amountUsdCents: number;
  readonly repoFullName: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
}

export interface CheckoutSessionResult {
  readonly sessionId: string;
  readonly url: string;
}

export interface RefundResult {
  readonly refundId: string;
  readonly amountUsdCents: number;
}

export interface StripeClient {
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResult>;
  verifyWebhookSignature(rawBody: string, signature: string): Promise<Stripe.Event>;
  createRefund(paymentIntentId: string, amountUsdCents: number): Promise<RefundResult>;
}

export interface StripeClientOptions {
  readonly secretKey: string;
  readonly webhookSecret: string;
  // テスト時に Stripe SDK 実体を差し込めるようにする
  readonly stripe?: Stripe;
}

export function createStripeClient(opts: StripeClientOptions): StripeClient {
  const stripe =
    opts.stripe ??
    new Stripe(opts.secretKey, {
      // SDK 同梱バージョンを尊重 (固定すると SDK 更新時に齟齬が出る)
      httpClient: Stripe.createFetchHttpClient(),
    });

  return {
    async createCheckoutSession(input) {
      // GDPR 適用域 (EEA + UK + Switzerland) からの利用は ToS §2 で明示的に
      // 拒否している。Stripe Checkout API には allowed_countries の概念が
      // 通常 Checkout には無い (Connect 専用) ため、以下の 2 段防御で対応:
      //   1. billing_address_collection: 'required' で住所を必須収集
      //   2. custom_text で EEA/UK/CH 居住者は利用不可である旨を画面上に表示
      // post-launch では webhook (checkout.session.completed) で
      // session.customer_details.address.country を検証し、EEA/UK/CH なら
      // 自動 refund する追加の防御層を入れる予定 (TODO: legal-self-review-log
      // §"Stripe EEA gating" 参照)。
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: input.orderId,
        customer_email: input.customerEmail,
        billing_address_collection: 'required',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: input.amountUsdCents,
              product_data: {
                name: `migrate-bot ${input.plan} migration`,
                description: `Pages Router → App Router for ${input.repoFullName}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          orderId: input.orderId,
          repoFullName: input.repoFullName,
          plan: input.plan,
        },
        custom_text: {
          submit: {
            message:
              'This Service is not offered to residents of the European Economic Area, the United Kingdom, or Switzerland. By proceeding, you confirm that you are not a resident of those jurisdictions.',
          },
        },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      });
      if (!session.url) {
        throw new Error(`Stripe Checkout session has no url: ${session.id}`);
      }
      return { sessionId: session.id, url: session.url };
    },

    async verifyWebhookSignature(rawBody, signature) {
      // Workers では同期版 (constructEvent) は内部で crypto を同期で叩くため不可。
      // 必ず async 版を使う。
      return stripe.webhooks.constructEventAsync(rawBody, signature, opts.webhookSecret);
    },

    async createRefund(paymentIntentId, amountUsdCents) {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amountUsdCents,
      });
      return {
        refundId: refund.id,
        amountUsdCents: refund.amount,
      };
    },
  };
}

// プラン → 価格 (USD cents)。business.md §4.1 と一致させる。
export const PLAN_AMOUNT_USD_CENTS: Record<'small' | 'medium' | 'large', number> = {
  small: 9900,
  medium: 24900,
  large: 49900,
};
