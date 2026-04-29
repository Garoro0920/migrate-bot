import { type AppContext, createApp } from './app';

// Cloudflare Workers entry。bindings は wrangler.toml で注入される。

const app = createApp();

export default {
  fetch: (req: Request, env: AppContext['Bindings'], ctx: ExecutionContext) =>
    app.fetch(req, env, ctx),
};
