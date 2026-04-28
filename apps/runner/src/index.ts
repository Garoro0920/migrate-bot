// Fly.io Machine entry。consumer Worker から machine が起動されると、
// 以下の env が注入される:
//   - JOB_ID            このジョブの UUID
//   - INTERNAL_API_TOKEN apps/api /internal 認証用 Bearer
//   - INTERNAL_API_URL   apps/api の origin (https://.../)
//   - ANTHROPIC_API_KEY  agent 用 (Phase 1 から共通)
//   - GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (Octokit 用)

import { OctokitAppFactory } from './github';
import { createInternalApiClient } from './internal-api';
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
  (err: unknown) => {
    process.stderr.write(`runner fatal: ${String(err)}\n`);
    process.exit(1);
  },
);
