import type { JobQueueMessage } from '@migrate-bot/shared';
import { createFlyApiClient, type FlyApiClient } from './fly';

// Cloudflare Queues consumer ハンドラ。受信した JobQueueMessage ごとに
// Fly.io Machines API で runner machine を 1 回限り起動する。
//
// 失敗時は throw して queue 側に retry させる。

export interface QueueConsumerEnv {
  readonly FLY_API_TOKEN: string;
  readonly FLY_APP_NAME: string;
  readonly RUNNER_IMAGE: string;
  readonly INTERNAL_API_TOKEN: string;
  readonly INTERNAL_API_URL: string;
}

export interface ProcessJobOptions {
  readonly fly?: FlyApiClient;
  readonly fetch?: typeof fetch;
}

export async function processJobMessage(
  body: JobQueueMessage,
  env: QueueConsumerEnv,
  options: ProcessJobOptions = {},
): Promise<{ machineId: string }> {
  console.log('processJobMessage start', {
    jobId: body.jobId,
    flyAppName: env.FLY_APP_NAME,
    runnerImage: env.RUNNER_IMAGE,
    flyTokenLength: env.FLY_API_TOKEN?.length ?? 0,
    internalApiUrl: env.INTERNAL_API_URL,
  });

  const fly =
    options.fly ??
    createFlyApiClient({
      appName: env.FLY_APP_NAME,
      apiToken: env.FLY_API_TOKEN,
      ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
    });

  try {
    const machine = await fly.createMachine({
      name: `job-${body.jobId.slice(0, 18)}`,
      config: {
        image: env.RUNNER_IMAGE,
        env: {
          JOB_ID: body.jobId,
          TRACE_ID: body.traceId,
          INTERNAL_API_TOKEN: env.INTERNAL_API_TOKEN,
          INTERNAL_API_URL: env.INTERNAL_API_URL,
        },
        auto_destroy: true,
        restart: { policy: 'no' },
        guest: {
          cpu_kind: 'shared',
          cpus: 2,
          memory_mb: 2048,
        },
      },
    });
    console.log('processJobMessage machine created', {
      jobId: body.jobId,
      machineId: machine.id,
      machineState: machine.state,
    });
    return { machineId: machine.id };
  } catch (err) {
    console.error('processJobMessage createMachine failed', {
      jobId: body.jobId,
      error: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}

// Cloudflare Queues batch interface (binding 形状)
export interface QueueMessage<T> {
  readonly id: string;
  readonly body: T;
  readonly timestamp?: Date;
  readonly attempts?: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

export interface MessageBatch<T> {
  readonly queue: string;
  readonly messages: ReadonlyArray<QueueMessage<T>>;
}

export async function handleQueueBatch(
  batch: MessageBatch<JobQueueMessage>,
  env: QueueConsumerEnv,
  options: ProcessJobOptions = {},
): Promise<void> {
  console.log('handleQueueBatch invoked', {
    queue: batch.queue,
    messageCount: batch.messages.length,
  });
  for (const message of batch.messages) {
    try {
      const result = await processJobMessage(message.body, env, options);
      message.ack();
      console.log('handleQueueBatch message acked', {
        jobId: message.body.jobId,
        machineId: result.machineId,
      });
    } catch (err) {
      console.error('handleQueueBatch error', {
        jobId: message.body.jobId,
        error: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
      });
      message.retry({ delaySeconds: 30 });
    }
  }
}
