# status.md — 現在のフェーズ・進行中タスク

> Last updated: 2026-04-28

各セッション開始時に Claude Code が読み、終了時に必要なら更新する。
履歴を残したい場合はコミットメッセージで充分（このファイルは最新状態のみ保持）。

---

## 現在のフェーズ

**Phase 2: GitHub App 化（着手中、コード側 foundation 完了）**

詳細 → `docs/roadmap.md` §1.3

Phase 1 は完了基準達成済 (§1.2)。Phase 0 は ADR-0002 により skip。

## 進行中タスク

- **Phase 2 外部サービス契約 (operator 作業、完了)**:
  - ✅ GitHub アカウント `Garoro0920` + private repo + push
  - ✅ GitHub App `migrate-bot-dev` (App ID 3509236)
  - ✅ Cloudflare アカウント + Workers Paid + 2FA + wrangler login
  - ✅ D1 `migrate-bot-dev` (e5e26c30-...) + Queues `migrate-bot-jobs`
  - ✅ wrangler secrets 3 件設定済
  - ✅ Fly.io アカウント + 2FA + クレカ + flyctl login
  - ✅ Fly.io app `migrate-bot-runner-dev` 作成 (region nrt, shared-cpu-1x 512mb)
  - ✅ flyctl secrets 3 件設定済 (ANTHROPIC_API_KEY / GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY)
  - ⚠ Cloudflare/Fly.io 共に Spend limit 設定 UI 不明、月次手動確認運用
  - ⏸ GitHub App `migrate-bot-prod` (Phase 4 直前まで保留)
- **Phase 2 後半 (Claude Code 作業、進行中)**:
  - ✅ D1 schema migration 生成 + テスト連動 (`e41653b`)
  - ✅ DB client / repository 関数 (`b1b3217`、12 tests)
  - ✅ apps/api webhook → D1 配線 (`f5ebfc4`、7 tests)
  - ✅ D1 dev DB に migration 適用 (operator が wrangler d1 execute 実行、10 queries → 7 tables)
  - ✅ apps/api admin/trigger with bearer auth (`295d34f`、9 tests)
  - ✅ Fly.io Machines API client + Cloudflare Queues consumer (`4b368ec`、12 tests)
  - ✅ wrangler.toml に queues.consumers + vars 追記 (`65d20a7`)
  - ✅ apps/api /internal/jobs/{id, /transition, /usage} (`d2ecd04`、8 tests、admin/jobs を移動)
  - ✅ apps/runner InternalApiClient HTTP client (`b3f4341`、5 tests)
  - ✅ apps/runner orchestration を InternalApiClient ベースに書換 + createPR stage 追加 (`fc7407d`、6 tests)
  - ✅ apps/runner pipeline 本実装 (createRealPipeline) + index.ts 配線 + 13 tests
    - agent.analyze/plan/migrate/verify 統合、blockers/failed task/typecheck/build を error に変換
    - Octokit createDraftPR + git config/diff/add/commit/checkout/push を closure 内で実行
    - 累計 runner 28 tests (15+13)
  - ⏸ **次回ここから**: wrangler secrets 追加 (INTERNAL_API_TOKEN + FLY_API_TOKEN) → wrangler deploy
  - ⏸ flyctl deploy (apps/runner image を Fly registry に push)
  - ⏸ Phase 2 完了基準確認 (テスト repo で webhook → Queue → Fly.io job → draft PR)

## 直近の重要判断

