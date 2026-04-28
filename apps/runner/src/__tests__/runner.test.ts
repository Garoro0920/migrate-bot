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
});
