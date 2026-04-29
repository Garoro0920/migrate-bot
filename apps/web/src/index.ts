import { withSentry } from '@sentry/cloudflare';
import { type AppContext, createApp } from './app';

// Cloudflare Workers entry。bindings は wrangler.toml で注入される。
// Sentry: SENTRY_DSN env が設定されていれば例外送信。未設定なら enabled:false。

const app = createApp();

type WorkerEnv = AppContext['Bindings'] & {
  readonly SENTRY_DSN?: string;
  readonly ENVIRONMENT?: string;
};

const handler = {
  fetch: (req: Request, env: WorkerEnv, ctx: ExecutionContext) => app.fetch(req, env, ctx),
};

export default withSentry(
  (env: WorkerEnv) => ({
    dsn: env.SENTRY_DSN,
    enabled: Boolean(env.SENTRY_DSN),
    environment: env.ENVIRONMENT ?? 'dev',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    maxBreadcrumbs: 50,
  }),
  handler,
);
