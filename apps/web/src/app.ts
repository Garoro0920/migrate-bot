import { Hono } from 'hono';
import { renderCheckoutCancel, renderCheckoutSuccess } from './pages/checkout';
import { renderLanding } from './pages/landing';
import { renderLegalPage, type LegalSlug } from './pages/legal';
import { renderPostInstall } from './pages/post-install';

// 全 route の env / variables を統合した型。
export interface WebEnv {
  readonly GITHUB_APP_INSTALL_URL: string;
  readonly CONTACT_EMAIL: string;
  readonly BRAND_NAME: string;
  readonly PUBLIC_API_URL: string;
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
        publicApiUrl: c.env.PUBLIC_API_URL,
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

  // GitHub App の Setup URL からの redirect 先。GET でフォーム表示、POST で
  // apps/api の /checkout/create-session を server-side で呼び出して Stripe
  // Checkout URL に redirect する (cross-origin CORS を回避するため proxy)。
  app.get('/post-install', (c) => {
    const installationId = c.req.query('installation_id') ?? '';
    return c.html(
      renderPostInstall({
        installationId,
        contactEmail: c.env.CONTACT_EMAIL,
        brandName: c.env.BRAND_NAME,
      }),
    );
  });
  app.post('/post-install', async (c) => {
    const form = await c.req.parseBody();
    const installationId = String(form.installationId ?? '');
    const email = String(form.email ?? '');
    const repo = String(form.repo ?? '');
    const plan = String(form.plan ?? '');
    const renderError = (errorMessage: string, status: 400 | 502 = 400) =>
      c.html(
        renderPostInstall({
          installationId,
          contactEmail: c.env.CONTACT_EMAIL,
          brandName: c.env.BRAND_NAME,
          errorMessage,
          defaultEmail: email,
          defaultRepo: repo,
          defaultPlan: plan,
        }),
        status,
      );
    const installationIdNum = Number(installationId);
    if (!Number.isFinite(installationIdNum) || installationIdNum <= 0) {
      return renderError('Installation ID missing or invalid. Please re-install the GitHub App.');
    }
    if (plan !== 'small' && plan !== 'medium' && plan !== 'large') {
      return renderError('Please select a plan.');
    }
    let res: Response;
    try {
      res = await fetch(`${c.env.PUBLIC_API_URL}/checkout/create-session`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          githubInstallationId: installationIdNum,
          repoFullName: repo,
          plan,
          customerEmail: email,
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return renderError(`Network error contacting checkout service: ${message}`, 502);
    }
    const data = (await res.json().catch(() => ({}))) as {
      readonly checkoutUrl?: string;
      readonly error?: string;
    };
    if (!res.ok || !data.checkoutUrl) {
      return renderError(data.error ?? 'Unable to create checkout session.');
    }
    return c.redirect(data.checkoutUrl, 302);
  });

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
