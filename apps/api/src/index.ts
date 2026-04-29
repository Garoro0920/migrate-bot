import { withSentry } from '@sentry/cloudflare';
import type { JobQueueMessage } from '@migrate-bot/shared';
import { type AppEnv, createApp } from './app';
import { handleQueueBatch, type MessageBatch, type QueueConsumerEnv } from './queue-consumer';

// Cloudflare Workers entry。bindings は wrangler.toml で注入される。
// fetch (HTTP) と queue (consumer) の両ハンドラを export。
//
// Sentry: SENTRY_DSN env が設定されていれば例外送信。未設定なら enabled:false で
// no-op (withSentry は handler を pass-through するだけになる)。

const app = createApp();

type WorkerEnv = AppEnv['Bindings'] &
  QueueConsumerEnv & { readonly SENTRY_DSN?: string; readonly ENVIRONMENT?: string };

const handler = {
  fetch: (req: Request, env: WorkerEnv, ctx: ExecutionContext) => app.fetch(req, env, ctx),
  // withSentry の queue 型は Cloudflare の MessageBatch<unknown> を要求するので
  // 内部で扱う JobQueueMessage shape の MessageBatch に cast する。runtime では
  // ExecutionContext から流れてくる JSON が JobQueueMessage の形になっている。
  queue: (batch: MessageBatch<unknown>, env: WorkerEnv) =>
    handleQueueBatch(batch as MessageBatch<JobQueueMessage>, env),
};

export default withSentry(
  (env: WorkerEnv) => ({
    dsn: env.SENTRY_DSN,
    enabled: Boolean(env.SENTRY_DSN),
    environment: env.ENVIRONMENT ?? 'dev',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    // 個別 PII (Stripe webhook の payment_intent_id 等) を不用意に送らない
    // ように、breadcrumbs は最小に。本格運用時に調整。
    maxBreadcrumbs: 50,
  }),
  handler,
);
