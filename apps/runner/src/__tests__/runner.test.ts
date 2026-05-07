import type { JobState } from '@migrate-bot/shared';
import { describe, expect, it, vi } from 'vitest';
import type { InternalApiClient, RemoteJob } from '../internal-api';
import { type PipelineRunner, runJob } from '../runner';

function noopPipeline(overrides: Partial<PipelineRunner> = {}): PipelineRunner {
  return {
    analyze: async () => ({}),
    plan: async () => {},
    migrate: async () => ({}),
    verify: async () => {},
    createPR: async () => ({ prUrl: 'https://github.com/o/r/pull/1' }),
    cleanup: async () => {},
    ...overrides,
  };
}

interface TransitionRecord {
  toState: JobState;
  reason: string;
}

interface UsageRecord {
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
}

function makeApi(initialJob: RemoteJob): {
  api: InternalApiClient;
  transitions: TransitionRecord[];
  usage: UsageRecord[];
  current: { state: JobState };
} {
  const transitions: TransitionRecord[] = [];
  const usage: UsageRecord[] = [];
  const current = { state: initialJob.state };
  const api: InternalApiClient = {
    loadJob: async () => ({ ...initialJob, state: current.state }),
    transitionJob: async (input) => {
      transitions.push({ toState: input.toState, reason: input.reason });
      current.state = input.toState;
    },
    recordUsage: async (input) => {
      usage.push({
        tokensInput: input.tokensInput,
        tokensOutput: input.tokensOutput,
        costUsd: input.costUsd,
      });
    },
  };
  return { api, transitions, usage, current };
}

