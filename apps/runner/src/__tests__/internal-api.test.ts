import { describe, expect, it } from 'vitest';
import { createInternalApiClient, InternalApiError } from '../internal-api';

interface CapturedRequest {
  url: string;
  method: string;
  body: string | undefined;
  authorization: string | null;
}

function makeFetchStub(impl: (req: Request) => Response | Promise<Response>): {
  fetch: typeof fetch;
  captured: CapturedRequest[];
} {
  const captured: CapturedRequest[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    const req = url instanceof Request ? url : new Request(String(url), init);
    captured.push({
      url: req.url,
      method: req.method,
      body: req.method !== 'GET' ? await req.clone().text() : undefined,
      authorization: req.headers.get('authorization'),
    });
    return impl(req);
  }) as typeof fetch;
  return { fetch: fetchFn, captured };
}

describe('InternalApiClient', () => {
  const baseUrl = 'https://api.example.com';
  const token = 'internal-secret';

  it('loadJob GETs /internal/jobs/:id with bearer auth', async () => {
    const stub = makeFetchStub(
      () =>
        new Response(
          JSON.stringify({
            id: 'job-1',
            state: 'queued',
            repoFullName: 'a/b',
            plan: 'small',
            traceId: 't',
            tokensInput: 0,
            tokensOutput: 0,
            costUsd: 0,
            installationId: 'i',
            customerId: null,
            prUrl: null,
            errorCode: null,
            errorDetail: null,
            createdAt: 1,
            startedAt: null,
            completedAt: null,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    const client = createInternalApiClient({ baseUrl, token, fetch: stub.fetch });
    const job = await client.loadJob('job-1');
    expect(job.id).toBe('job-1');
    expect(stub.captured[0]?.url).toBe('https://api.example.com/internal/jobs/job-1');
    expect(stub.captured[0]?.method).toBe('GET');
    expect(stub.captured[0]?.authorization).toBe('Bearer internal-secret');
  });

  it('transitionJob POSTs the state change', async () => {
    const stub = makeFetchStub(
      () =>
        new Response(JSON.stringify({ ok: true, from: 'queued', to: 'analyzing' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const client = createInternalApiClient({ baseUrl, token, fetch: stub.fetch });
    await client.transitionJob({ jobId: 'j', toState: 'analyzing', reason: 'go' });
    const captured = stub.captured[0];
    expect(captured?.method).toBe('POST');
    expect(captured?.url).toBe('https://api.example.com/internal/jobs/j/transition');
    const body = JSON.parse(captured?.body ?? '{}') as { toState: string; reason: string };
    expect(body.toState).toBe('analyzing');
    expect(body.reason).toBe('go');
  });

  it('recordUsage POSTs the delta', async () => {
    const stub = makeFetchStub(
      () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const client = createInternalApiClient({ baseUrl, token, fetch: stub.fetch });
    await client.recordUsage({
      jobId: 'j',
      tokensInput: 1000,
      tokensOutput: 200,
      costUsd: 0.005,
    });
    const captured = stub.captured[0];
    expect(captured?.method).toBe('POST');
    expect(captured?.url).toBe('https://api.example.com/internal/jobs/j/usage');
    const body = JSON.parse(captured?.body ?? '{}') as Record<string, number>;
    expect(body.tokensInput).toBe(1000);
    expect(body.tokensOutput).toBe(200);
    expect(body.costUsd).toBeCloseTo(0.005);
  });

  it('throws InternalApiError on non-2xx', async () => {
    const stub = makeFetchStub(
      () => new Response('boom', { status: 500, headers: { 'content-type': 'text/plain' } }),
    );
    const client = createInternalApiClient({ baseUrl, token, fetch: stub.fetch });
    try {
      await client.loadJob('x');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InternalApiError);
      expect((err as InternalApiError).status).toBe(500);
      expect((err as InternalApiError).body).toBe('boom');
    }
  });

  it('strips trailing slash from baseUrl', async () => {
    const stub = makeFetchStub(
      () =>
        new Response(
          JSON.stringify({
            id: 'j',
            state: 'queued',
            repoFullName: 'a/b',
            plan: 'small',
            traceId: 't',
            tokensInput: 0,
            tokensOutput: 0,
            costUsd: 0,
            installationId: 'i',
            customerId: null,
            prUrl: null,
            errorCode: null,
            errorDetail: null,
            createdAt: 1,
            startedAt: null,
            completedAt: null,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    const client = createInternalApiClient({
      baseUrl: 'https://api.example.com/',
      token,
      fetch: stub.fetch,
    });
    await client.loadJob('j');
    expect(stub.captured[0]?.url).toBe('https://api.example.com/internal/jobs/j');
  });
});
