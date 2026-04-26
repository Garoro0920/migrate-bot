import { describe, expect, it } from 'vitest';
import { InMemoryQueue, type JobQueueMessage } from '../queue';

describe('InMemoryQueue', () => {
  it('starts empty', () => {
    const q = new InMemoryQueue<JobQueueMessage>();
    expect(q.size()).toBe(0);
  });

  it('send adds messages with monotonically increasing ids', async () => {
    const q = new InMemoryQueue<JobQueueMessage>();
    await q.send({ jobId: 'j1', installationId: 1, traceId: 't1' });
    await q.send({ jobId: 'j2', installationId: 2, traceId: 't2' });
    expect(q.size()).toBe(2);
    const messages = q.drain();
    expect(messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
    expect(messages[0]?.body.jobId).toBe('j1');
    expect(messages[1]?.body.jobId).toBe('j2');
  });

  it('sendBatch accepts multiple bodies in order', async () => {
    const q = new InMemoryQueue<JobQueueMessage>();
    await q.sendBatch([
      { jobId: 'a', installationId: 1, traceId: 'ta' },
      { jobId: 'b', installationId: 1, traceId: 'tb' },
      { jobId: 'c', installationId: 2, traceId: 'tc' },
    ]);
    expect(q.size()).toBe(3);
    expect(q.drain().map((m) => m.body.jobId)).toEqual(['a', 'b', 'c']);
  });

  it('drain empties the store', async () => {
    const q = new InMemoryQueue<JobQueueMessage>();
    await q.send({ jobId: 'x', installationId: 1, traceId: 'tx' });
    expect(q.drain()).toHaveLength(1);
    expect(q.size()).toBe(0);
    expect(q.drain()).toEqual([]);
  });

  it('messages start with attempts=0', async () => {
    const q = new InMemoryQueue<JobQueueMessage>();
    await q.send({ jobId: 'x', installationId: 1, traceId: 'tx' });
    const [msg] = q.drain();
    expect(msg?.attempts).toBe(0);
  });
});
