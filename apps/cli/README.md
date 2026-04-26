# @migrate-bot/cli

開発・運用用 CLI（Phase 1 では骨格のみ）。

## 使い方

リポジトリルートで:

```sh
corepack pnpm --filter @migrate-bot/cli migrate <repo-url>
```

## 現状

- `migrate <repo-url>` のエントリポイントのみ存在
- agent パイプライン（`@migrate-bot/agent`）は骨格のため、実行すると "not implemented" を返す
- 実装は後続フェーズで段階的に追加（`docs/roadmap.md` §1.2）
