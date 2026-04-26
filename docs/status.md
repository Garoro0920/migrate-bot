# status.md — 現在のフェーズ・進行中タスク

> Last updated: 2026-04-26

各セッション開始時に Claude Code が読み、終了時に必要なら更新する。
履歴を残したい場合はコミットメッセージで充分（このファイルは最新状態のみ保持）。

---

## 現在のフェーズ

**Phase 2: GitHub App 化（着手中、コード側 foundation 完了）**

詳細 → `docs/roadmap.md` §1.3

Phase 1 は完了基準達成済 (§1.2)。Phase 0 は ADR-0002 により skip。

## 進行中タスク

- Phase 2 後半: webhook handler に enqueue ロジック追加、runner と DB の本番接続、wrangler.toml 整備
- 外部サービス契約 (Cloudflare Workers Paid $5/mo, Fly.io 等) の operator 承認 (憲章 §6 該当)

## 直近の重要判断

- 2026-04-26: 単一 CLAUDE.md を分割構成に再編（v0.5）
- 2026-04-26: ADR-0002 により Phase 0 を skip、Phase 1 に直行
- 2026-04-26: モノレポ初期化 + agent/cli 骨格 (`f9ed516`)
- 2026-04-26: Analyze/Plan/Migrate/Verify 4 段階実装 (`681f3b9`〜`c07e235`)
- 2026-04-26: source 削除 + 衝突検知 (`5d847ab`)、API path /index 修正 (`08f239c`)、Windows verify shell 対応 (`2c6494a`)
- **2026-04-26: `vercel/next.js` `examples/with-typescript` (5 ファイル) で end-to-end 成功** — pnpm install + tsc --noEmit + next build すべて pass。**Phase 1 §1.2 完了基準達成**
- 2026-04-26: Phase 1 残検証として `pages-router-medium` fixture (31 ファイル) を作成し pipeline 実行。30/31 task 成功、`_document.tsx` collision で 1 skip、cost $0.2354
- 2026-04-26: `docs/business.md` §4.1 に実測コストデータを追記。暫定上限の正式変更は Phase 2 で実顧客 5〜10 件分のデータ蓄積後に保留
- 2026-04-26: Phase 2 着手。code-side foundation を 4 commit に分割 (`ef4ba9d`〜`<latest>`):
  - `packages/shared` 状態機械 + concurrency + IDs (31 tests)
  - `packages/db` Drizzle schema (D1 互換、5 tests)
  - `apps/api` Hono webhook skeleton (10 tests)
  - `apps/runner` Node runner skeleton (9 tests)
  - 計 +55 tests (累計 151)。外部サービス契約は未着手 (operator 承認待ち)

## Phase 1 §1.2 の完了状況

- [x] モノレポ初期化（pnpm + Turborepo）
- [x] `packages/agent` に Analyze + Plan + Migrate + Verify 実装
- [x] `apps/cli` に `pnpm migrate <repo-path>` 実装
- [x] 検証対象:
  - [x] `vercel/next.js` の `examples/with-typescript`（5 ファイル）→ install + typecheck + build 全 pass
  - [x] `vercel/next.js` の `examples/blog-starter` → 既に App Router 化済のため検証対象外と判定（canary 確認済）
  - [x] 自作の中規模 sample (`pages-router-medium`, 31 ファイル) → 30/31 task 成功、`_document.tsx` collision、typecheck は LLM 起因の path 不整合 2 件で fail
- [x] **出力 branch で `next build` と型検査が通る**（with-typescript で達成）
- [x] 1 ジョブのトークン使用量・所要時間・コストを計測しレポート（status.md と business.md §4.1 §"Phase 1 PoC 実測コストデータ"）
- [x] `docs/business.md` §4.1 のコスト想定値を実測ベースで再評価（参考データ追加、暫定上限は保留）

## 既知の制約・将来の宿題

- `pages/_document.tsx + _app.tsx` の同一 target 衝突: 後発タスク skip + 手動マージ余地。pages-router-medium で初検証 → 1 task skip、`<html lang>` や `<body className>` 等の情報が失われた。merge 機能の実装が将来の改善点
- **LLM 品質: 相対 import 深さ調整に inconsistency**: pages-router-medium の動的ルート ({slug}, {id}) で 2/4 が `../../` のまま (正しくは `../../../`)。with-typescript では正しく調整できていた。プロンプト改善か deterministic な後処理 (post-migration import normalization) で対応すべき
- **LLM 品質: `params: Promise<{...}>` vs `params: { ... }` の不整合**: with-typescript run では Promise 形 (Next.js 15+ 仕様)、medium fixture run では同期形。同じ Sonnet 4.6 でも実行ごとに差。Next.js バージョン明示でプロンプトの曖昧性を減らす余地
- LLM が path alias (`@/...`) を使うと tsconfig 設定との整合性が必要。未設定 repo では破綻しうる
- Migrate のプロンプト (`docs/prompts/migrate.md` v0.1) は eval ハーネスを通していない（`docs/development.md` §3.4 のゲートは Phase 5 以降の運用で本格適用）

## コスト実測データポイント

詳細は `docs/business.md` §4.1 "Phase 1 PoC 実測コストデータ" を参照。

| 対象 | ファイル数 | analyze | migrate | 合計 | 1 ファイルあたり |
|---|---|---|---|---|---|
| 自作 minimal fixture | 4 | $0.0014 | $0.0265 | $0.0279 | $0.0070 |
| with-typescript | 5 | $0.0026 | $0.0461 | $0.0487 | $0.0097 |
| 自作 medium fixture | 31 | $0.0094 | $0.2260 | $0.2354 | $0.0076 |

**1 ファイルあたり $0.007〜$0.010** で線形スケール。100 ファイルで $0.80
(business.md §4.1 暫定上限 $20 に対し 25 倍マージン)。Small プランは安全圏。
ADR-0002 §1.1 kill criteria 累計使用 0.4% (約 $0.36)。

## 次に着手すべきこと

選択肢（operator 確認待ち）:
1. **LLM 品質改善**: import path 深さ整合のプロンプト改善 + deterministic 後処理。eval ハーネスの最小実装（`docs/development.md` §3 の前倒し）
2. **Phase 2 着手準備**: GitHub App 登録、Cloudflare Workers + Hono、Drizzle + D1 設計（`docs/roadmap.md` §1.3）
3. **PoC の OSS 公開検討**: ADR-0002 §1.4 の市場シグナル取得（GitHub star / issue / discussion 観察）
4. **`_document + _app` merge 機能**: collision 時に既存 layout を読み LLM に追加コンテキストとして渡す

## 開発コマンド

要件: Node.js 22 LTS、corepack 有効化済み、`.env.local` に `ANTHROPIC_API_KEY`。

PowerShell:

```powershell
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test

# pipeline 実行 (analyze + plan + migrate + verify は別コマンド)
corepack pnpm --filter '@migrate-bot/cli' exec tsx src/index.ts migrate <repo-path>
corepack pnpm --filter '@migrate-bot/cli' exec tsx src/index.ts verify <working-dir>
corepack pnpm --filter '@migrate-bot/cli' exec tsx src/index.ts stats
```

## 関連リンク

- 憲章: `CLAUDE.md`
- ロードマップ: `docs/roadmap.md` §1.2
- 事業設計: `docs/business.md` §4.1（実測コストデータ追記済）
- ADR-0002（Phase 0 skip 判断）: `docs/decisions/0002-skip-phase-0.md`
- agent 設計: `docs/agent.md`
- アーキテクチャ: `docs/architecture.md`
