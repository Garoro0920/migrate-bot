import { Hono } from 'hono';
import { renderCheckoutCancel, renderCheckoutSuccess } from './pages/checkout';
import { renderLanding } from './pages/landing';
import { renderLegalPage, type LegalSlug } from './pages/legal';

// 全 route の env / variables を統合した型。
export interface WebEnv {
  readonly GITHUB_APP_INSTALL_URL: string;
  readonly CONTACT_EMAIL: string;
  readonly BRAND_NAME: string;
}

export interface AppContext {
  Bindings: WebEnv;
}

const LEGAL_SLUGS: readonly LegalSlug[] = [
  'terms',
  'privacy',
  'refunds',
  'specified-commercial-transactions',
];

export function createApp(): Hono<AppContext> {
  const app = new Hono<AppContext>();

  app.get('/health', (c) => c.json({ ok: true, service: 'migrate-bot-web' }));

  app.get('/', (c) => {
    return c.html(
      renderLanding({
        installUrl: c.env.GITHUB_APP_INSTALL_URL,
        contactEmail: c.env.CONTACT_EMAIL,
        brandName: c.env.BRAND_NAME,
      }),
    );
  });

  // 法務文書 4 種を /legal/<slug> で配信。docs/templates/legal/ の Markdown
  // 原本を marked で HTML に変換して layout に流し込む。
  for (const slug of LEGAL_SLUGS) {
    app.get(`/legal/${slug}`, (c) =>
      c.html(
        renderLegalPage({
          slug,
          contactEmail: c.env.CONTACT_EMAIL,
          brandName: c.env.BRAND_NAME,
        }),
      ),
    );
  }

  // GitHub App install URL への redirect (Stripe success/cancel と同様、
  // landing からの CTA で使う短縮 URL)
  app.get('/install', (c) => c.redirect(c.env.GITHUB_APP_INSTALL_URL, 302));

  // Stripe Checkout からのリダイレクト先 (apps/api の wrangler.toml で
  // CHECKOUT_SUCCESS_URL / CHECKOUT_CANCEL_URL がここを指している)。
  app.get('/checkout/success', (c) =>
    c.html(
      renderCheckoutSuccess({
        contactEmail: c.env.CONTACT_EMAIL,
        brandName: c.env.BRAND_NAME,
        installUrl: c.env.GITHUB_APP_INSTALL_URL,
      }),
    ),
  );
  app.get('/checkout/cancel', (c) =>
    c.html(
      renderCheckoutCancel({
        contactEmail: c.env.CONTACT_EMAIL,
        brandName: c.env.BRAND_NAME,
        installUrl: c.env.GITHUB_APP_INSTALL_URL,
      }),
    ),
  );

  app.notFound((c) =>
    c.html(
      renderLegalPage({
        slug: 'not-found',
        contactEmail: c.env.CONTACT_EMAIL,
        brandName: c.env.BRAND_NAME,
      }),
      404,
    ),
  );

  return app;
}
