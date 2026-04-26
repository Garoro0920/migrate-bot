import { InMemoryQueue, type JobQueueMessage } from '@migrate-bot/shared';
import { describe, expect, it, vi } from 'vitest';
import { runAdminTrigger } from '../commands/admin-trigger';

describe('cli admin-trigger', () => {
  it('returns 1 when args are missing', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger([]);
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('returns 1 when installationId is not numeric', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['not-a-number', 'octocat/hello']);
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('enqueues a job message and prints a summary', async () => {
    const queue = new InMemoryQueue<JobQueueMessage>();
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['42', 'octocat/hello'], { queue });
    expect(code).toBe(0);
    expect(queue.size()).toBe(1);
    const messages = queue.drain();
    expect(messages[0]?.body.installationId).toBe(42);
    expect(messages[0]?.body.jobId).toMatch(/^[0-9a-f-]{36}$/);
    expect(messages[0]?.body.traceId).toMatch(/^[0-9a-f-]{36}$/);
    stdout.mockRestore();
  });

  it('emits JSON output with --json', async () => {
    const queue = new InMemoryQueue<JobQueueMessage>();
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['--json', '42', 'octocat/hello'], { queue });
    expect(code).toBe(0);
    const written = stdout.mock.calls
      .map((call) => {
        const first = call[0];
        if (typeof first === 'string') return first;
        if (first instanceof Uint8Array) return Buffer.from(first).toString('utf-8');
        return '';
      })
      .join('');
    const parsed = JSON.parse(written) as { plan: string; state: string };
    expect(parsed.plan).toBe('small');
    expect(parsed.state).toBe('queued');
    stdout.mockRestore();
  });

  it('accepts --plan medium', async () => {
    const queue = new InMemoryQueue<JobQueueMessage>();
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runAdminTrigger(['--json', '--plan', 'medium', '42', 'octocat/hello'], {
      queue,
    });
    expect(code).toBe(0);
    const written = stdout.mock.calls
      .map((call) => {
        const first = call[0];
        if (typeof first === 'string') return first;
        if (first instanceof Uint8Array) return Buffer.from(first).toString('utf-8');
        return '';
      })
      .join('');
    const parsed = JSON.parse(written) as { plan: string };
    expect(parsed.plan).toBe('medium');
    stdout.mockRestore();
  });
});
