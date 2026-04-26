import { describe, expect, it } from 'vitest';
import { InMemoryJobStore } from '../job-store';

describe('InMemoryJobStore', () => {
  it('seeds and loads a job', async () => {
    const store = new InMemoryJobStore();
    store.seed({
      id: 'j',
      traceId: 't',
      repoFullName: 'a/b',
      state: 'queued',
      costUsd: 0,
    });
    const j = await store.load('j');
    expect(j.state).toBe('queued');
  });

  it('throws when loading unknown job', async () => {
    const store = new InMemoryJobStore();
    await expect(store.load('missing')).rejects.toThrow(/not found/);
  });

  it('records state on valid transition', async () => {
    const store = new InMemoryJobStore();
    store.seed({ id: 'j', traceId: 't', repoFullName: 'a/b', state: 'queued', costUsd: 0 });
    const r = await store.transition({ jobId: 'j', toState: 'analyzing', reason: 'go' });
    expect(r.state).toBe('analyzing');
  });

  it('throws on invalid transition', async () => {
    const store = new InMemoryJobStore();
    store.seed({ id: 'j', traceId: 't', repoFullName: 'a/b', state: 'queued', costUsd: 0 });
    await expect(
      store.transition({ jobId: 'j', toState: 'pr_ready', reason: 'skip' }),
    ).rejects.toThrow(/invalid job state transition/);
  });
});
