import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { createPricingRouter, type PricingContext, planForFileCount } from '../routes/pricing';

const ENV = {} as PricingContext['Bindings'];

function buildApp(fetchImpl: typeof fetch) {
  const app = new Hono<PricingContext>();
  app.use('*', async (c, next) => {
    c.set('fetch', fetchImpl);
    await next();
  });
  app.route('/pricing', createPricingRouter());
  return app;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
}

function makeRepoTreeFetch({
  defaultBranch = 'main',
  isPrivate = false,
  treePaths,
  truncated = false,
  repoStatus = 200,
  treeStatus = 200,
}: {
  defaultBranch?: string;
  isPrivate?: boolean;
  treePaths: readonly string[];
  truncated?: boolean;
  repoStatus?: number;
  treeStatus?: number;
}): typeof fetch {
  const fetchSpy = vi.fn(async (url: string | URL | Request) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.includes('/git/trees/')) {
      if (treeStatus !== 200) {
        return new Response('', { status: treeStatus });
      }
      return jsonResponse({
        tree: treePaths.map((path) => ({ path, type: 'blob' })),
        truncated,
      });
    }
    // repo info
    if (repoStatus !== 200) {
      return new Response('', { status: repoStatus });
    }
    return jsonResponse({ default_branch: defaultBranch, private: isPrivate });
  });
  return fetchSpy as unknown as typeof fetch;
}

describe('planForFileCount', () => {
  it.each([
    [0, 'small'],
    [50, 'small'],
    [100, 'small'],
    [101, 'medium'],
    [499, 'medium'],
    [500, 'medium'],
    [501, 'large'],
    [1999, 'large'],
    [2000, 'large'],
    [2001, 'enterprise'],
    [10000, 'enterprise'],
  ] as const)('count=%i → %s', (count, expected) => {
    expect(planForFileCount(count)).toBe(expected);
  });
});

