import { retryWithBackoff } from '@migrate-bot/shared';
import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';

// GitHub App として認証し、特定 installation の権限で REST API を叩く wrapper。
// runner が draft PR 作成・branch 確認に使う最小機能のみ。

export interface GitHubAppAuth {
  readonly appId: number;
  readonly privateKey: string;
}

export interface InstallationContext {
  readonly installationId: number;
}

export interface InstallationOctokitFactory {
  forInstallation(installationId: number): Promise<OctokitLike>;
  getInstallationToken(installationId: number): Promise<string>;
}

// Octokit インスタンスから必要なメソッドだけを抽出した shape。
// 完全な Octokit 型を runner 全体で引き回すと巨大なので狭い interface だけ依存させる。
export interface OctokitLike {
  rest: {
    pulls: {
      create(params: CreatePullRequestParams): Promise<{ data: PullRequest }>;
    };
  };
}

export interface CreatePullRequestParams {
  readonly owner: string;
  readonly repo: string;
  readonly title: string;
  readonly head: string;
  readonly base: string;
  readonly body?: string;
  readonly draft?: boolean;
}

export interface PullRequest {
  readonly number: number;
  readonly html_url: string;
  readonly state: string;
}

export class OctokitAppFactory implements InstallationOctokitFactory {
  private readonly app: App;
  private readonly tokenCache = new Map<number, { token: string; expiresAt: number }>();

  constructor(auth: GitHubAppAuth) {
    // Octokit を明示注入しないと App のデフォルトは core Octokit (= .rest なし) で、
    // octokit.rest.pulls.create が undefined になる。@octokit/rest の Octokit を渡すと
    // .rest plugin が installation Octokit にも継承される。
    this.app = new App({ appId: auth.appId, privateKey: auth.privateKey, Octokit });
  }

  async forInstallation(installationId: number): Promise<OctokitLike> {
    const octokit = await this.app.getInstallationOctokit(installationId);
    return octokit as unknown as OctokitLike;
  }

  async getInstallationToken(installationId: number): Promise<string> {
    const cached = this.tokenCache.get(installationId);
    const now = Date.now();
    if (cached && cached.expiresAt > now + 60_000) return cached.token;

    const auth = (await this.app.octokit.auth({
      type: 'installation',
      installationId,
    })) as { token: string; expiresAt: string };
    const expiresAt = Date.parse(auth.expiresAt);
    // Date.parse は不正な文字列で NaN を返す。NaN を cache に保存すると
    // 比較 (cached.expiresAt > now + 60_000) が常に false になり cache 無効化、
    // 1 job 内で installation token を毎回取り直す → rate limit に近づく。
    // 取得直後に検出して投げる方が安全。
    if (Number.isNaN(expiresAt)) {
      throw new Error(`installation token has invalid expiresAt: ${auth.expiresAt}`);
    }
    this.tokenCache.set(installationId, { token: auth.token, expiresAt });
    return auth.token;
  }
}

export interface CreateDraftPRInput {
  readonly factory: InstallationOctokitFactory;
  readonly installationId: number;
  readonly owner: string;
  readonly repo: string;
  readonly head: string;
  readonly base: string;
  readonly title: string;
  readonly body: string;
}

export async function createDraftPR(input: CreateDraftPRInput): Promise<PullRequest> {
  const octokit = await input.factory.forInstallation(input.installationId);
  const response = await retryWithBackoff(
    () =>
      octokit.rest.pulls.create({
        owner: input.owner,
        repo: input.repo,
        head: input.head,
        base: input.base,
        title: input.title,
        body: input.body,
        draft: true,
      }),
    {
      maxAttempts: 3,
      baseDelayMs: 1_000,
      isRetryable: (err) => isRetryableHttp(err),
    },
  );
  return response.data;
}

function isRetryableHttp(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const status = (err as { status?: number }).status;
  if (typeof status !== 'number') return true;
  // 4xx はクライアントエラー (権限・存在しない repo 等) なので retry しない
  if (status >= 400 && status < 500 && status !== 429) return false;
  return true;
}
