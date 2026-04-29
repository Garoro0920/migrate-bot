# Runbook: dev D1 の d1_migrations 表を backfill する

> 対象: `migrate-bot-dev` D1 (Phase 2/3 で migration を手動適用したもの)
> 目的: 今後 `wrangler d1 migrations apply` を使えるようにする
> 実行頻度: 一度だけ

## 背景

Phase 2 / Phase 3 で D1 schema は手動で適用した:

```powershell
# 過去にやった作業
wrangler d1 execute migrate-bot-dev --remote --file=packages/db/migrations/0000_initial.sql
wrangler d1 execute migrate-bot-dev --remote --file=packages/db/migrations/0001_orders.sql
```

その後 `apps/api/wrangler.toml` に `migrations_dir = "../../packages/db/migrations"` を
追加したので、本来なら以下で全 migration が自動適用される:

```powershell
cd apps/api
corepack pnpm exec wrangler d1 migrations apply migrate-bot-dev --remote
```

しかし wrangler は **`d1_migrations` メタ表** で適用済みファイルを track しており、
dev DB ではこの表が空(または存在しない)状態。そのまま実行すると wrangler は
`0000_initial.sql` と `0001_orders.sql` を re-apply しようとして
`CREATE TABLE customers ... already exists` で fail する。

## 対処: backfill 手順

### Step 1. d1_migrations 表の状態を確認

```powershell
cd apps/api
corepack pnpm exec wrangler d1 execute migrate-bot-dev --remote `
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations'"
```

- 結果が空 → Step 2a に進む(表自体が存在しない)
- 結果に `d1_migrations` が含まれる → Step 2b に進む(表は存在、中身が問題)

### Step 2a. 表を作成 + 過去 migration を applied として記録

```powershell
corepack pnpm exec wrangler d1 execute migrate-bot-dev --remote `
  --command "CREATE TABLE IF NOT EXISTS d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0000_initial.sql'), ('0001_orders.sql');"
```

### Step 2b. 既に表がある場合は INSERT のみ

```powershell
corepack pnpm exec wrangler d1 execute migrate-bot-dev --remote `
  --command "INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0000_initial.sql'), ('0001_orders.sql');"
```

### Step 3. 検証

```powershell
corepack pnpm exec wrangler d1 execute migrate-bot-dev --remote `
  --command "SELECT name, applied_at FROM d1_migrations ORDER BY id"
```

`0000_initial.sql` と `0001_orders.sql` が表示されれば成功。

### Step 4. 今後の運用

新規 migration を追加した時:

```powershell
# packages/db/src/schema.ts を編集後
cd packages/db
corepack pnpm exec drizzle-kit generate --name=<change_description>

# 新しい 000X_xxx.sql が生成される
cd ../../apps/api
corepack pnpm exec wrangler d1 migrations apply migrate-bot-dev --remote
# wrangler が 000X_xxx.sql のみを apply、0000 / 0001 は skip される
```

## 注意

- `d1_migrations` の正確な schema は wrangler の実装に依存。Step 1 の確認結果で
  実際に使われている DDL を見て、必要に応じて columns を合わせる
- wrangler が要求する column が違っていた場合は ALTER TABLE で調整
- prod DB (`migrate-bot-prod`) はクリーンスレートで作られるためこの backfill は
  不要 — `wrangler d1 migrations apply` がそのまま全 migration を順番に適用する

## 関連

- `packages/db/migrations/` — 全 migration ファイル
- `apps/api/wrangler.toml` — `migrations_dir` 設定
- `docs/phase-4-deployment.md` §7.4 — prod migration 適用手順
