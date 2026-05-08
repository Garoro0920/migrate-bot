import { Hono } from 'hono';
import { PLAN_AMOUNT_USD_CENTS } from '../stripe';

// 公開エンドポイント /pricing/estimate — GitHub の public repo を指定すると
// `pages/` + `components/` 配下の .ts / .tsx / .js / .jsx ファイル数から
// 推奨プランと予想価格を返す。
//
// 顧客が GitHub App をインストールする前に「自分の repo はいくらになるか」
// を確認できるようにする。Phase 4 landing page から JS で叩くか、curl で
// 直接叩くこともできる。
//
// 注意:
//   - private repo は対応外 (403 を返す。install 後の正式 analyze で対応)
//   - GitHub の Tree API は repo が巨大すぎると truncated:true を返す。
//     その場合 fileCount は under-count されている可能性がある旨を返す
//   - rate limit: 未認証で 60 req/h/IP。GITHUB_PAT が env にあれば
//     authorize して 5,000 req/h に上げる
//
// 認証: 不要 (公開情報のみ参照)。

const PLAN_THRESHOLDS = {
  small: 100,
  medium: 500,
  large: 2000,
} as const;

const RELEVANT_DIR = /^(pages|components)\//;
const NEXT_FILE_EXT = /\.(ts|tsx|js|jsx)$/;

export interface PricingEnv {
  // optional: PAT を設定すると GitHub API rate limit が緩和される
  readonly GITHUB_PAT?: string;
}

export interface PricingContext {
  Bindings: PricingEnv;
  Variables: {
    readonly fetch?: typeof fetch;
  };
}

interface GitHubRepoInfo {
  readonly default_branch: string;
  readonly private: boolean;
}

interface GitHubTreeItem {
  readonly path: string;
  readonly type: 'blob' | 'tree' | 'commit';
}

interface GitHubTreeResponse {
  readonly tree: readonly GitHubTreeItem[];
  readonly truncated: boolean;
}

export type Plan = 'small' | 'medium' | 'large' | 'enterprise';

export interface PricingEstimate {
  readonly ok: true;
  readonly repoFullName: string;
  readonly branch: string;
  readonly fileCount: number;
  readonly plan: Plan;
  readonly priceUsd: number;
  readonly truncated: boolean;
}

export function planForFileCount(count: number): Plan {
  if (count <= PLAN_THRESHOLDS.small) return 'small';
  if (count <= PLAN_THRESHOLDS.medium) return 'medium';
  if (count <= PLAN_THRESHOLDS.large) return 'large';
  return 'enterprise';
}

export function createPricingRouter(): Hono<PricingContext> {
  const app = new Hono<PricingContext>();

  // 公開 API なので landing page (別ドメイン) からの fetch を許可するよう
  // CORS を全 origin で開放。GET のみ。
  app.use('/*', async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        },
      });
    }
    await next();
    c.res.headers.set('access-control-allow-origin', '*');
  });

  app.get('/estimate', async (c) => {
    const repo = c.req.query('repo');
    // 上限 255 文字: GitHub の owner/name は概ね 100 字以内、255 で十分余裕。
    // 上限を入れることで悪意あるクライアントが巨大な URL クエリを送って
    // 後段の API call で問題を起こすのを防ぐ。
    if (!repo || repo.length > 255 || !/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repo)) {
      return c.json({ error: 'invalid repo: use owner/repo format (e.g. octocat/hello)' }, 400);
    }

    const fetchFn = c.var.fetch ?? fetch;
    const headers: Record<string, string> = {
      accept: 'application/vnd.github.v3+json',
      'user-agent': 'migrate-bot-pricing/1.0',
    };
    if (c.env.GITHUB_PAT) {
      headers.authorization = `token ${c.env.GITHUB_PAT}`;
    }

    // 1. repo metadata (default_branch + private flag)
    let repoInfo: GitHubRepoInfo;
    try {
      const repoRes = await fetchFn(`https://api.github.com/repos/${repo}`, { headers });
      if (repoRes.status === 404) {
        return c.json({ error: 'repo not found (or private)' }, 404);
      }
      if (repoRes.status === 403) {
        return c.json({ error: 'GitHub API rate limit hit; try again in a few minutes' }, 429);
      }
      if (!repoRes.ok) {
        return c.json({ error: `GitHub API repo lookup failed: ${repoRes.status}` }, 502);
      }
      repoInfo = (await repoRes.json()) as GitHubRepoInfo;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `network error: ${msg}` }, 502);
    }

    if (repoInfo.private) {
      return c.json(
        {
          error: 'repo is private; install the GitHub App to get an authenticated quote',
        },
        403,
      );
    }

    // 2. recursive tree
    let tree: GitHubTreeResponse;
    try {
      const treeRes = await fetchFn(
        `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(
          repoInfo.default_branch,
        )}?recursive=1`,
        { headers },
      );
      if (!treeRes.ok) {
        return c.json({ error: `GitHub Tree API failed: ${treeRes.status}` }, 502);
      }
      tree = (await treeRes.json()) as GitHubTreeResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `network error: ${msg}` }, 502);
    }

    // 3. count Next.js source files under pages/ + components/
    const fileCount = tree.tree.filter(
      (item) =>
        item.type === 'blob' && RELEVANT_DIR.test(item.path) && NEXT_FILE_EXT.test(item.path),
    ).length;

    const plan = planForFileCount(fileCount);
    const priceUsdCents = plan === 'enterprise' ? null : PLAN_AMOUNT_USD_CENTS[plan];
    const priceUsd = priceUsdCents !== null ? priceUsdCents / 100 : 0;

    const response: PricingEstimate = {
      ok: true,
      repoFullName: repo,
      branch: repoInfo.default_branch,
      fileCount,
      plan,
      priceUsd,
      truncated: tree.truncated,
    };
    return c.json(response);
  });

  return app;
}
