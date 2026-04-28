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
  const fly =
    options.fly ??
    createFlyApiClient({
      appName: env.FLY_APP_NAME,
      apiToken: env.FLY_API_TOKEN,
      ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
    });

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
  return { machineId: machine.id };
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
  for (const message of batch.messages) {
    try {
      await processJobMessage(message.body, env, options);
      message.ack();
    } catch (err) {
      // log と retry。retry 上限は wrangler.toml で max_retries 指定
      // (Cloudflare 側で dead letter queue にも転送可能)
      console.error('queue consumer error', { jobId: message.body.jobId, error: err });
      message.retry({ delaySeconds: 30 });
    }
  }
}
