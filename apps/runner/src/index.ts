// Fly.io Machine entry。consumer Worker から machine が起動されると、
// 以下の env が注入される:
//   - JOB_ID            このジョブの UUID
//   - INTERNAL_API_TOKEN apps/api /internal 認証用 Bearer
//   - INTERNAL_API_URL   apps/api の origin (https://.../)
//   - ANTHROPIC_API_KEY  agent 用 (Phase 1 から共通)
//   - GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (Octokit 用)
//   - SENTRY_DSN        (任意) 例外送信先

import * as Sentry from '@sentry/node';
import { OctokitAppFactory } from './github';
import { createInternalApiClient } from './internal-api';
import { createRealPipeline } from './pipeline';
import { runJob } from './runner';

// Sentry init は env を読む前に走らせる (env 読み込み中の例外も拾うため)。
// SENTRY_DSN が無ければ no-op。
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'dev',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    initialScope: {
      tags: {
        jobId: process.env.JOB_ID ?? 'unknown',
        traceId: process.env.TRACE_ID ?? 'unknown',
      },
    },
  });
}

interface RunnerEnv {
  readonly JOB_ID: string;
  readonly INTERNAL_API_TOKEN: string;
  readonly INTERNAL_API_URL: string;
  readonly GITHUB_APP_ID: string;
  readonly GITHUB_APP_PRIVATE_KEY: string;
}

function readEnv(): RunnerEnv {
  // Diagnostic: dump available env keys + lengths of expected ones.
  // Names only (no values) since some are secrets. This helps trace
  // whether values are flowing from Worker config.env / Fly app secrets.
  const expected = [
    'JOB_ID',
    'TRACE_ID',
    'INTERNAL_API_TOKEN',
    'INTERNAL_API_URL',
    'GITHUB_APP_ID',
    'GITHUB_APP_PRIVATE_KEY',
    'ANTHROPIC_API_KEY',
  ] as const;
  const summary: Record<string, { present: boolean; length: number }> = {};
  for (const key of expected) {
    const v = process.env[key];
    summary[key] = { present: typeof v === 'string' && v.length > 0, length: v?.length ?? 0 };
  }
  const allEnvKeys = Object.keys(process.env).sort();
  process.stderr.write(`runner env diagnostic: expected=${JSON.stringify(summary)} allEnvKeyCount=${allEnvKeys.length} sampleKeys=${JSON.stringify(allEnvKeys.slice(0, 20))}\n`);

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

async function main(): Promise<number> {
  const env = readEnv();
  const api = createInternalApiClient({
    baseUrl: env.INTERNAL_API_URL,
    token: env.INTERNAL_API_TOKEN,
  });

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

  const outcome = await runJob({ jobId: env.JOB_ID, api, pipeline });
  process.stdout.write(
    `runner finished: state=${outcome.finalState} aborted=${outcome.aborted}` +
      (outcome.prUrl ? ` prUrl=${outcome.prUrl}` : '') +
      '\n',
  );
  return outcome.aborted ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  async (err: unknown) => {
    process.stderr.write(`runner fatal: ${String(err)}\n`);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
      // flush は send 中に process が exit するのを防ぐ。2s 待って終了。
      await Sentry.close(2000).catch(() => {});
    }
    process.exit(1);
  },
);
