import { Hono } from 'hono';
import { type AdminContext, createAdminRouter } from './routes/admin';
import { type CheckoutContext, createCheckoutRouter } from './routes/checkout';
import { createInternalRouter, type InternalContext } from './routes/internal';
import { createPricingRouter, type PricingContext } from './routes/pricing';
import {
  createStripeWebhookRouter,
  type StripeWebhookContext,
} from './routes/stripe-webhook';
import { type GitHubWebhookContext, handleGitHubWebhook } from './webhooks/github';

// 全 route の env / variables を統合した型。Hono の Bindings は intersection で
// マージできる。
export interface AppEnv {
  Bindings: GitHubWebhookContext['Bindings'] &
    AdminContext['Bindings'] &
    InternalContext['Bindings'] &
    CheckoutContext['Bindings'] &
    StripeWebhookContext['Bindings'] &
    PricingContext['Bindings'];
  Variables: GitHubWebhookContext['Variables'] &
    AdminContext['Variables'] &
    InternalContext['Variables'] &
    CheckoutContext['Variables'] &
    StripeWebhookContext['Variables'] &
    PricingContext['Variables'];
}

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get('/health', (c) => c.json({ ok: true, service: 'migrate-bot-api' }));

  app.post('/webhooks/github', handleGitHubWebhook);

  app.route('/admin', createAdminRouter());
  app.route('/internal', createInternalRouter());
  app.route('/checkout', createCheckoutRouter());
  app.route('/webhooks/stripe', createStripeWebhookRouter());
  app.route('/pricing', createPricingRouter());

  app.notFound((c) => c.json({ error: 'not found' }, 404));

  return app;
}
