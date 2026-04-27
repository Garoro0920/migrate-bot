import { type AnyDbClient, markInstallationRevoked, upsertInstallation } from '@migrate-bot/db';
import type { InstallationPayload, PushPayload } from './events';

// HTTP 層から分離した event 処理ロジック。
// 入力は drizzle インスタンス + parse 済 payload のみ、副作用は DB 書込のみ。
// テスト時は better-sqlite3 backed db、本番は D1 backed db を渡す。

export interface HandlerOutcome {
  readonly action: 'enqueued' | 'logged' | 'ignored';
  readonly reason: string;
}

export async function handleInstallationEvent(
  db: AnyDbClient,
  payload: InstallationPayload,
): Promise<HandlerOutcome> {
  const { action, installation } = payload;
  const accountLogin = installation.account?.login ?? 'unknown';

  switch (action) {
    case 'created':
    case 'unsuspend':
    case 'new_permissions_accepted': {
      const result = await upsertInstallation(db, {
        githubInstallationId: installation.id,
        accountLogin,
      });
      return {
        action: 'logged',
        reason: `installation ${action} (db: ${result.created ? 'created' : 'updated'} ${result.id})`,
      };
    }
    case 'deleted':
    case 'suspend': {
      await markInstallationRevoked(db, installation.id);
      return {
        action: 'logged',
        reason: `installation ${action} (db: marked revoked)`,
      };
    }
    default: {
      const exhaustive: never = action;
      return { action: 'ignored', reason: `unknown installation action: ${String(exhaustive)}` };
    }
  }
}

export async function handlePushEvent(
  _db: AnyDbClient,
  payload: PushPayload,
): Promise<HandlerOutcome> {
  // Phase 2 後半では「マージ後の追加 PR」等で利用予定。現状は記録のみ。
  return {
    action: 'logged',
    reason: `push to ${payload.repository.full_name}@${payload.ref}`,
  };
}
