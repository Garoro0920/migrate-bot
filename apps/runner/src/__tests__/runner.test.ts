import { describe, expect, it, vi } from 'vitest';
import { InMemoryJobStore } from '../job-store';
import { type PipelineRunner, runJob } from '../runner';

function noopPipeline(overrides: Partial<PipelineRunner> = {}): PipelineRunner {
  return {
    analyze: async () => {},
    plan: async () => {},
    migrate: async () => {},
    verify: async () => {},
    ...overrides,
  };
}

function seed(state: 'queued' = 'queued', id = 'job-1') {
  const store = new InMemoryJobStore();
  store.seed({
    id,
    traceId: 'trace-1',
    repoFullName: 'octocat/hello',
    state,
    costUsd: 0,
  });
  return { store, id };
}

describe('runJob', () => {
  it('runs the happy path through pr_ready', async () => {
    const { store, id } = seed();
    const out = await runJob({ jobId: id, store, pipeline: noopPipeline() });
    expect(out.finalState).toBe('pr_ready');
    expect(out.aborted).toBe(false);
  });

  it('records aborted_blocker -> refunding when analyze throws', async () => {
    const { store, id } = seed();
    const out = await runJob({
      jobId: id,
      store,
      pipeline: noopPipeline({
        analyze: async () => {
          throw new Error('blocker detected');
        },
      }),
    });
    expect(out.aborted).toBe(true);
    expect(out.finalState).toBe('refunding');
  });

  it('records failed_ci -> refunding when verify throws', async () => {
    const { store, id } = seed();
    const out = await runJob({
      jobId: id,
      store,
      pipeline: noopPipeline({
        verify: async () => {
          throw new Error('ci failed');
        },
      }),
    });
    expect(out.aborted).toBe(true);
    expect(out.finalState).toBe('refunding');
  });

  it('calls pipeline stages in order', async () => {
    const { store, id } = seed();
    const calls: string[] = [];
    await runJob({
      jobId: id,
      store,
      pipeline: noopPipeline({
        analyze: async () => {
          calls.push('analyze');
        },
        plan: async () => {
          calls.push('plan');
        },
        migrate: async () => {
          calls.push('migrate');
        },
        verify: async () => {
          calls.push('verify');
        },
      }),
    });
    expect(calls).toEqual(['analyze', 'plan', 'migrate', 'verify']);
  });

  it('passes the repoFullName to analyze', async () => {
    const { store, id } = seed();
    const analyze = vi.fn(async () => {});
    await runJob({
      jobId: id,
      store,
      pipeline: noopPipeline({ analyze }),
    });
    expect(analyze).toHaveBeenCalledWith('octocat/hello');
  });
});
