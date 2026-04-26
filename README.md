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

CLI（骨格）:

```sh
corepack pnpm --filter @migrate-bot/cli migrate <repo-url>
```

## ディレクトリ構成

```
apps/
  cli/        # 開発・運用用 CLI（Phase 1）
packages/
  agent/      # Migration Agent パイプライン（Analyze + Plan + Migrate + Verify）
docs/         # 設計ドキュメント
```

将来追加予定: `apps/api` `apps/web` `apps/runner` `packages/db` `packages/shared` `packages/eval`（`docs/architecture.md` §4 参照）。
