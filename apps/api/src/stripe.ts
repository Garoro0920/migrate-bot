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
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: input.orderId,
        customer_email: input.customerEmail,
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
