import { assertTransition, type JobState } from '@migrate-bot/shared';

// DB アクセスを抽象化。本番は Drizzle+D1、テストは in-memory 実装。
// runner はこのインターフェースだけに依存し、具象は呼び出し側 (index.ts) で
// 注入する。

export interface JobRecord {
  readonly id: string;
  readonly traceId: string;
  readonly repoFullName: string;
  readonly state: JobState;
  readonly costUsd: number;
}

export interface TransitionInput {
  readonly jobId: string;
  readonly toState: JobState;
  readonly reason: string;
}

export interface JobStore {
  load(jobId: string): Promise<JobRecord>;
  transition(input: TransitionInput): Promise<JobRecord>;
}

export class InMemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, JobRecord>();

  seed(record: JobRecord): void {
    this.jobs.set(record.id, record);
  }

  async load(jobId: string): Promise<JobRecord> {
    const r = this.jobs.get(jobId);
    if (!r) throw new Error(`job not found: ${jobId}`);
    return r;
  }

  async transition(input: TransitionInput): Promise<JobRecord> {
    const r = this.jobs.get(input.jobId);
    if (!r) throw new Error(`job not found: ${input.jobId}`);
    assertTransition(r.state, input.toState);
    const updated: JobRecord = { ...r, state: input.toState };
    this.jobs.set(input.jobId, updated);
    return updated;
  }
}
