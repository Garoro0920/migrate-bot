import type { Config } from 'drizzle-kit';

// 本番は Cloudflare D1。schema 生成は同じ SQLite dialect で OK。
export default {
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
} satisfies Config;
