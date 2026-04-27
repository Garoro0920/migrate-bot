import { Hono } from 'hono';
import { type AdminContext, createAdminRouter } from './routes/admin';
import { type GitHubWebhookContext, handleGitHubWebhook } from './webhooks/github';

// 全 route の env / variables を統合した型。Hono の Bindings は intersection で
// マージできる。
export interface AppEnv {
  Bindings: GitHubWebhookContext['Bindings'] & AdminContext['Bindings'];
  Variables: GitHubWebhookContext['Variables'] & AdminContext['Variables'];
}

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get('/health', (c) => c.json({ ok: true, service: 'migrate-bot-api' }));

  app.post('/webhooks/github', handleGitHubWebhook);

  app.route('/admin', createAdminRouter());

  app.notFound((c) => c.json({ error: 'not found' }, 404));

  return app;
}
