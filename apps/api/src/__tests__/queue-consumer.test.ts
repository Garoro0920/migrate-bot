import type { JobQueueMessage } from '@migrate-bot/shared';
import { describe, expect, it, vi } from 'vitest';
import type { FlyApiClient, FlyMachineCreateRequest } from '../fly';
import {
  handleQueueBatch,
  type MessageBatch,
  processJobMessage,
  type QueueConsumerEnv,
} from '../queue-consumer';

const ENV: QueueConsumerEnv = {
  FLY_API_TOKEN: 'fly-token',
  FLY_APP_NAME: 'migrate-bot-runner-dev',
  RUNNER_IMAGE: 'registry.fly.io/migrate-bot-runner-dev:latest',
  INTERNAL_API_TOKEN: 'internal-secret',
  INTERNAL_API_URL: 'https://api.example.com',
};

function makeFlyStub(): {
  client: FlyApiClient;
  calls: FlyMachineCreateRequest[];
} {
  const calls: FlyMachineCreateRequest[] = [];
  const client: FlyApiClient = {
    createMachine: async (req) => {
      calls.push(req);
      return { id: `m-${calls.length}`, name: req.name ?? 'unnamed', state: 'started' };
    },
    getMachine: async (id) => ({ id, name: id, state: 'started' }),
  };
  return { client, calls };
}

describe('processJobMessage', () => {
  it('passes JOB_ID + INTERNAL_API_TOKEN/URL to the spawned machine', async () => {
    const { client, calls } = makeFlyStub();
    const body: JobQueueMessage = {
      jobId: '11111111-2222-3333-4444-555555555555',
      installationId: 42,
      traceId: '99999999-8888-7777-6666-555555555555',
    };
    const result = await processJobMessage(body, ENV, { fly: client });
    expect(result.machineId).toBe('m-1');

    expect(calls).toHaveLength(1);
    const sent = calls[0];
    expect(sent?.config.image).toBe(ENV.RUNNER_IMAGE);
    expect(sent?.config.env?.JOB_ID).toBe(body.jobId);
    expect(sent?.config.env?.TRACE_ID).toBe(body.traceId);
    expect(sent?.config.env?.INTERNAL_API_TOKEN).toBe(ENV.INTERNAL_API_TOKEN);
    expect(sent?.config.env?.INTERNAL_API_URL).toBe(ENV.INTERNAL_API_URL);
    expect(sent?.config.auto_destroy).toBe(true);
    expect(sent?.config.restart?.policy).toBe('no');
  });
});

describe('handleQueueBatch', () => {
  function makeMessage(jobId: string): {
    msg: MessageBatch<JobQueueMessage>['messages'][number];
    ack: ReturnType<typeof vi.fn>;
    retry: ReturnType<typeof vi.fn>;
  } {
    const ack = vi.fn();
    const retry = vi.fn();
    return {
      ack,
      retry,
      msg: {
        id: `msg-${jobId}`,
        body: { jobId, installationId: 1, traceId: 't' },
        ack,
        retry,
      },
    };
  }

  it('acks each message after successful processing', async () => {
    const { client } = makeFlyStub();
    const a = makeMessage('a');
    const b = makeMessage('b');
    await handleQueueBatch({ queue: 'migrate-bot-jobs', messages: [a.msg, b.msg] }, ENV, {
      fly: client,
    });
    expect(a.ack).toHaveBeenCalled();
    expect(b.ack).toHaveBeenCalled();
    expect(a.retry).not.toHaveBeenCalled();
  });

  it('retries on processJobMessage failure (Fly API throws)', async () => {
    const failingClient: FlyApiClient = {
      createMachine: async () => {
        throw new Error('fly down');
      },
      getMachine: async () => ({ id: '', name: '', state: '' }),
    };
    const a = makeMessage('a');
    await handleQueueBatch({ queue: 'migrate-bot-jobs', messages: [a.msg] }, ENV, {
      fly: failingClient,
    });
    expect(a.ack).not.toHaveBeenCalled();
    expect(a.retry).toHaveBeenCalledWith({ delaySeconds: 30 });
  });

  it('continues processing after one message fails', async () => {
    let called = 0;
    const mixedClient: FlyApiClient = {
      createMachine: async () => {
        called += 1;
        if (called === 1) throw new Error('first one fails');
        return { id: `m-${called}`, name: 'n', state: 'started' };
      },
      getMachine: async () => ({ id: '', name: '', state: '' }),
    };
    const a = makeMessage('a');
    const b = makeMessage('b');
    await handleQueueBatch({ queue: 'migrate-bot-jobs', messages: [a.msg, b.msg] }, ENV, {
      fly: mixedClient,
    });
    expect(a.retry).toHaveBeenCalled();
    expect(b.ack).toHaveBeenCalled();
  });
});
