import type { Context } from 'hono';

// GitHub webhook 署名検証 + event 振り分けの skeleton。
// Workers 環境を想定し crypto.subtle で HMAC SHA-256 を計算。

export interface GitHubWebhookEnv {
  readonly GITHUB_WEBHOOK_SECRET: string;
}

export interface GitHubWebhookContext {
  Bindings: GitHubWebhookEnv;
}

export async function handleGitHubWebhook(c: Context<GitHubWebhookContext>): Promise<Response> {
  const signature = c.req.header('x-hub-signature-256');
  const event = c.req.header('x-github-event');
  const deliveryId = c.req.header('x-github-delivery');
  const rawBody = await c.req.text();

  if (!signature) {
    return c.json({ error: 'missing signature' }, 401);
  }
  if (!event) {
    return c.json({ error: 'missing event header' }, 400);
  }

  const valid = await verifyGitHubSignature(c.env.GITHUB_WEBHOOK_SECRET, rawBody, signature);
  if (!valid) {
    return c.json({ error: 'invalid signature' }, 401);
  }

  // Phase 2a: 受信ログのみ。Phase 2 後半で installation/push/pull_request の
  // 各 event ごとに DB 書込 + Queue 投入を実装する。
  return c.json({ ok: true, event, deliveryId });
}

export async function verifyGitHubSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> {
  if (!signatureHeader.startsWith('sha256=')) return false;
  const provided = signatureHeader.slice('sha256='.length);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = bytesToHex(new Uint8Array(sigBuffer));

  return timingSafeEqualHex(provided, expected);
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) {
    out += b.toString(16).padStart(2, '0');
  }
  return out;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