describe('GET /pricing/estimate', () => {
  it('returns 400 for missing repo param', async () => {
    const app = buildApp(makeRepoTreeFetch({ treePaths: [] }));
    const res = await app.request('/pricing/estimate', {}, ENV);
    expect(res.status).toBe(400);
  });

  it('returns 400 for repo param exceeding 255 chars', async () => {
    const app = buildApp(makeRepoTreeFetch({ treePaths: [] }));
    const longOwner = 'a'.repeat(130);
    const longRepo = 'b'.repeat(130);
    const res = await app.request(`/pricing/estimate?repo=${longOwner}/${longRepo}`, {}, ENV);
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed repo param', async () => {
    const app = buildApp(makeRepoTreeFetch({ treePaths: [] }));
    const res = await app.request('/pricing/estimate?repo=no-slash', {}, ENV);
    expect(res.status).toBe(400);
  });

  it('returns 404 when GitHub API returns 404 (repo not found)', async () => {
    const app = buildApp(makeRepoTreeFetch({ treePaths: [], repoStatus: 404 }));
    const res = await app.request('/pricing/estimate?repo=octo/missing', {}, ENV);
    expect(res.status).toBe(404);
  });

  it('returns 403 when repo is private', async () => {
    const app = buildApp(makeRepoTreeFetch({ treePaths: [], isPrivate: true }));
    const res = await app.request('/pricing/estimate?repo=octo/secret', {}, ENV);
    expect(res.status).toBe(403);
  });

  it('returns 429 when GitHub API hits rate limit', async () => {
    const app = buildApp(makeRepoTreeFetch({ treePaths: [], repoStatus: 403 }));
    const res = await app.request('/pricing/estimate?repo=octo/hello', {}, ENV);
    expect(res.status).toBe(429);
  });

  it('counts only Next files under pages/ and components/', async () => {
    const treePaths = [
      'pages/index.tsx',
      'pages/about.tsx',
      'pages/api/users.ts',
      'components/Layout.tsx',
      'components/styles.css', // 除外: not .ts/.tsx/.js/.jsx
      'README.md', // 除外: 対象 dir 外
      'src/lib/util.ts', // 除外: 対象 dir 外
      'pages/blog/[slug].tsx',
    ];
    const app = buildApp(makeRepoTreeFetch({ treePaths }));
    const res = await app.request('/pricing/estimate?repo=octo/hello', {}, ENV);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { fileCount: number; plan: string; priceUsd: number };
    // pages/index, pages/about, pages/api/users, components/Layout, pages/blog/[slug] = 5
    expect(body.fileCount).toBe(5);
    expect(body.plan).toBe('small');
    expect(body.priceUsd).toBe(99);
  });

  it('maps 100 files to small / $99', async () => {
    const treePaths = Array.from({ length: 100 }, (_, i) => `pages/page${i}.tsx`);
    const app = buildApp(makeRepoTreeFetch({ treePaths }));
    const res = await app.request('/pricing/estimate?repo=octo/hello', {}, ENV);
    const body = (await res.json()) as { fileCount: number; plan: string; priceUsd: number };
    expect(body.fileCount).toBe(100);
    expect(body.plan).toBe('small');
    expect(body.priceUsd).toBe(99);
  });

  it('maps 250 files to medium / $249', async () => {
    const treePaths = Array.from({ length: 250 }, (_, i) => `components/c${i}.tsx`);
    const app = buildApp(makeRepoTreeFetch({ treePaths }));
    const res = await app.request('/pricing/estimate?repo=octo/hello', {}, ENV);
    const body = (await res.json()) as { fileCount: number; plan: string; priceUsd: number };
    expect(body.plan).toBe('medium');
    expect(body.priceUsd).toBe(249);
  });

  it('maps 1500 files to large / $499', async () => {
    const treePaths = Array.from({ length: 1500 }, (_, i) => `pages/p${i}.tsx`);
    const app = buildApp(makeRepoTreeFetch({ treePaths }));
    const res = await app.request('/pricing/estimate?repo=octo/big', {}, ENV);
    const body = (await res.json()) as { fileCount: number; plan: string; priceUsd: number };
    expect(body.plan).toBe('large');
    expect(body.priceUsd).toBe(499);
  });

  it('maps 5000 files to enterprise / $0 (custom quote)', async () => {
    const treePaths = Array.from({ length: 5000 }, (_, i) => `pages/p${i}.tsx`);
    const app = buildApp(makeRepoTreeFetch({ treePaths }));
    const res = await app.request('/pricing/estimate?repo=octo/huge', {}, ENV);
    const body = (await res.json()) as { fileCount: number; plan: string; priceUsd: number };
    expect(body.plan).toBe('enterprise');
    expect(body.priceUsd).toBe(0);
  });

  it('returns truncated:true when GitHub Tree API truncated the response', async () => {
    const app = buildApp(
      makeRepoTreeFetch({
        treePaths: ['pages/index.tsx'],
        truncated: true,
      }),
    );
    const res = await app.request('/pricing/estimate?repo=octo/hello', {}, ENV);
    const body = (await res.json()) as { truncated: boolean };
    expect(body.truncated).toBe(true);
  });

  it('uses GITHUB_PAT for authorization when available', async () => {
    const fetchSpy = vi.fn(makeRepoTreeFetch({ treePaths: ['pages/index.tsx'] }));
    const app = new Hono<PricingContext>();
    app.use('*', async (c, next) => {
      c.set('fetch', fetchSpy as unknown as typeof fetch);
      await next();
    });
    app.route('/pricing', createPricingRouter());
    await app.request('/pricing/estimate?repo=octo/hello', {}, { GITHUB_PAT: 'ghp_test_token' });
    const callsWithAuth = fetchSpy.mock.calls.filter((call) => {
      const init = call[1] as RequestInit | undefined;
      const headers = init?.headers as Record<string, string> | undefined;
      return headers?.authorization === 'token ghp_test_token';
    });
    expect(callsWithAuth.length).toBeGreaterThanOrEqual(1);
  });
});
