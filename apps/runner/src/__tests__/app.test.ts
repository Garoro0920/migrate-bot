import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMemoryWatchdog, installShutdownHandler } from '../app';
import type { InternalApiClient, RemoteJob } from '../internal-api';

// R5: SIGTERM handler の挙動を unit テストする。
// process.emit('SIGTERM') を直接呼ぶと vitest プロセスが exit してしまうので、
// installShutdownHandler が実装している detach 関数で確実に handler を外せること、
// 内部の transition 呼び出しが正しい順序で行われることを確認する。
//
// 具体的なシグナル handler の挙動は process.exit を spy して検証する。

function makeApi(): {
  api: InternalApiClient;
  transitions: Array<{ toState: string; reason: string }>;
} {
  const transitions: Array<{ toState: string; reason: string }> = [];
  const dummyJob: RemoteJob = {
    id: 'job-1',
    installationId: 'inst-1',
    githubInstallationId: 1,
    customerId: null,
    repoFullName: 'o/r',
    plan: 'small',
    state: 'queued',
    traceId: 't',
    tokensInput: 0,
    tokensOutput: 0,
    costUsd: 0,
    prUrl: null,
    errorCode: null,
    errorDetail: null,
    createdAt: 1,
    startedAt: null,
    completedAt: null,
  };
  const api: InternalApiClient = {
    loadJob: async () => dummyJob,
    transitionJob: async (input) => {
      transitions.push({ toState: input.toState, reason: input.reason });
    },
    recordUsage: async () => {},
  };
  return { api, transitions };
}

describe('installShutdownHandler (R5)', () => {
  const originalSigterm = process.listeners('SIGTERM').slice();
  const originalSigint = process.listeners('SIGINT').slice();

  afterEach(() => {
    // 念のため: テスト中に追加された handler を残さない
    for (const l of process.listeners('SIGTERM')) {
      if (!originalSigterm.includes(l)) process.off('SIGTERM', l);
    }
    for (const l of process.listeners('SIGINT')) {
      if (!originalSigint.includes(l)) process.off('SIGINT', l);
    }
    vi.restoreAllMocks();
  });

  it('registers SIGTERM and SIGINT listeners and detaches them on demand', () => {
    const { api } = makeApi();
    const beforeTerm = process.listenerCount('SIGTERM');
    const beforeInt = process.listenerCount('SIGINT');
    const detach = installShutdownHandler(api, 'job-1');
    expect(process.listenerCount('SIGTERM')).toBe(beforeTerm + 1);
    expect(process.listenerCount('SIGINT')).toBe(beforeInt + 1);
    detach();
    expect(process.listenerCount('SIGTERM')).toBe(beforeTerm);
    expect(process.listenerCount('SIGINT')).toBe(beforeInt);
  });

  it('on SIGTERM, transitions job through aborted_blocker → refunding then exits 143', async () => {
    const { api, transitions } = makeApi();
    const exitSpy = vi
      .spyOn(process, 'exit')
      // process.exit signature requires `never`; cast through unknown to satisfy TS.
      .mockImplementation(((_code?: number) => undefined as never) as never);

    const detach = installShutdownHandler(api, 'job-42');
    process.emit('SIGTERM' as NodeJS.Signals, 'SIGTERM' as NodeJS.Signals);

    // handler は async なので microtask flush を 2 段階待つ
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(transitions.map((t) => t.toState)).toEqual(['aborted_blocker', 'refunding']);
    expect(transitions[0]?.reason).toMatch(/SIGTERM/);
    expect(exitSpy).toHaveBeenCalledWith(143);

    detach();
  });

  it('a second signal during shutdown is ignored (shuttingDown guard)', async () => {
    const { api, transitions } = makeApi();
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(((_code?: number) => undefined as never) as never);

    const detach = installShutdownHandler(api, 'job-42');
    process.emit('SIGTERM' as NodeJS.Signals, 'SIGTERM' as NodeJS.Signals);
    process.emit('SIGTERM' as NodeJS.Signals, 'SIGTERM' as NodeJS.Signals);
    process.emit('SIGINT' as NodeJS.Signals, 'SIGINT' as NodeJS.Signals);

    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    // transition は 1 回分のシーケンス (aborted_blocker → refunding) のみ
    expect(transitions).toHaveLength(2);
    expect(exitSpy).toHaveBeenCalledTimes(1);
    detach();
  });

  it('swallows transition failures (job already terminal) and still exits', async () => {
    const transitions: Array<{ toState: string; reason: string }> = [];
    const api: InternalApiClient = {
      loadJob: async () => {
        throw new Error('not used');
      },
      transitionJob: async (input) => {
        transitions.push({ toState: input.toState, reason: input.reason });
        throw new Error('invalid transition: pr_ready -> aborted_blocker');
      },
      recordUsage: async () => {},
    };
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(((_code?: number) => undefined as never) as never);

    const detach = installShutdownHandler(api, 'job-1');
    process.emit('SIGTERM' as NodeJS.Signals, 'SIGTERM' as NodeJS.Signals);

    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(exitSpy).toHaveBeenCalledWith(143);
    detach();
  });
});

describe('installMemoryWatchdog (B5)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function makeUsage(rssMb: number): NodeJS.MemoryUsage {
    return {
      rss: rssMb * 1024 * 1024,
      heapTotal: 0,
      heapUsed: Math.floor(rssMb * 0.8) * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
    };
  }

  it('does not warn when rss is below threshold', () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    // 2048MB limit × 0.85 = 1740MB threshold; 500MB is well below
    const detach = installMemoryWatchdog({
      limitMb: 2048,
      thresholdRatio: 0.85,
      intervalMs: 1000,
      memoryUsage: () => makeUsage(500),
    });
    vi.advanceTimersByTime(5000);
    expect(stderr).not.toHaveBeenCalled();
    detach();
  });

  it('warns once when rss crosses the threshold', () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const detach = installMemoryWatchdog({
      limitMb: 2048,
      thresholdRatio: 0.85,
      intervalMs: 1000,
      memoryUsage: () => makeUsage(1800), // > 1740 threshold
    });
    vi.advanceTimersByTime(5000);
    // 5 ticks worth of intervals but only one warning
    expect(stderr).toHaveBeenCalledTimes(1);
    const written = stderr.mock.calls[0]?.[0];
    expect(typeof written).toBe('string');
    expect(written as string).toMatch(/runner memory high/);
    expect(written as string).toMatch(/rss=1800MB/);
    detach();
  });

  it('detach stops further checks', () => {
    const memoryUsage = vi.fn(() => makeUsage(100));
    const detach = installMemoryWatchdog({
      limitMb: 2048,
      thresholdRatio: 0.85,
      intervalMs: 1000,
      memoryUsage,
    });
    vi.advanceTimersByTime(2500);
    const callsBefore = memoryUsage.mock.calls.length;
    detach();
    vi.advanceTimersByTime(5000);
    expect(memoryUsage.mock.calls.length).toBe(callsBefore);
  });
});
