import { beforeAll, describe, expect, it } from 'vitest';
import { type AppContext, createApp } from '../app';

const ENV: AppContext['Bindings'] = {
  GITHUB_APP_INSTALL_URL: 'https://github.com/apps/migrate-bot-test/installations/new',
  CONTACT_EMAIL: 'test@example.com',
  BRAND_NAME: 'migrate-bot',
};

describe('GET /health', () => {
  it('returns service status JSON', async () => {
    const app = createApp();
    const res = await app.request('/health', {}, ENV);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; service: string };
    expect(json.ok).toBe(true);
    expect(json.service).toBe('migrate-bot-web');
  });
});

describe('GET /', () => {
  let html: string;
  let status: number;
  beforeAll(async () => {
    const app = createApp();
    const res = await app.request('/', {}, ENV);
    status = res.status;
    html = await res.text();
  });
  it('returns 200 with html doctype', () => {
    expect(status).toBe(200);
    expect(html).toMatch(/^<!doctype html>/i);
  });
  it('renders the brand name', () => {
    expect(html).toContain('migrate-bot');
  });
  it('contains the hero headline', () => {
    expect(html).toContain('Pages Router');
    expect(html).toContain('App Router');
  });
  it('contains all four pricing plans', () => {
    expect(html).toContain('Small');
    expect(html).toContain('Medium');
    expect(html).toContain('Large');
    expect(html).toContain('Enterprise');
  });
  it('shows the canonical pricing values', () => {
    expect(html).toContain('$99');
    expect(html).toContain('$249');
    expect(html).toContain('$499');
  });
  it('links Install CTA to the GitHub App install URL', () => {
    expect(html).toContain(ENV.GITHUB_APP_INSTALL_URL);
  });
  it('links the contact email in the footer', () => {
    expect(html).toContain(`mailto:${ENV.CONTACT_EMAIL}`);
  });
  it('links to all four legal pages', () => {
    expect(html).toContain('/legal/terms');
    expect(html).toContain('/legal/privacy');
    expect(html).toContain('/legal/refunds');
    expect(html).toContain('/legal/specified-commercial-transactions');
  });
  it('includes how-it-works and faq sections', () => {
    expect(html).toContain('id="how-it-works"');
    expect(html).toContain('id="faq"');
  });
});

describe('GET /install', () => {
  it('redirects to the GitHub App install URL', async () => {
    const app = createApp();
    const res = await app.request('/install', { redirect: 'manual' }, ENV);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(ENV.GITHUB_APP_INSTALL_URL);
  });
});

describe('GET /legal/:slug', () => {
  it.each([
    ['/legal/terms', 'Terms of Service'],
    ['/legal/privacy', 'Privacy Policy'],
    ['/legal/refunds', 'Refund Policy'],
    ['/legal/specified-commercial-transactions', '特定商取引法'],
  ])('renders %s with expected heading text', async (path, expectedTitleFragment) => {
    const app = createApp();
    const res = await app.request(path, {}, ENV);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain(expectedTitleFragment);
  });

  it('legal pages do not leak the DRAFT meta block', async () => {
    const app = createApp();
    const res = await app.request('/legal/terms', {}, ENV);
    const html = await res.text();
    // The DRAFT meta block contains "Status: DRAFT" — must not appear in the
    // rendered output. The embed script strips it. Note that the unrelated word
    // "draft" (lowercase, e.g. in "draft pull request") is fine.
    expect(html).not.toContain('Status: DRAFT');
    expect(html).not.toContain('not yet legally reviewed');
  });

  it('legal pages contain canonical service references', async () => {
    const app = createApp();
    const res = await app.request('/legal/refunds', {}, ENV);
    const html = await res.text();
    expect(html).toContain('14');
    expect(html).toContain('next build');
  });
});

describe('GET unknown path', () => {
  it('returns 404 with the not-found page', async () => {
    const app = createApp();
    const res = await app.request('/this-page-does-not-exist', {}, ENV);
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain('Page not found');
    expect(html).toContain(`mailto:${ENV.CONTACT_EMAIL}`);
  });
});

describe('GET /checkout/success', () => {
  it('returns 200 and confirms payment received', async () => {
    const app = createApp();
    const res = await app.request('/checkout/success', {}, ENV);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Payment received');
    expect(html).toContain('migration job has started');
    expect(html).toContain(`mailto:${ENV.CONTACT_EMAIL}`);
    expect(html).toContain('next build');
  });
});

describe('GET /checkout/cancel', () => {
  it('returns 200 and tells the user no charge was made', async () => {
    const app = createApp();
    const res = await app.request('/checkout/cancel', {}, ENV);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('No charge made');
    expect(html).toContain('cancelled');
    expect(html).toContain(ENV.GITHUB_APP_INSTALL_URL);
  });
});
