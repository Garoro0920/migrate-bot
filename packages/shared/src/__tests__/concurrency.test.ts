import { describe, expect, it, vi } from 'vitest';
import { retryWithBackoff, Semaphore } from '../concurrency';

describe('Semaphore', () => {
  it('limits concurrency to the configured permits', async () => {
    const sem = new Semaphore(2);
    let active = 0;
    let peak = 0;
    const work = async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 10));
      active -= 1;
    };
    await Promise.all([sem.run(work), sem.run(work), sem.run(work), sem.run(work)]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('throws on non-positive permits', () => {
    expect(() => new Semaphore(0)).toThrow();
    expect(() => new Semaphore(-1)).toThrow();
  });

  it('serial execution with permits=1', async () => {
    const sem = new Semaphore(1);
    const order: number[] = [];
    await Promise.all([
      sem.run(async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push(1);
      }),
      sem.run(async () => {
        order.push(2);
      }),
    ]);
    expect(order).toEqual([1, 2]);
  });
});

describe('retryWithBackoff', () => {
  it('returns immediately on success', async () => {
    let calls = 0;
    const result = await retryWithBackoff(async () => {
      calls += 1;
      return 42;
    });
    expect(result).toBe(42);
    expect(calls).toBe(1);
  });

  it('retries up to maxAttempts then throws the last error', async () => {
    let calls = 0;
    const sleep = vi.fn(async () => {});
    await expect(
      retryWithBackoff(
        async () => {
          calls += 1;
          throw new Error(`fail ${calls}`);
        },
        { maxAttempts: 3, sleep },
      ),
    ).rejects.toThrow(/fail 3/);
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('uses exponential delay capped by maxDelayMs', async () => {
    const delays: number[] = [];
    const sleep = async (ms: number) => {
      delays.push(ms);
    };
    await expect(
      retryWithBackoff(
        async () => {
          throw new Error('boom');
        },
        { maxAttempts: 4, baseDelayMs: 100, maxDelayMs: 250, sleep },
      ),
    ).rejects.toThrow(/boom/);
    expect(delays).toEqual([100, 200, 250]);
  });

  it('stops retrying when isRetryable returns false', async () => {
    let calls = 0;
    await expect(
      retryWithBackoff(
        async () => {
          calls += 1;
          throw new Error('fatal');
        },
        { maxAttempts: 5, isRetryable: () => false, sleep: async () => {} },
      ),
    ).rejects.toThrow(/fatal/);
    expect(calls).toBe(1);
  });

  it('returns success after intermittent failure', async () => {
    let calls = 0;
    const result = await retryWithBackoff(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error('try again');
        return 'ok';
      },
      { maxAttempts: 5, baseDelayMs: 1, sleep: async () => {} },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });
});
