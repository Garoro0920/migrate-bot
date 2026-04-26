import type { JobQueueMessage, QueueProducer } from '@migrate-bot/shared';
import type { Context } from 'hono';
import { type ParsedEvent, parseGitHubEvent } from './events';

// GitHub webhook 署名検証 + event 振り分け。
// Workers 環境を想定し crypto.subtle で HMAC SHA-256 を計算。
// 重い処理 (DB 書込、ジョブ起動) はここではせず Queue 投入のみ
// (architecture.md §1.2)。

export interface GitHubWebhookEnv {
  readonly GITHUB_WEBHOOK_SECRET: string;
}

export interface GitHubWebhookContext {
  Bindings: GitHubWebhookEnv;
  Variables: {
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
  const summary = await routeEvent(parsed);
  return c.json({ ok: true, event, deliveryId, summary });
}

interface RouteSummary {
  readonly action: 'enqueued' | 'logged' | 'ignored';
  readonly reason: string;
}

async function routeEvent(parsed: ParsedEvent): Promise<RouteSummary> {
  if (parsed.kind === 'unsupported') {
    return { action: 'ignored', reason: `unsupported event: ${parsed.event}` };
  }

  if (parsed.kind === 'installation') {
    // installation_created 等は新規 install。Phase 2 後半でここに DB 書込 +
    // 「対象 repo を analyze するか」のサインオン UI への通知を追加予定。
    return { action: 'logged', reason: `installation ${parsed.payload.action}` };
  }

  if (parsed.kind === 'push') {
    // push event は将来 (Phase 2 後半) で「マージ後の追加 PR」等に使う想定。
    // Phase 2a 段階では明示的にジョブを起こさない。
    return { action: 'logged', reason: `push to ${parsed.payload.ref}` };
  }

  // 型網羅性チェック: parsed.kind が将来増えたら型エラー
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
