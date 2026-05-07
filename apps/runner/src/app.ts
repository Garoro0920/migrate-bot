// Fly.io Machine entry の本体。index.ts はこのモジュールを import して main() を
// 呼ぶだけの薄いラッパーにし、テストからは runApp / installShutdownHandler を
// 副作用なく import できるようにする。

import * as Sentry from '@sentry/node';
import { OctokitAppFactory } from './github';
import { createInternalApiClient, type InternalApiClient } from './internal-api';
import { createRealPipeline } from './pipeline';
import { runJob } from './runner';

interface RunnerEnv {
  readonly JOB_ID: string;
  readonly INTERNAL_API_TOKEN: string;
  readonly INTERNAL_API_URL: string;
  readonly GITHUB_APP_ID: string;
  readonly GITHUB_APP_PRIVATE_KEY: string;
}

function readEnv(): RunnerEnv {
  const jobId = process.env.JOB_ID;
  const token = process.env.INTERNAL_API_TOKEN;
  const url = process.env.INTERNAL_API_URL;
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!jobId) throw new Error('JOB_ID env var is required');
  if (!token) throw new Error('INTERNAL_API_TOKEN env var is required');
  if (!url) throw new Error('INTERNAL_API_URL env var is required');
  if (!appId) throw new Error('GITHUB_APP_ID env var is required');
  if (!privateKey) throw new Error('GITHUB_APP_PRIVATE_KEY env var is required');
  return {
    JOB_ID: jobId,
    INTERNAL_API_TOKEN: token,
    INTERNAL_API_URL: url,
    GITHUB_APP_ID: appId,
    GITHUB_APP_PRIVATE_KEY: privateKey,
  };
}

// R5: SIGTERM 時の best-effort クリーンアップ。
// Fly Machine が外部要因 (deploy / rolling restart / OOM) で落ちる際、
// SIGTERM が飛ぶ。job 状態を進めずに Machine が消えると、D1 上の job は永遠に
// active 状態に張り付く。せめて aborted_blocker → refunding に倒して顧客に
// 自動返金できる状態にしてから exit する。
//
// 注意:
// - process.exit を呼ぶ前に Sentry.flush で例外送信を待つ。
// - 二重起動 (SIGTERM が複数回飛ぶ) を防ぐため shuttingDown フラグでガード。
// - api / jobId は handler installation 時にクロージャでキャプチャする。
export function installShutdownHandler(api: InternalApiClient, jobId: string): () => void {
  let shuttingDown = false;
  const handler = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stderr.write(`runner: received ${signal}, attempting graceful shutdown\n`);
    try {
      // 既に terminal な状態なら不正遷移エラーになるので best-effort で握りつぶす。
      await api.transitionJob({
        jobId,
        toState: 'aborted_blocker',
        reason: `received ${signal} during pipeline (Fly machine shutdown)`,
      });
      await api.transitionJob({
        jobId,
        toState: 'refunding',
        reason: `aborted on ${signal}`,
      });
    } catch (err) {
      process.stderr.write(
        `runner: shutdown transition failed (likely already terminal): ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
    if (process.env.SENTRY_DSN) {
      await Sentry.close(2000).catch(() => {});
    }
    process.exit(143);
  };
  const wrapped = (signal: NodeJS.Signals) => {
    void handler(signal).catch(() => process.exit(143));
  };
  process.on('SIGTERM', wrapped);
  process.on('SIGINT', wrapped);
  return () => {
    process.off('SIGTERM', wrapped);
    process.off('SIGINT', wrapped);
  };
}

export async function runApp(): Promise<number> {
  const env = readEnv();
  const api = createInternalApiClient({
    baseUrl: env.INTERNAL_API_URL,
    token: env.INTERNAL_API_TOKEN,
  });

  // R5: env 解決と api クライアント生成が済んだ直後に shutdown handler を仕込む。
  // shutdown 経路で api が必要なので、これより前に SIGTERM を受けても何もできないが
  // それは仕方ない (Fly が起動中の Machine を即座に kill する状況は稀)。
  const detachShutdown = installShutdownHandler(api, env.JOB_ID);

  // installationId を取るために 1 度 job を pre-load する。runJob 内でも loadJob が
  // 走るので 1 往復多いが、それ以外の wiring は単純化される。
  // 注: jobs.installation_id は内部 UUID。Octokit には GitHub の integer ID が必要なので
  // /internal/jobs/:id 側で join 済の githubInstallationId を使う。
  const job = await api.loadJob(env.JOB_ID);
  const installationId = job.githubInstallationId;
  if (!Number.isFinite(installationId)) {
    throw new Error(`invalid githubInstallationId: ${job.githubInstallationId}`);
  }

  const factory = new OctokitAppFactory({
    appId: Number(env.GITHUB_APP_ID),
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
  });
  const pipeline = createRealPipeline({ installationId, factory });

  try {
    const outcome = await runJob({ jobId: env.JOB_ID, api, pipeline });
    process.stdout.write(
      `runner finished: state=${outcome.finalState} aborted=${outcome.aborted}` +
        (outcome.prUrl ? ` prUrl=${outcome.prUrl}` : '') +
        (outcome.skippedDuplicate ? ' skippedDuplicate=true' : '') +
        '\n',
    );
    return outcome.aborted ? 1 : 0;
  } finally {
    // 通常終了時は shutdown handler を外して、Sentry close 等が二重に走るのを防ぐ
    detachShutdown();
  }
}
