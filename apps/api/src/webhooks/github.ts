import { type AnyDbClient, createD1Client } from '@migrate-bot/db';
import type { JobQueueMessage, QueueProducer } from '@migrate-bot/shared';
import type { Context } from 'hono';
import { type ParsedEvent, parseGitHubEvent } from './events';
import { type HandlerOutcome, handleInstallationEvent, handlePushEvent } from './handlers';

// GitHub webhook 署名検証 + event 振り分け。
// Workers 環境を想定し crypto.subtle で HMAC SHA-256 を計算。
// 重い処理 (DB 書込、Queue 投入) は handlers.ts の pure 関数に委譲。

export interface GitHubWebhookEnv {
  readonly GITHUB_WEBHOOK_SECRET: string;
  readonly DB?: D1Database;
}

export interface GitHubWebhookContext {
  Bindings: GitHubWebhookEnv;
  Variables: {
    readonly db?: AnyDbClient;
    readonly jobsQueue?: QueueProducer<JobQueueMessage>;
  };
}

export async function handleGitHubWebhook(c: Context<GitHubWebhookContext>): Promise<Response> {
  const signature = c.req.header('x-hub-signature-256');
  const event = c.req.header('x-github-event');
  const deliveryId = c.req.header('x-github-delivery');
  const rawBody = await c.req.text();

  if (!signature) return c.json({ error: 'missing signature' }, 401);
  if (!event) return c.json({ error: 'missing event header' }, 400);

  const valid = await verifyGitHubSignature(c.env.GITHUB_WEBHOOK_SECRET, rawBody, signature);
  if (!valid) return c.json({ error: 'invalid signature' }, 401);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'invalid json' }, 400);
  }

  const parsed = parseGitHubEvent(event, body);
  const db = resolveDb(c);
  const summary = await routeEvent(parsed, db);
  return c.json({ ok: true, event, deliveryId, summary });
}

function resolveDb(c: Context<GitHubWebhookContext>): AnyDbClient | null {
  // テストや middleware 経由で c.var.db が事前に注入されていればそれを使う。
  // それ以外は env.DB binding から作る。binding が無ければ DB 書込みは skip。
  const fromVar = c.var.db;
  if (fromVar) return fromVar;
  if (c.env.DB) return createD1Client(c.env.DB);
  return null;
}

async function routeEvent(parsed: ParsedEvent, db: AnyDbClient | null): Promise<HandlerOutcome> {
  if (parsed.kind === 'unsupported') {
    return { action: 'ignored', reason: `unsupported event: ${parsed.event}` };
  }
  if (db === null) {
    // DB binding が無い場合 (テスト等) は受信したことだけ記録
    return { action: 'logged', reason: `${parsed.kind} (no db wired)` };
  }
  if (parsed.kind === 'installation') {
    return handleInstallationEvent(db, parsed.payload);
  }
  if (parsed.kind === 'push') {
    return handlePushEvent(db, parsed.payload);
  }
  const exhaustive: never = parsed;
  throw new Error(`unhandled event kind: ${JSON.stringify(exhaustive)}`);
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
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
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
