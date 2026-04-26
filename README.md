# migrate-bot

Next.js Pages Router → App Router 自動移行 GitHub App.

詳細な憲章は [`CLAUDE.md`](./CLAUDE.md)、各種仕様は [`docs/`](./docs/) を参照。

## 開発（Phase 1: ローカル PoC）

要件: Node.js 22 LTS、corepack 有効化済み。

```sh
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
```

## CLI

```sh
# Analyze 段階（LLM スキップ、API キー不要）
corepack pnpm --filter @migrate-bot/cli analyze --no-llm \
  packages/agent/test-fixtures/pages-router-minimal

# Analyze 段階（LLM ファイル分類あり、API キー必要）
ANTHROPIC_API_KEY=sk-... corepack pnpm --filter @migrate-bot/cli analyze \
  /path/to/some/next-pages-router-repo

# 全パイプライン（骨格、未実装）
corepack pnpm --filter @migrate-bot/cli migrate <repo-url>

# API 累計コスト確認（ADR-0002 §1.1 kill criteria 進捗）
corepack pnpm --filter @migrate-bot/cli exec tsx src/index.ts stats
```

## API キー設定

LLM 呼び出しを伴う Analyze 実行には Anthropic API キーが必要。
プロジェクトルートの `.env.local.example` を `.env.local` にコピーし、API キーを記入する。
CLI 起動時に **`.env.local` は自動読み込み**される（毎セッション env を手動でセットする必要はない）。

```sh
# bash
cp .env.local.example .env.local
# PowerShell
Copy-Item .env.local.example .env.local
```

その後エディタで `ANTHROPIC_API_KEY` の値を本物のキーに置き換える。
`.env.local` は `.gitignore` で除外済み。

ADR-0002 §1 の kill criteria（累計 API コスト $30 で評価、$80 で強制停止）に
従い、初期段階は Haiku（最も安価）のみで運用する。コスト監視は `.migrate-bot/usage.jsonl`
（プロジェクトルート相対）に追記され、`stats` コマンドで確認できる。

## ディレクトリ構成

```
apps/
  cli/        # 開発・運用用 CLI（Phase 1）
packages/
  agent/      # Migration Agent パイプライン
docs/
  prompts/    # agent プロンプト原本（バージョン管理）
  decisions/  # ADR
```

将来追加予定: `apps/api` `apps/web` `apps/runner` `packages/db` `packages/shared` `packages/eval`（`docs/architecture.md` §4 参照）。
