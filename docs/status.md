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

なし（Phase 1 着手準備中）

## 直近の重要判断

- 2026-04-26: 単一 CLAUDE.md を分割構成に再編（v0.5）
- 2026-04-26: Phase 0 ヒアリング設計を ADR-0001 で確定（テンプレート一式作成済）
- 2026-04-26: ADR-0002 により Phase 0 を skip、Phase 1 に直行する判断（rationale: 学生期間中は技術検証を優先、市場検証は社会人以降）

## 次に着手すべきこと

`docs/roadmap.md` §1.2 のチェックリスト先頭から:

1. モノレポ初期化（pnpm + Turborepo）
2. `packages/agent` の骨格を作成（Analyze + Plan + Migrate + Verify の 4 段）
3. `apps/cli` の `pnpm migrate <repo-url>` エンドポイント
4. 検証対象 1 件目: `vercel/next.js` の `examples/with-typescript` を fork して動作確認
5. ADR-0002 §1 の kill criteria（コスト $30 / 4 週間 で進捗評価）を運用に組み込む

## 未解決の質問

- Phase 1 着手前に技術選定 ADR が必要な範囲（Claude Agent SDK のバージョン、moduleresolution、Turborepo or Nx 等）→ 着手時に都度判断

## 関連リンク

- 憲章: `CLAUDE.md`
- ロードマップ: `docs/roadmap.md`
- ADR-0002（Phase 0 skip 判断）: `docs/decisions/0002-skip-phase-0.md`
- ADR-0001（superseded、参照保持）: `docs/decisions/0001-market-validation.md`
- agent 設計: `docs/agent.md`
- アーキテクチャ: `docs/architecture.md`
