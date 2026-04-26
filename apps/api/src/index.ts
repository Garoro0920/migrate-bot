import { createApp } from './app';

// Cloudflare Workers entry. Bindings は wrangler.toml で注入される (Phase 2 後半)。
const app = createApp();

export default app;
