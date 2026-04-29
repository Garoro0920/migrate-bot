import { describe, expect, it, vi } from 'vitest';
import { runAdminTrigger } from '../commands/admin-trigger';

const ENV = {
  MIGRATE_BOT_API_URL: 'https://api.example.com',
  MIGRATE_BOT_API_TOKEN: 'secret-token',
};

function makeFetchOk(body: unknown): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ) as unknown as typeof fetch;
}

function makeFetchError(status: number, body: string): typeof fetch {
  return vi.fn(async () =>
    new Response(body, { status }),
  ) as unknown as typeof fetch;
}

describe('cli admin-trigger', () => {
  it('returns 1 when args are missing', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger([], { env: ENV });
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('returns 1 when MIGRATE_BOT_API_URL is missing', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['42', 'octocat/hello'], { env: {} });
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('returns 1 when MIGRATE_BOT_API_TOKEN is missing', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['42', 'octocat/hello'], {
      env: { MIGRATE_BOT_API_URL: ENV.MIGRATE_BOT_API_URL },
    });
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('returns 1 when installationId is not numeric', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['not-a-number', 'octocat/hello'], { env: ENV });
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it("returns 1 when repo is not in owner/repo form", async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['42', 'no-slash'], { env: ENV });
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('POSTs to /admin/trigger with bearer auth and body, then prints summary', async () => {
    const fetch = makeFetchOk({
      ok: true,
      jobId: 'job-uuid',
      traceId: 'trace-uuid',
      installationId: 'inst-uuid',
    });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['42', 'octocat/hello'], { fetch, env: ENV });
    expect(code).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ENV.MIGRATE_BOT_API_URL}/admin/trigger`);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${ENV.MIGRATE_BOT_API_TOKEN}`);
    const body = JSON.parse(init.body as string) as {
      githubInstallationId: number;
      accountLogin: string;
      repoFullName: string;
      plan: string;
    };
    expect(body).toEqual({
      githubInstallationId: 42,
      accountLogin: 'octocat',
      repoFullName: 'octocat/hello',
      plan: 'small',
    });
    stdout.mockRestore();
  });

  it('emits JSON output with --json', async () => {
    const fetch = makeFetchOk({
      ok: true,
      jobId: 'job-1',
      traceId: 'trace-1',
      installationId: 'inst-1',
    });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['--json', '42', 'octocat/hello'], { fetch, env: ENV });
    expect(code).toBe(0);
    const written = stdout.mock.calls
      .map((call) => {
        const first = call[0];
        if (typeof first === 'string') return first;
        if (first instanceof Uint8Array) return Buffer.from(first).toString('utf-8');
        return '';
      })
      .join('');
    const parsed = JSON.parse(written) as { jobId: string };
    expect(parsed.jobId).toBe('job-1');
    stdout.mockRestore();
  });

  it('forwards --plan medium to the request body', async () => {
    const fetch = makeFetchOk({
      ok: true,
      jobId: 'j',
      traceId: 't',
      installationId: 'i',
    });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await runAdminTrigger(['--plan', 'medium', '42', 'octocat/hello'], { fetch, env: ENV });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as { plan: string };
    expect(body.plan).toBe('medium');
    stdout.mockRestore();
  });

  it('returns 1 on 401 (auth failure)', async () => {
    const fetch = makeFetchError(401, '{"error":"unauthorized"}');
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['42', 'octocat/hello'], { fetch, env: ENV });
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('returns 2 on 5xx error', async () => {
    const fetch = makeFetchError(503, 'Service Unavailable');
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['42', 'octocat/hello'], { fetch, env: ENV });
    expect(code).toBe(2);
    stderr.mockRestore();
  });

  it('returns 2 on network error (fetch throws)', async () => {
    const fetchThrowing = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['42', 'octocat/hello'], {
      fetch: fetchThrowing,
      env: ENV,
    });
    expect(code).toBe(2);
    stderr.mockRestore();
  });
});
