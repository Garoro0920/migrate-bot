import type { JobState } from '@migrate-bot/shared';
import type { JobStore } from './job-store';

// agent パイプライン呼び出しを抽象化。テスト時はモックを差し込み、
// 本番では @migrate-bot/agent の analyze/plan/migrate/verify を呼ぶ。

export interface PipelineRunner {
  analyze(repoFullName: string): Promise<void>;
  plan(): Promise<void>;
  migrate(): Promise<void>;
  verify(): Promise<void>;
}

export interface RunOutcome {
  readonly finalState: JobState;
  readonly aborted: boolean;
}

export interface RunOptions {
  readonly jobId: string;
  readonly store: JobStore;
  readonly pipeline: PipelineRunner;
}

export async function runJob(options: RunOptions): Promise<RunOutcome> {
  const { jobId, store, pipeline } = options;
  let job = await store.load(jobId);

  // queued -> analyzing
  job = await store.transition({ jobId, toState: 'analyzing', reason: 'runner started' });
  try {
    await pipeline.analyze(job.repoFullName);
  } catch (err) {
    job = await store.transition({
      jobId,
      toState: 'aborted_blocker',
      reason: `analyze failed: ${describeError(err)}`,
    });
    job = await store.transition({ jobId, toState: 'refunding', reason: 'analyze aborted' });
    return { finalState: job.state, aborted: true };
  }

  job = await store.transition({ jobId, toState: 'planning', reason: 'analyze ok' });
  await pipeline.plan();

  job = await store.transition({ jobId, toState: 'migrating', reason: 'plan ready' });
  await pipeline.migrate();

  job = await store.transition({ jobId, toState: 'verifying', reason: 'migrate done' });
  try {
    await pipeline.verify();
  } catch (err) {
    job = await store.transition({
      jobId,
      toState: 'failed_ci',
      reason: `verify failed: ${describeError(err)}`,
    });
    job = await store.transition({ jobId, toState: 'refunding', reason: 'ci failed' });
    return { finalState: job.state, aborted: true };
  }

  job = await store.transition({ jobId, toState: 'pr_ready', reason: 'verify pass' });
  return { finalState: job.state, aborted: false };
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
