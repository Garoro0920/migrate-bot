import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { createStripeClient, PLAN_AMOUNT_USD_CENTS } from '../stripe';

// Stripe SDK は重いので shape だけ持つ fake を DI で差し込む。
function makeFakeStripe(overrides: Partial<{
  createSession: ReturnType<typeof vi.fn>;
  constructEvent: ReturnType<typeof vi.fn>;
  createRefund: ReturnType<typeof vi.fn>;
}> = {}): Stripe {
  const fake = {
    checkout: {
      sessions: {
        create: overrides.createSession ?? vi.fn().mockResolvedValue({
          id: 'cs_test_default',
          url: 'https://checkout.stripe.com/c/pay/cs_test_default',
        }),
      },
    },
    webhooks: {
      constructEventAsync: overrides.constructEvent ?? vi.fn().mockResolvedValue({
        id: 'evt_default',
        type: 'checkout.session.completed',
      }),
    },
    refunds: {
      create: overrides.createRefund ?? vi.fn().mockResolvedValue({
        id: 're_default',
        amount: 9900,
      }),
    },
  };
  return fake as unknown as Stripe;
}

describe('createStripeClient.createCheckoutSession', () => {
  it('creates a session with orderId, customer email, and amount', async () => {
    const createSession = vi.fn().mockResolvedValue({
      id: 'cs_test_xyz',
      url: 'https://checkout.stripe.com/c/pay/cs_test_xyz',
    });
    const stripe = makeFakeStripe({ createSession });
    const client = createStripeClient({
      secretKey: 'sk_test',
      webhookSecret: 'whsec_test',
      stripe,
    });

    const result = await client.createCheckoutSession({
      orderId: 'order-1',
      customerEmail: 'a@example.com',
      plan: 'medium',
      amountUsdCents: 24900,
      repoFullName: 'octocat/hello',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
    });

    expect(result).toEqual({
      sessionId: 'cs_test_xyz',
      url: 'https://checkout.stripe.com/c/pay/cs_test_xyz',
    });
    expect(createSession).toHaveBeenCalledTimes(1);
    const arg = createSession.mock.calls[0]?.[0] as Stripe.Checkout.SessionCreateParams;
    expect(arg.mode).toBe('payment');
    expect(arg.client_reference_id).toBe('order-1');
    expect(arg.customer_email).toBe('a@example.com');
    expect(arg.metadata).toEqual({
      orderId: 'order-1',
      repoFullName: 'octocat/hello',
      plan: 'medium',
    });
    expect(arg.success_url).toBe('https://app/success');
    expect(arg.cancel_url).toBe('https://app/cancel');
    const lineItem = arg.line_items?.[0];
    expect(lineItem?.quantity).toBe(1);
    const priceData = lineItem?.price_data;
    expect(priceData?.currency).toBe('usd');
    expect(priceData?.unit_amount).toBe(24900);
  });

  it('throws when Stripe returns a session without a url', async () => {
    const stripe = makeFakeStripe({
      createSession: vi.fn().mockResolvedValue({ id: 'cs_no_url', url: null }),
    });
    const client = createStripeClient({ secretKey: 'sk', webhookSecret: 'wh', stripe });
    await expect(
      client.createCheckoutSession({
        orderId: 'o',
        customerEmail: 'a@example.com',
        plan: 'small',
        amountUsdCents: 9900,
        repoFullName: 'a/b',
        successUrl: 's',
        cancelUrl: 'c',
      }),
    ).rejects.toThrow(/no url/);
  });
});

describe('createStripeClient.verifyWebhookSignature', () => {
  it('delegates to stripe.webhooks.constructEventAsync', async () => {
    const event = {
      id: 'evt_1',
      type: 'checkout.session.completed',
    } as Stripe.Event;
    const constructEvent = vi.fn().mockResolvedValue(event);
    const stripe = makeFakeStripe({ constructEvent });
    const client = createStripeClient({ secretKey: 'sk', webhookSecret: 'whsec_x', stripe });

    const result = await client.verifyWebhookSignature('rawbody', 't=1,v1=abc');
    expect(result).toBe(event);
    expect(constructEvent).toHaveBeenCalledWith('rawbody', 't=1,v1=abc', 'whsec_x');
  });

  it('propagates verification failures', async () => {
    const stripe = makeFakeStripe({
      constructEvent: vi.fn().mockRejectedValue(new Error('signature mismatch')),
    });
    const client = createStripeClient({ secretKey: 'sk', webhookSecret: 'wh', stripe });
    await expect(client.verifyWebhookSignature('body', 'bad')).rejects.toThrow(/signature/);
  });
});

describe('createStripeClient.createRefund', () => {
  it('creates a refund for the given payment intent and amount', async () => {
    const createRefund = vi.fn().mockResolvedValue({ id: 're_xyz', amount: 24900 });
    const stripe = makeFakeStripe({ createRefund });
    const client = createStripeClient({ secretKey: 'sk', webhookSecret: 'wh', stripe });
    const result = await client.createRefund('pi_123', 24900);
    expect(result).toEqual({ refundId: 're_xyz', amountUsdCents: 24900 });
    expect(createRefund).toHaveBeenCalledWith({ payment_intent: 'pi_123', amount: 24900 });
  });
});

describe('PLAN_AMOUNT_USD_CENTS', () => {
  it('matches business.md §4.1 pricing in cents', () => {
    expect(PLAN_AMOUNT_USD_CENTS.small).toBe(9900);
    expect(PLAN_AMOUNT_USD_CENTS.medium).toBe(24900);
    expect(PLAN_AMOUNT_USD_CENTS.large).toBe(49900);
  });
});
