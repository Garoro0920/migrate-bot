// Fly.io Machines API client。queue consumer Worker から runner machine を
// 一回限りで起動するために使う。
//
// 公式 API: https://fly.io/docs/machines/working-with-machines/
// auth: Bearer <FLY_API_TOKEN> (flyctl auth token で取得した値を Worker secret に登録)
//
// fetch を DI してテストではモック差込可能。

const FLY_API_BASE = 'https://api.machines.dev/v1';

export interface FlyMachineConfig {
  readonly image: string;
  readonly env?: Record<string, string>;
  readonly auto_destroy?: boolean;
  readonly restart?: { readonly policy: 'no' | 'always' | 'on-failure' };
  readonly guest?: {
    readonly cpu_kind?: 'shared' | 'performance';
    readonly cpus?: number;
    readonly memory_mb?: number;
  };
}

export interface FlyMachineCreateRequest {
  readonly name?: string;
  readonly region?: string;
  readonly config: FlyMachineConfig;
}

export interface FlyMachine {
  readonly id: string;
  readonly name: string;
  readonly state: string;
  readonly region?: string;
  readonly instance_id?: string;
}

export interface FlyApiClient {
  createMachine(req: FlyMachineCreateRequest): Promise<FlyMachine>;
  getMachine(id: string): Promise<FlyMachine>;
}

export interface FlyApiClientOptions {
  readonly appName: string;
  readonly apiToken: string;
  readonly fetch?: typeof fetch;
  readonly baseUrl?: string;
}

export function createFlyApiClient(opts: FlyApiClientOptions): FlyApiClient {
  const fetchFn = opts.fetch ?? fetch;
  const baseUrl = opts.baseUrl ?? FLY_API_BASE;
  const headers = {
    authorization: `Bearer ${opts.apiToken}`,
    'content-type': 'application/json',
  };

  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetchFn(`${baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new FlyApiError(res.status, `Fly API ${path} ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    createMachine: (req) =>
      call<FlyMachine>(`/apps/${opts.appName}/machines`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getMachine: (id) => call<FlyMachine>(`/apps/${opts.appName}/machines/${id}`),
  };
}

export class FlyApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'FlyApiError';
    this.status = status;
  }
}
