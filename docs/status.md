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

- Phase 1 §1.2 の「検証対象（小規模から順に）」着手準備（次セッション）

## 直近の重要判断

- 2026-04-26: 単一 CLAUDE.md を分割構成に再編（v0.5）
- 2026-04-26: Phase 0 ヒアリング設計を ADR-0001 で確定（テンプレート一式作成済）
- 2026-04-26: ADR-0002 により Phase 0 を skip、Phase 1 に直行する判断（rationale: 学生期間中は技術検証を優先、市場検証は社会人以降）
- 2026-04-26: モノレポ初期化（pnpm 10.33.2 + Turborepo 2.9.6 + TypeScript 6.0.3 + Biome 2.4.13 + Vitest 4.1.5）、`packages/agent` と `apps/cli` の骨格作成、typecheck/lint/test すべて green

## Phase 1 §1.2 の進捗

- [x] モノレポ初期化（pnpm + Turborepo）
- [x] `packages/agent` 骨格（Analyze + Plan + Migrate + Verify の 4 段、型定義、未実装 stub、unit test）
- [x] `apps/cli` 骨格（`pnpm migrate <repo-url>` エントリポイント、unit test）
- [ ] 検証対象（小規模から順に）:
  - [ ] `vercel/next.js` の `examples/with-typescript`
  - [ ] `vercel/next.js` の `examples/blog-starter`
  - [ ] 自作の中規模 sample repo（30〜100 ファイル）
- [ ] 出力 branch で `next build` と型検査が通る
- [ ] 1 ジョブのトークン使用量・所要時間・コストを計測しレポート
- [ ] `docs/business.md` §4.1 のコスト想定値を実測ベースで再評価

## 次に着手すべきこと

1. agent パイプラインの実装着手前に、Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) の最新仕様確認とプロンプト設計（`docs/prompts/`）
2. Analyze 段階の最初の実装（リポジトリ構造解析、blocker 検出）
3. ADR-0002 §1 kill criteria の監視仕組み（API コスト $30 アラートなど）

## 開発コマンド

要件: Node.js 22 LTS、corepack 有効化済み。pnpm は `node_modules/.bin/pnpm` 経由で
turbo/pnpm が PATH 解決できる構成。

```sh
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm --filter @migrate-bot/cli migrate <repo-url>
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
