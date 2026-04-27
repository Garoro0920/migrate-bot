import { describe, expect, it } from 'vitest';
import { createFlyApiClient, FlyApiError } from '../fly';

function makeFetchStub(impl: (req: Request) => Response | Promise<Response>): typeof fetch {
  return ((url: string | URL | Request, init?: RequestInit) => {
    const req = url instanceof Request ? url : new Request(String(url), init);
    return Promise.resolve(impl(req));
  }) as typeof fetch;
}

describe('FlyApiClient', () => {
  it('createMachine POSTs to /apps/:app/machines with bearer auth', async () => {
    let capturedRequest: Request | null = null;
    const fetchStub = makeFetchStub((req) => {
      capturedRequest = req;
      return new Response(JSON.stringify({ id: 'm1', name: 'job-x', state: 'started' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = createFlyApiClient({
      appName: 'migrate-bot-runner-dev',
      apiToken: 'secret-token',
      fetch: fetchStub,
    });

    const result = await client.createMachine({
      name: 'job-abc',
      config: { image: 'registry.fly.io/x:y', auto_destroy: true, restart: { policy: 'no' } },
    });

    expect(result.id).toBe('m1');
    expect(capturedRequest!.method).toBe('POST');
    expect(capturedRequest!.url).toContain('/apps/migrate-bot-runner-dev/machines');
    expect(capturedRequest!.headers.get('authorization')).toBe('Bearer secret-token');
    const body = (await capturedRequest!.json()) as { name: string };
    expect(body.name).toBe('job-abc');
  });

  it('throws FlyApiError with status on non-2xx', async () => {
    const fetchStub = makeFetchStub(
      () =>
        new Response('rate limit', {
          status: 429,
          headers: { 'content-type': 'text/plain' },
        }),
    );
    const client = createFlyApiClient({
      appName: 'a',
      apiToken: 't',
      fetch: fetchStub,
    });
    try {
      await client.createMachine({ config: { image: 'x' } });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(FlyApiError);
      expect((err as FlyApiError).status).toBe(429);
    }
  });

  it('getMachine GETs /apps/:app/machines/:id', async () => {
    let capturedRequest: Request | null = null;
    const fetchStub = makeFetchStub((req) => {
      capturedRequest = req;
      return new Response(JSON.stringify({ id: 'm1', name: 'n', state: 'started' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = createFlyApiClient({
      appName: 'app',
      apiToken: 't',
      fetch: fetchStub,
    });
    await client.getMachine('m1');
    expect(capturedRequest!.method).toBe('GET');
    expect(capturedRequest!.url).toContain('/apps/app/machines/m1');
  });

  it('respects custom baseUrl for testing/staging', async () => {
    let capturedUrl: string | null = null;
    const fetchStub = makeFetchStub((req) => {
      capturedUrl = req.url;
      return new Response(JSON.stringify({ id: 'm', name: 'n', state: 's' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = createFlyApiClient({
      appName: 'app',
      apiToken: 't',
      fetch: fetchStub,
      baseUrl: 'https://stub.example.com/v1',
    });
    await client.getMachine('m1');
    expect(capturedUrl).toBe('https://stub.example.com/v1/apps/app/machines/m1');
  });
});
