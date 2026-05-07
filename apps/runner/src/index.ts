// Fly.io Machine entry。consumer Worker から machine が起動されると、
// 以下の env が注入される:
//   - JOB_ID            このジョブの UUID
//   - INTERNAL_API_TOKEN apps/api /internal 認証用 Bearer
//   - INTERNAL_API_URL   apps/api の origin (https://.../)
//   - ANTHROPIC_API_KEY  agent 用 (Phase 1 から共通)
//   - GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (Octokit 用)
//   - SENTRY_DSN        (任意) 例外送信先

import * as Sentry from '@sentry/node';
import { runApp } from './app';

// Sentry init は env を読む前に走らせる (env 読み込み中の例外も拾うため)。
// SENTRY_DSN が無ければ no-op。
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'dev',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    initialScope: {
      tags: {
        jobId: process.env.JOB_ID ?? 'unknown',
        traceId: process.env.TRACE_ID ?? 'unknown',
      },
    },
  });
}

runApp().then(
  (code) => process.exit(code),
  async (err: unknown) => {
    process.stderr.write(`runner fatal: ${String(err)}\n`);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
      // flush は send 中に process が exit するのを防ぐ。2s 待って終了。
      await Sentry.close(2000).catch(() => {});
    }
    process.exit(1);
  },
);
