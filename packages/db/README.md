# @migrate-bot/db

Drizzle ORM ベースの DB スキーマと client。Cloudflare D1 (SQLite) を本番、
better-sqlite3 をテストに使う想定。

## 構成

- `src/schema.ts`: テーブル定義 (`docs/architecture.md` §5.1)。
  - installations / customers / jobs / job_events / refunds / eval_runs
- `src/index.ts`: 型・関数の re-export
- `drizzle.config.ts` (将来): drizzle-kit 用 (D1 driver)

## ローカルテスト

`better-sqlite3` でメモリ DB を使い、schema の整合性と CRUD を検証する。

## マイグレーション

```sh
corepack pnpm --filter @migrate-bot/db generate
```

で `migrations/` 配下に SQL を生成。本番 D1 へは wrangler 経由で apply
(Phase 2 後半でツール選定)。
