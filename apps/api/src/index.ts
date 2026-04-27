import type { JobQueueMessage } from '@migrate-bot/shared';
import { type AppEnv, createApp } from './app';
import { handleQueueBatch, type MessageBatch, type QueueConsumerEnv } from './queue-consumer';

// Cloudflare Workers entry。bindings は wrangler.toml で注入される。
// fetch (HTTP) と queue (consumer) の両ハンドラを export。

const app = createApp();

type WorkerEnv = AppEnv['Bindings'] & QueueConsumerEnv;

export default {
  fetch: (req: Request, env: WorkerEnv, ctx: ExecutionContext) => app.fetch(req, env, ctx),
  queue: (batch: MessageBatch<JobQueueMessage>, env: WorkerEnv) => handleQueueBatch(batch, env),
};
