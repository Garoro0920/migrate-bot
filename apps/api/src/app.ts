import { Hono } from 'hono';
import { type GitHubWebhookContext, handleGitHubWebhook } from './webhooks/github';

export interface AppEnv extends GitHubWebhookContext {
  Bindings: GitHubWebhookContext['Bindings'];
}

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get('/health', (c) => c.json({ ok: true, service: 'migrate-bot-api' }));

  app.post('/webhooks/github', handleGitHubWebhook);

  app.notFound((c) => c.json({ error: 'not found' }, 404));

  return app;
}