- 2026-04-26: 単一 CLAUDE.md を分割構成に再編（v0.5）
- 2026-04-26: ADR-0002 により Phase 0 を skip、Phase 1 に直行
- 2026-04-26: モノレポ初期化 + agent/cli 骨格 (`f9ed516`)
- 2026-04-26: Analyze/Plan/Migrate/Verify 4 段階実装 (`681f3b9`〜`c07e235`)
- 2026-04-26: source 削除 + 衝突検知 (`5d847ab`)、API path /index 修正 (`08f239c`)、Windows verify shell 対応 (`2c6494a`)
- **2026-04-26: `vercel/next.js` `examples/with-typescript` (5 ファイル) で end-to-end 成功** — pnpm install + tsc --noEmit + next build すべて pass。**Phase 1 §1.2 完了基準達成**
- 2026-04-26: Phase 1 残検証として `pages-router-medium` fixture (31 ファイル) を作成し pipeline 実行。30/31 task 成功、`_document.tsx` collision で 1 skip、cost $0.2354
- 2026-04-26: `docs/business.md` §4.1 に実測コストデータを追記。暫定上限の正式変更は Phase 2 で実顧客 5〜10 件分のデータ蓄積後に保留
- 2026-04-26: Phase 2 着手。code-side foundation を 8 commit に分割 (`ef4ba9d`〜`234d046`):
  - `packages/shared` 状態機械 + concurrency + IDs + Queue 抽象 (36 tests)
  - `packages/db` Drizzle schema (D1 互換、5 tests)
  - `apps/api` Hono webhook + GitHub event parsing + signature verify (14 tests)
  - `apps/runner` Node runner skeleton + Octokit App wrapper (13 tests)
  - `apps/cli` `admin-trigger` 追加 (27 tests, +5)
  - apps/api/wrangler.toml + apps/runner/fly.toml + Dockerfile プレースホルダ
  - 計 +95 tests (累計 169)。コード側は外部サービス未利用で完結
- 2026-04-26: `docs/phase-2-deployment.md` を作成。GitHub App / Cloudflare / Fly.io の登録手順、月額固定費合意（$10〜$15）、撤退手順、セキュリティチェックリストを集約
- 2026-04-26: 月額 $10〜$15 の固定費に operator 合意 (憲章 §6)
- 2026-04-26: GitHub アカウント `Garoro0920` で private repo 作成・push、git config を新アカウントに切替 (旧 `Ga1or0920/migrate-bot` は GitHub 上に残存、operator が必要に応じて削除)
- 2026-04-26: GitHub App `migrate-bot-dev` 登録 (App ID 3509236)、.gitignore に *.pem 等の秘密鍵パターン追加 (`f4578f2`)
- 2026-04-27: Cloudflare アカウント作成 + Workers Paid + 2FA。wrangler 4.85.0 を `apps/api` の devDep に追加 (`25c9bc0`)、workerd ローカルランタイムも有効化
- 2026-04-27: D1 `migrate-bot-dev` (e5e26c30-...) + Queue `migrate-bot-jobs` 作成、wrangler.toml で binding 有効化 (`cb46239`)
- 2026-04-27: wrangler secrets 設定 (GITHUB_WEBHOOK_SECRET / GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY)。値は Claude Code 非共有
- 2026-04-27: pnpm `--filter` が Windows の Application Data / Local Settings junction で 4 並列実行する不具合判明。回避策として直接 `<package>/node_modules/.bin/<tool>.CMD` を呼ぶ運用に切替
- 2026-04-27: Fly.io アカウント作成 + 2FA + クレカ登録、flyctl install/login。app `migrate-bot-runner-dev` 作成 (region nrt、shared-cpu-1x 512mb、`aa40b07`)
- 2026-04-27: flyctl secrets 設定 (ANTHROPIC_API_KEY / GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY)
- **2026-04-27: Phase 2 外部サービス契約 (§0〜§3.4) 完了**。次は Claude Code が Phase 2 後半コード wiring を実装
- 2026-04-27: Phase 2 後半 wiring 着手。3 commit:
  - `e41653b` drizzle-kit で migration SQL 生成 + テストもこの SQL を使用
  - `b1b3217` packages/db に D1/SQLite client + repository 関数 (upsertInstallation / createJob / transitionJob 等、12 tests)
  - `f5ebfc4` apps/api webhook handler を D1 配線 (installation event → DB、handlers.ts に pure 関数分離、7 tests)
  - 累計 188 tests (74+27+36+17+21+13)、外部サービス未利用

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

**次回セッション開始時の最初のタスク**: Cloudflare 登録 (`docs/phase-2-deployment.md` §2)。
operator は事前にクレカ + 永続メール + 2FA アプリ + 静かな環境を準備して再開する。

その後の選択肢:
1. Cloudflare 完了後 → Fly.io 登録 (`docs/phase-2-deployment.md` §3)
2. 全外部契約完了後 → Phase 2 後半コード作業 (D1/Queue 接続、agent パイプライン runner 統合)
3. 並行で進めてよい task: LLM 品質改善 (import path 深さ整合のプロンプト改善 + 後処理)、`_document + _app` merge 機能

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
