import type { JobState } from '@migrate-bot/shared';

// apps/api の /internal/* エンドポイントを叩く HTTP client。
// runner 専用 (Workers binding が使えないので HTTP 経由で D1 を読み書き)。

export interface RemoteJob {
  readonly id: string;
  readonly installationId: string;
  readonly customerId: string | null;
  readonly repoFullName: string;
  readonly plan: 'small' | 'medium' | 'large' | 'enterprise';
  readonly state: JobState;
  readonly traceId: string;
  readonly tokensInput: number;
  readonly tokensOutput: number;
  readonly costUsd: number;
  readonly prUrl: string | null;
  readonly errorCode: string | null;
  readonly errorDetail: string | null;
  readonly createdAt: number;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
}

export interface InternalApiClient {
  loadJob(jobId: string): Promise<RemoteJob>;
  transitionJob(input: { jobId: string; toState: JobState; reason: string }): Promise<void>;
  recordUsage(input: {
    jobId: string;
    tokensInput: number;
    tokensOutput: number;
    costUsd: number;
  }): Promise<void>;
}

export interface InternalApiClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
}

export class InternalApiError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string, message?: string) {
    super(message ?? `internal API error: ${status} ${body.slice(0, 200)}`);
    this.name = 'InternalApiError';
    this.status = status;
    this.body = body;
  }
}

export function createInternalApiClient(opts: InternalApiClientOptions): InternalApiClient {
  const fetchFn = opts.fetch ?? fetch;
  const baseUrl = opts.baseUrl.replace(/\/$/, '');
  const headers = {
    authorization: `Bearer ${opts.token}`,
    'content-type': 'application/json',
  };

  async function call(path: string, init?: RequestInit): Promise<Response> {
    const res = await fetchFn(`${baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new InternalApiError(res.status, body);
    }
    return res;
  }

  return {
    async loadJob(jobId) {
      const res = await call(`/internal/jobs/${encodeURIComponent(jobId)}`);
      return (await res.json()) as RemoteJob;
    },

    async transitionJob(input) {
      await call(`/internal/jobs/${encodeURIComponent(input.jobId)}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toState: input.toState, reason: input.reason }),
      });
    },

    async recordUsage(input) {
      await call(`/internal/jobs/${encodeURIComponent(input.jobId)}/usage`, {
        method: 'POST',
        body: JSON.stringify({
          tokensInput: input.tokensInput,
          tokensOutput: input.tokensOutput,
          costUsd: input.costUsd,
        }),
      });
    },
  };
}
