// Fly.io Machine entry。consumer Worker から machine が起動されると、
// 以下の env が注入される:
//   - JOB_ID            このジョブの UUID
//   - TRACE_ID          job_events 用 trace
//   - INTERNAL_API_TOKEN apps/api /internal 認証用 Bearer
//   - INTERNAL_API_URL   apps/api の origin (https://.../)
//   - ANTHROPIC_API_KEY  agent 用 (Phase 1 から共通)
//   - GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (Octokit 用)
//
// 現状 Phase 2 PoC: agent 統合と git push は noop。状態遷移と createPR
// (固定 URL) のみで end-to-end の wiring 確認用。

import { createInternalApiClient } from './internal-api';
import { type PipelineRunner, runJob } from './runner';

interface RunnerEnv {
  readonly JOB_ID: string;
  readonly INTERNAL_API_TOKEN: string;
  readonly INTERNAL_API_URL: string;
}

function readEnv(): RunnerEnv {
  const jobId = process.env.JOB_ID;
  const token = process.env.INTERNAL_API_TOKEN;
  const url = process.env.INTERNAL_API_URL;
  if (!jobId) throw new Error('JOB_ID env var is required');
  if (!token) throw new Error('INTERNAL_API_TOKEN env var is required');
  if (!url) throw new Error('INTERNAL_API_URL env var is required');
  return { JOB_ID: jobId, INTERNAL_API_TOKEN: token, INTERNAL_API_URL: url };
}

// Phase 2 PoC では agent 統合は別ファイル (apps/runner/src/pipeline.ts) に
// 切り出して runJob に渡す方針。本ファイルは index.ts として最小起動配線のみ。
// 現状は noop pipeline で、index 動作確認用。
function defaultPipeline(): PipelineRunner {
  return {
    analyze: async (_repo) => {
      // TODO: Phase 2 完了確認用に @migrate-bot/agent.analyze を統合する
      return {};
    },
    plan: async () => {},
    migrate: async () => {
      return {};
    },
    verify: async () => {},
    createPR: async (job) => ({
      prUrl: `https://github.com/${job.repoFullName}/pull/draft-${job.id.slice(0, 8)}`,
    }),
  };
}

async function main(): Promise<number> {
  const env = readEnv();
  const api = createInternalApiClient({
    baseUrl: env.INTERNAL_API_URL,
    token: env.INTERNAL_API_TOKEN,
  });
  const pipeline = defaultPipeline();
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
