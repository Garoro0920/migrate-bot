# status.md — 現在のフェーズ・進行中タスク

> Last updated: 2026-04-26

各セッション開始時に Claude Code が読み、終了時に必要なら更新する。
履歴を残したい場合はコミットメッセージで充分（このファイルは最新状態のみ保持）。

---

## 現在のフェーズ

**Phase 1: ローカル PoC**

詳細 → `docs/roadmap.md` §1.2

注: Phase 0 は ADR-0002 により skip。市場検証は社会人化以降に再評価予定。

## 進行中タスク

- Phase 1 §1.2 「検証対象（小規模から順に）」: 1 件目 `vercel/next.js` の `examples/with-typescript` を実 API で Analyze 通過させる

## 直近の重要判断

- 2026-04-26: 単一 CLAUDE.md を分割構成に再編（v0.5）
- 2026-04-26: ADR-0002 により Phase 0 を skip、Phase 1 に直行（rationale: 学生期間中は技術検証を優先、市場検証は社会人以降）
- 2026-04-26: モノレポ初期化 + agent/cli 骨格 (commit `f9ed516`)
- 2026-04-26: Analyze 段階実装完了（repo-info, static blockers, sizing, Haiku ファイル分類）。fixture でテスト 23/23 green (commit `681f3b9`)
- 2026-04-26: 実 API 呼び出し成功（fixture を Haiku で正しく分類、4/4 一致）
- 2026-04-26: API コスト累計トラッキング実装（pricing, usage JSONL, stats CLI、ADR-0002 §1.1 kill criteria 進捗を可視化）

## Phase 1 §1.2 の進捗

- [x] モノレポ初期化（pnpm + Turborepo）
- [x] `packages/agent` 骨格 + Analyze 実装（repo-info / blockers / sizing / classify / orchestrator）
- [x] `apps/cli` 骨格 + analyze サブコマンド (`--no-llm` `--json` 対応)
- [x] テスト fixture (`packages/agent/test-fixtures/pages-router-minimal`)
- [x] docs/prompts/analyze-classify.md v0.1（Haiku 向け、frontmatter 規則準拠）
- [x] API コスト累計トラッキング (`packages/agent/src/observability/`、`.migrate-bot/usage.jsonl`、CLI `stats`)
- [x] 実 API での fixture 動作確認（4/4 正解、コスト 1 セント未満）
- [ ] 検証対象（実 API 利用、実リポジトリ）:
  - [ ] `vercel/next.js` の `examples/with-typescript`
  - [ ] `vercel/next.js` の `examples/blog-starter`
  - [ ] 自作の中規模 sample repo（30〜100 ファイル）
- [ ] Plan 段階実装
- [ ] Migrate 段階実装
- [ ] Verify 段階実装（出力 branch で `next build` と型検査が通る）
- [ ] 1 ジョブのトークン使用量・所要時間・コストを計測しレポート
- [ ] `docs/business.md` §4.1 のコスト想定値を実測ベースで再評価

## 次に着手すべきこと

1. `vercel/next.js` の `examples/with-typescript` を `cloneRepo` で取得 → analyze 実行（実リポジトリでの初回検証）
2. `pricing.ts` の MODEL_PRICING 値を https://www.anthropic.com/pricing で検証・最新化
3. Plan 段階のプロンプト設計と実装着手

## 開発コマンド

要件: Node.js 22 LTS、corepack 有効化済み。

```sh
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test

# Analyze 実行（LLM スキップ、API キー不要）
corepack pnpm --filter @migrate-bot/cli exec tsx src/index.ts analyze \
  --no-llm "$(pwd)/packages/agent/test-fixtures/pages-router-minimal"

# Analyze 実行（LLM 利用、ANTHROPIC_API_KEY が必要）
ANTHROPIC_API_KEY=sk-... corepack pnpm --filter @migrate-bot/cli exec tsx src/index.ts analyze \
  /path/to/repo

# 累計コストと kill criteria 進捗を確認 (ADR-0002 §1.1)
corepack pnpm --filter @migrate-bot/cli exec tsx src/index.ts stats
```

## 未解決の質問

- Phase 1 着手前に技術選定 ADR が必要な範囲（Claude Agent SDK のバージョン、moduleresolution、Turborepo or Nx 等）→ 着手時に都度判断

## 関連リンク

- 憲章: `CLAUDE.md`
- ロードマップ: `docs/roadmap.md`
- ADR-0002（Phase 0 skip 判断）: `docs/decisions/0002-skip-phase-0.md`
- ADR-0001（superseded、参照保持）: `docs/decisions/0001-market-validation.md`
- agent 設計: `docs/agent.md`
- アーキテクチャ: `docs/architecture.md`
