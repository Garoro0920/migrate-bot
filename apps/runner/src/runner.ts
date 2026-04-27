import type { JobState } from '@migrate-bot/shared';
import type { InternalApiClient, RemoteJob } from './internal-api';

// runner の orchestration。状態遷移は InternalApiClient 経由 (apps/api を HTTP
// で叩く) で D1 に書く。agent パイプラインの呼び出しは PipelineRunner で抽象化、
// テストではモック、本番では @migrate-bot/agent を呼ぶ。

export interface PipelineUsage {
  readonly tokensInput: number;
  readonly tokensOutput: number;
  readonly costUsd: number;
}

export interface PipelineRunner {
  analyze(repoFullName: string): Promise<{ usage?: PipelineUsage }>;
  plan(): Promise<void>;
  migrate(): Promise<{ usage?: PipelineUsage }>;
  verify(): Promise<void>;
  createPR(job: RemoteJob): Promise<{ prUrl: string }>;
}

export interface RunOutcome {
  readonly finalState: JobState;
  readonly aborted: boolean;
  readonly prUrl?: string;
}

export interface RunOptions {
  readonly jobId: string;
  readonly api: InternalApiClient;
  readonly pipeline: PipelineRunner;
}

export async function runJob(options: RunOptions): Promise<RunOutcome> {
  const { jobId, api, pipeline } = options;
  const job = await api.loadJob(jobId);

  // queued -> analyzing
  await api.transitionJob({ jobId, toState: 'analyzing', reason: 'runner started' });
  let analyzeResult: { usage?: PipelineUsage };
  try {
    analyzeResult = await pipeline.analyze(job.repoFullName);
  } catch (err) {
    await api.transitionJob({
      jobId,
      toState: 'aborted_blocker',
      reason: `analyze failed: ${describeError(err)}`,
    });
    await api.transitionJob({ jobId, toState: 'refunding', reason: 'analyze aborted' });
    return { finalState: 'refunding', aborted: true };
  }
  await recordIfPresent(api, jobId, analyzeResult.usage);

  await api.transitionJob({ jobId, toState: 'planning', reason: 'analyze ok' });
  await pipeline.plan();

  await api.transitionJob({ jobId, toState: 'migrating', reason: 'plan ready' });
  const migrateResult = await pipeline.migrate();
  await recordIfPresent(api, jobId, migrateResult.usage);

  await api.transitionJob({ jobId, toState: 'verifying', reason: 'migrate done' });
  try {
    await pipeline.verify();
  } catch (err) {
    await api.transitionJob({
      jobId,
      toState: 'failed_ci',
      reason: `verify failed: ${describeError(err)}`,
    });
    await api.transitionJob({ jobId, toState: 'refunding', reason: 'ci failed' });
    return { finalState: 'refunding', aborted: true };
  }

  const pr = await pipeline.createPR(job);
  await api.transitionJob({ jobId, toState: 'pr_ready', reason: 'verify pass' });
  return { finalState: 'pr_ready', aborted: false, prUrl: pr.prUrl };
}

async function recordIfPresent(
  api: InternalApiClient,
  jobId: string,
  usage?: PipelineUsage,
): Promise<void> {
  if (!usage) return;
  await api.recordUsage({
    jobId,
    tokensInput: usage.tokensInput,
    tokensOutput: usage.tokensOutput,
    costUsd: usage.costUsd,
  });
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
