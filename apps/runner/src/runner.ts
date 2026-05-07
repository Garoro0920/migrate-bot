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
  // pipeline が確保した一時資源 (tmp 作業ディレクトリ等) を解放する。
  // runner.ts の finally から例外経路でも必ず呼ぶ。複数回呼ばれても安全 (idempotent)。
  cleanup(): Promise<void>;
}

export interface RunOutcome {
  readonly finalState: JobState;
  readonly aborted: boolean;
  readonly prUrl?: string;
  // R1: 既に処理済 (state !== 'queued') の job が再投入された場合に true。
  // 二重 runner / queue retry race の検出指標。
  readonly skippedDuplicate?: boolean;
}

export interface RunOptions {
  readonly jobId: string;
  readonly api: InternalApiClient;
  readonly pipeline: PipelineRunner;
}

export async function runJob(options: RunOptions): Promise<RunOutcome> {
  const { jobId, api, pipeline } = options;
  const job = await api.loadJob(jobId);

  // R1: 同じ JOB_ID で既に runner が走った形跡があれば即座に拒否。
  // queue consumer の再試行や Fly Machine の偶発的二重起動で、別インスタンスが
  // 既に状態を進めていることがある。queued 以外から始めると、不正遷移エラーや
  // 課金済 PR の二重生成といった事故になるので、ここで断る。
  if (job.state !== 'queued') {
    process.stdout.write(`runJob: refusing duplicate entry for job=${jobId} state=${job.state}\n`);
    return { finalState: job.state, aborted: true, skippedDuplicate: true };
  }

  try {
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
    try {
      await pipeline.plan();
    } catch (err) {
      // R2: plan 段階の予期せぬ例外。aborted_blocker → refunding で全額返金。
      // reason に "plan crashed" を残し operator が原因切り分けできるようにする。
      await api.transitionJob({
        jobId,
        toState: 'aborted_blocker',
        reason: `plan crashed: ${describeError(err)}`,
      });
      await api.transitionJob({ jobId, toState: 'refunding', reason: 'plan crashed' });
      return { finalState: 'refunding', aborted: true };
    }

    await api.transitionJob({ jobId, toState: 'migrating', reason: 'plan ready' });
    let migrateResult: { usage?: PipelineUsage };
    try {
      migrateResult = await pipeline.migrate();
    } catch (err) {
      // R2: migrate 段階の予期せぬ例外 (タスク失敗・agent 例外・git エラー等)。
      await api.transitionJob({
        jobId,
        toState: 'aborted_blocker',
        reason: `migrate crashed: ${describeError(err)}`,
      });
      await api.transitionJob({ jobId, toState: 'refunding', reason: 'migrate crashed' });
      return { finalState: 'refunding', aborted: true };
    }
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

    let pr: { prUrl: string };
    try {
      pr = await pipeline.createPR(job);
    } catch (err) {
      // R2: createPR 段階の予期せぬ例外 (git push / GitHub API 障害)。
      // verifying → aborted_blocker → refunding で返金。
      await api.transitionJob({
        jobId,
        toState: 'aborted_blocker',
        reason: `createPR crashed: ${describeError(err)}`,
      });
      await api.transitionJob({ jobId, toState: 'refunding', reason: 'createPR crashed' });
      return { finalState: 'refunding', aborted: true };
    }
    await api.transitionJob({
      jobId,
      toState: 'pr_ready',
      reason: 'verify pass',
      prUrl: pr.prUrl,
    });
    return { finalState: 'pr_ready', aborted: false, prUrl: pr.prUrl };
  } finally {
    // R4: tmp 作業ディレクトリは成功・失敗・例外いずれでも必ず解放する。
    // cleanup 自身が失敗しても上位への伝播はしない (job 結果の上書きを避ける)。
    await pipeline.cleanup().catch((err) => {
      process.stderr.write(`runJob: pipeline cleanup failed: ${describeError(err)}\n`);
    });
  }
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
