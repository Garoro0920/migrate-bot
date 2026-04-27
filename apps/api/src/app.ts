import { Hono } from 'hono';
import { type AdminContext, createAdminRouter } from './routes/admin';
import { createInternalRouter, type InternalContext } from './routes/internal';
import { type GitHubWebhookContext, handleGitHubWebhook } from './webhooks/github';

// 全 route の env / variables を統合した型。Hono の Bindings は intersection で
// マージできる。
export interface AppEnv {
  Bindings: GitHubWebhookContext['Bindings'] &
    AdminContext['Bindings'] &
    InternalContext['Bindings'];
  Variables: GitHubWebhookContext['Variables'] &
    AdminContext['Variables'] &
    InternalContext['Variables'];
}

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get('/health', (c) => c.json({ ok: true, service: 'migrate-bot-api' }));

  app.post('/webhooks/github', handleGitHubWebhook);

  app.route('/admin', createAdminRouter());
  app.route('/internal', createInternalRouter());

  app.notFound((c) => c.json({ error: 'not found' }, 404));

  return app;
}
