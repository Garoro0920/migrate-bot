// Fly.io Machine entry。Phase 2 後半で本番実装する。
// 現状は env から JOB_ID を読み skeleton を実行するだけ。

import { InMemoryJobStore } from './job-store';
import { runJob } from './runner';

async function main(): Promise<number> {
  const jobId = process.env['JOB_ID'];
  if (!jobId) {
    process.stderr.write('JOB_ID env var is required\n');
    return 1;
  }
  process.stderr.write('runner skeleton: real DB and pipeline are not wired yet (Phase 2 後半)\n');
  process.stderr.write(`would run job ${jobId}\n`);

  // skeleton demo: in-memory store + no-op pipeline
  const store = new InMemoryJobStore();
  store.seed({
    id: jobId,
    traceId: `trace-${jobId}`,
    repoFullName: 'demo/repo',
    state: 'queued',
    costUsd: 0,
  });
  const outcome = await runJob({
    jobId,
    store,
    pipeline: {
      analyze: async () => {},
      plan: async () => {},
      migrate: async () => {},
      verify: async () => {},
    },
  });
  process.stdout.write(`final state: ${outcome.finalState} (aborted=${outcome.aborted})\n`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    process.stderr.write(`${String(err)}\n`);
    process.exit(1);
  },
);