function makeJob(overrides: Partial<RemoteJob> = {}): RemoteJob {
  return {
    id: 'job-1',
    installationId: 'inst-1',
    githubInstallationId: 12345,
    customerId: null,
    repoFullName: 'octocat/hello',
    plan: 'small',
    state: 'queued',
    traceId: 'trace-1',
    tokensInput: 0,
    tokensOutput: 0,
    costUsd: 0,
    prUrl: null,
    errorCode: null,
    errorDetail: null,
    createdAt: 1,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe('runJob', () => {
  it('runs the happy path through pr_ready and returns the PR url', async () => {
    const { api, transitions } = makeApi(makeJob());
    const out = await runJob({ jobId: 'job-1', api, pipeline: noopPipeline() });
    expect(out.finalState).toBe('pr_ready');
    expect(out.aborted).toBe(false);
    expect(out.prUrl).toBe('https://github.com/o/r/pull/1');
    expect(transitions.map((t) => t.toState)).toEqual([
      'analyzing',
      'planning',
      'migrating',
      'verifying',
      'pr_ready',
    ]);
  });

  it('aborted_blocker -> refunding when analyze throws', async () => {
    const { api } = makeApi(makeJob());
    const out = await runJob({
      jobId: 'job-1',
      api,
      pipeline: noopPipeline({
        analyze: async () => {
          throw new Error('custom server detected');
        },
      }),
    });
    expect(out.aborted).toBe(true);
    expect(out.finalState).toBe('refunding');
  });

  it('failed_ci -> refunding when verify throws', async () => {
    const { api } = makeApi(makeJob());
    const out = await runJob({
      jobId: 'job-1',
      api,
      pipeline: noopPipeline({
        verify: async () => {
          throw new Error('ci broken');
        },
      }),
    });
    expect(out.aborted).toBe(true);
    expect(out.finalState).toBe('refunding');
  });

  it('calls pipeline stages in order', async () => {
    const { api } = makeApi(makeJob());
    const calls: string[] = [];
    await runJob({
      jobId: 'job-1',
      api,
      pipeline: noopPipeline({
        analyze: async () => {
          calls.push('analyze');
          return {};
        },
        plan: async () => {
          calls.push('plan');
        },
        migrate: async () => {
          calls.push('migrate');
          return {};
        },
        verify: async () => {
          calls.push('verify');
        },
        createPR: async () => {
          calls.push('createPR');
          return { prUrl: 'u' };
        },
      }),
    });
    expect(calls).toEqual(['analyze', 'plan', 'migrate', 'verify', 'createPR']);
  });

  it('passes the repoFullName to analyze', async () => {
    const { api } = makeApi(makeJob({ repoFullName: 'octo/world' }));
    const analyze = vi.fn(async () => ({}));
    await runJob({
      jobId: 'job-1',
      api,
      pipeline: noopPipeline({ analyze }),
    });
    expect(analyze).toHaveBeenCalledWith('octo/world');
  });

  it('forwards analyze + migrate usage to recordUsage', async () => {
    const { api, usage } = makeApi(makeJob());
    await runJob({
      jobId: 'job-1',
      api,
      pipeline: noopPipeline({
        analyze: async () => ({
          usage: { tokensInput: 100, tokensOutput: 50, costUsd: 0.001 },
        }),
        migrate: async () => ({
          usage: { tokensInput: 1000, tokensOutput: 500, costUsd: 0.02 },
        }),
      }),
    });
    expect(usage).toHaveLength(2);
    expect(usage[0]).toEqual({ tokensInput: 100, tokensOutput: 50, costUsd: 0.001 });
    expect(usage[1]).toEqual({ tokensInput: 1000, tokensOutput: 500, costUsd: 0.02 });
  });

  // R1: 重複起動防止 — queued 以外で入った job は即座に拒否
  describe('R1: idempotency / refuse duplicate entry', () => {
    it.each([
      'analyzing',
      'planning',
      'migrating',
      'verifying',
      'pr_ready',
      'aborted_blocker',
      'refunding',
      'refunded',
    ] as const)('refuses to start when state is %s', async (state) => {
      const { api, transitions } = makeApi(makeJob({ state }));
      const out = await runJob({ jobId: 'job-1', api, pipeline: noopPipeline() });
      expect(out.aborted).toBe(true);
      expect(out.skippedDuplicate).toBe(true);
      expect(out.finalState).toBe(state);
      // 状態遷移は一切発生していない
      expect(transitions).toEqual([]);
    });

    it('still proceeds normally when state is queued', async () => {
      const { api } = makeApi(makeJob({ state: 'queued' }));
      const out = await runJob({ jobId: 'job-1', api, pipeline: noopPipeline() });
      expect(out.skippedDuplicate).toBeUndefined();
      expect(out.finalState).toBe('pr_ready');
    });
  });

  // R2: plan / migrate / createPR の予期せぬ例外でも terminal state で終わる
  describe('R2: mid-pipeline crash → aborted_blocker → refunding', () => {
    it('plan crash routes through aborted_blocker → refunding', async () => {
      const { api, transitions } = makeApi(makeJob());
      const out = await runJob({
        jobId: 'job-1',
        api,
        pipeline: noopPipeline({
          plan: async () => {
            throw new Error('plan blew up');
          },
        }),
      });
      expect(out.aborted).toBe(true);
      expect(out.finalState).toBe('refunding');
      expect(transitions.map((t) => t.toState)).toEqual([
        'analyzing',
        'planning',
        'aborted_blocker',
        'refunding',
      ]);
      expect(transitions[2]?.reason).toMatch(/plan crashed/);
    });

    it('migrate crash routes through aborted_blocker → refunding', async () => {
      const { api, transitions } = makeApi(makeJob());
      const out = await runJob({
        jobId: 'job-1',
        api,
        pipeline: noopPipeline({
          migrate: async () => {
            throw new Error('migrate blew up');
          },
        }),
      });
      expect(out.aborted).toBe(true);
      expect(out.finalState).toBe('refunding');
      expect(transitions.map((t) => t.toState)).toEqual([
        'analyzing',
        'planning',
        'migrating',
        'aborted_blocker',
        'refunding',
      ]);
      expect(transitions[3]?.reason).toMatch(/migrate crashed/);
    });

    it('createPR crash routes through aborted_blocker → refunding', async () => {
      const { api, transitions } = makeApi(makeJob());
      const out = await runJob({
        jobId: 'job-1',
        api,
        pipeline: noopPipeline({
          createPR: async () => {
            throw new Error('git push 403');
          },
        }),
      });
      expect(out.aborted).toBe(true);
      expect(out.finalState).toBe('refunding');
      expect(transitions.map((t) => t.toState)).toEqual([
        'analyzing',
        'planning',
        'migrating',
        'verifying',
        'aborted_blocker',
        'refunding',
      ]);
      expect(transitions[4]?.reason).toMatch(/createPR crashed/);
    });
  });

  // R4: cleanup は成功・失敗・例外いずれの経路でも呼ばれる
  describe('R4: pipeline.cleanup is always invoked in finally', () => {
    it('calls cleanup on the success path', async () => {
      const { api } = makeApi(makeJob());
      let cleanupCalls = 0;
      await runJob({
        jobId: 'job-1',
        api,
        pipeline: noopPipeline({
          cleanup: async () => {
            cleanupCalls += 1;
          },
        }),
      });
      expect(cleanupCalls).toBe(1);
    });

    it('calls cleanup when analyze throws', async () => {
      const { api } = makeApi(makeJob());
      let cleanupCalls = 0;
      await runJob({
        jobId: 'job-1',
        api,
        pipeline: noopPipeline({
          analyze: async () => {
            throw new Error('boom');
          },
          cleanup: async () => {
            cleanupCalls += 1;
          },
        }),
      });
      expect(cleanupCalls).toBe(1);
    });

    it('calls cleanup when verify throws', async () => {
      const { api } = makeApi(makeJob());
      let cleanupCalls = 0;
      await runJob({
        jobId: 'job-1',
        api,
        pipeline: noopPipeline({
          verify: async () => {
            throw new Error('ci broken');
          },
          cleanup: async () => {
            cleanupCalls += 1;
          },
        }),
      });
      expect(cleanupCalls).toBe(1);
    });

    it('swallows cleanup failures so they do not overwrite the job outcome', async () => {
      const { api } = makeApi(makeJob());
      const out = await runJob({
        jobId: 'job-1',
        api,
        pipeline: noopPipeline({
          cleanup: async () => {
            throw new Error('rm -rf failed');
          },
        }),
      });
      expect(out.finalState).toBe('pr_ready');
      expect(out.aborted).toBe(false);
    });

    it('does not call cleanup when refusing duplicate entry (no resources allocated yet)', async () => {
      const { api } = makeApi(makeJob({ state: 'pr_ready' }));
      let cleanupCalls = 0;
      const out = await runJob({
        jobId: 'job-1',
        api,
        pipeline: noopPipeline({
          cleanup: async () => {
            cleanupCalls += 1;
          },
        }),
      });
      expect(out.skippedDuplicate).toBe(true);
      expect(cleanupCalls).toBe(0);
    });
  });
});
