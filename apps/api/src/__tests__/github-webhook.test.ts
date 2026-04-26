import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { verifyGitHubSignature } from '../webhooks/github';

const SECRET = 'test-secret-12345';

async function signBody(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
  let hex = '';
  for (const b of sig) hex += b.toString(16).padStart(2, '0');
  return `sha256=${hex}`;
}

describe('verifyGitHubSignature', () => {
  it('returns true for a correctly signed body', async () => {
    const body = '{"action":"created"}';
    const sig = await signBody(SECRET, body);
    expect(await verifyGitHubSignature(SECRET, body, sig)).toBe(true);
  });

  it('returns false for a tampered body', async () => {
    const body = '{"action":"created"}';
    const sig = await signBody(SECRET, body);
    expect(await verifyGitHubSignature(SECRET, '{"action":"deleted"}', sig)).toBe(false);
  });

  it('returns false for a different secret', async () => {
    const body = '{"action":"created"}';
    const sig = await signBody('other-secret', body);
    expect(await verifyGitHubSignature(SECRET, body, sig)).toBe(false);
  });

  it('returns false for malformed signature header', async () => {
    expect(await verifyGitHubSignature(SECRET, 'body', 'sha1=deadbeef')).toBe(false);
    expect(await verifyGitHubSignature(SECRET, 'body', 'no-prefix')).toBe(false);
  });
});

describe('GET /health', () => {
  it('returns 200 with service info', async () => {
    const app = createApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe('migrate-bot-api');
  });
});

describe('POST /webhooks/github', () => {
  const env = { GITHUB_WEBHOOK_SECRET: SECRET };

  it('rejects missing signature with 401', async () => {
    const app = createApp();
    const res = await app.request(
      '/webhooks/github',
      {
        method: 'POST',
        headers: { 'x-github-event': 'push' },
        body: '{}',
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it('rejects missing event header with 400', async () => {
    const app = createApp();
    const body = '{}';
    const sig = await signBody(SECRET, body);
    const res = await app.request(
      '/webhooks/github',
      {
        method: 'POST',
        headers: { 'x-hub-signature-256': sig },
        body,
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it('rejects bad signature with 401', async () => {
    const app = createApp();
    const body = '{"x":1}';
    const wrongSig = await signBody('other', body);
    const res = await app.request(
      '/webhooks/github',
      {
        method: 'POST',
        headers: {
          'x-hub-signature-256': wrongSig,
          'x-github-event': 'push',
        },
        body,
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it('accepts a correctly signed push event', async () => {
    const app = createApp();
    const body = '{"action":"created"}';
    const sig = await signBody(SECRET, body);
    const res = await app.request(
      '/webhooks/github',
      {
        method: 'POST',
        headers: {
          'x-hub-signature-256': sig,
          'x-github-event': 'installation',
          'x-github-delivery': 'abc-123',
        },
        body,
      },
      env,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; event: string; deliveryId: string };
    expect(json.ok).toBe(true);
    expect(json.event).toBe('installation');
    expect(json.deliveryId).toBe('abc-123');
  });
});

describe('unknown route', () => {
  it('returns 404 with json body', async () => {
    const app = createApp();
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('not found');
  });
});
