# status.md — 現在のフェーズ・進行中タスク

> Last updated: 2026-04-28

各セッション開始時に Claude Code が読み、終了時に必要なら更新する。
履歴を残したい場合はコミットメッセージで充分（このファイルは最新状態のみ保持）。

---

## 現在のフェーズ

**Phase 3: 課金統合 (完了基準達成、Phase 4 着手前段階)**

2026-04-28 ADR-0003 で「学生期間中に Phase 3/4 前倒し、市場検証 skip 継続」を決定。
同日中に Phase 3 のコード + dev 環境動作確認まで完走:

- Stripe Test mode で実際にテストカード決済 ($99 = small plan)
- webhook → order paid → job 作成 → Fly machine → agent → draft PR #4 作成
- `pr_ready` 状態到達 (cost $0.0480、Phase 1 と同等)
- Resend で `paymentReceived` + `prReady` の 2 通メール配信成功

詳細 → `docs/roadmap.md` §1.4、ADR-0003

Phase 0 (市場検証) は ADR-0002 で skip、ADR-0003 で skip 継続。

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
  - ✅ E2E 通過 (2026-04-28、6 回目の試行で `pr_ready`、cost $0.0495、tokens 12,576)
    - 1 回目: 403 (FLY_API_TOKEN が session token で Machines API 権限なし)
    - 2 回目: invalid installationId (jobs.installation_id は内部 UUID FK、runner は GitHub integer ID 必要)
    - 3 回目: OOM at next build (512MB 不足)
    - 4 回目: verify failed (LLM が `pages/users/[id].tsx` → `app/users/[id]/page.tsx` の階層深化を import path に反映できず)
    - 5 回目: git commit が `shell:true` で argv 再 split → "[migrate-bot]" のみ commit message、残りは pathspec
    - 6 回目: `octokit.rest.pulls.create` が undefined (`@octokit/app` のデフォルトは core Octokit、`.rest` plugin は別途注入必要)
    - 7 回目: pr_ready 到達。draft PR #1 が `Garoro0920/migrate-bot-e2e-test` に作成された
  - 解決 commit:
    - `8d680a2` /internal/jobs response に githubInstallationId を join 追加
    - `3fb6e0b` Fly machine memory 512MB → 2GB、CPU 1 → 2
    - `ba92a5c` agent: deterministic な相対 import path 後処理 (10 unit tests)
    - `4bd6252` runner: git invocation から `shell:true` 削除
    - `5beac95` runner: `@octokit/rest` の Octokit を App constructor に注入
  - ✅ pr_url を D1 に書き込む transition payload 拡張 (`aeb4f94`)
  - ⏸ webhook 経由 (= GitHub App webhook URL) の E2E 確認 (admin/trigger では成功済)
- **Phase 3 課金統合 (完了)**:
  - ✅ orders table schema + drizzle migration (`aa322c5`)
  - ✅ orders repository + 15 tests (`8fa5137`)
  - ✅ Stripe SDK wrapper for Workers (`8a919a6`、6 tests)
  - ✅ POST /checkout/create-session route (`195b1ef`、5 tests)
  - ✅ POST /webhooks/stripe with checkout/refund handlers (`db1eed1`、7 tests)
  - ✅ Refund flow on job failure (`c0529d1`、5 tests)
  - ✅ Resend email notifications at payment / pr_ready / refunded (`70cdfc3`、13 tests)
  - 累計 +52 tests (246 → 298)
  - ✅ Phase 3 operator 作業完了 (Stripe / Resend dev アカウント + secrets + 0001_orders 適用)
  - ✅ E2E 完走 (2026-04-28、Stripe テスト card $99 → draft PR #4 → 2 通メール届く)
  - ⏸ Resend ドメイン検証 (任意のメアドに送るには必要、Phase 4 のドメイン取得時に実施)
- **Phase 4 ローンチ準備 (進行中)**:
  - ✅ 法務文書 4 点起草 (`beea7a9`、`docs/templates/legal/`、要 operator + 弁護士レビュー)
  - ✅ Landing page MVP + 法務 4 ページ HTML 配信 (`65371df`、`apps/web/`、+18 tests)
  - ✅ Sentry instrumentation 全 3 app (`6f1eb2c`、SENTRY_DSN 未設定なら no-op)
  - ✅ prod env config templates + `docs/phase-4-deployment.md` (`70ccae3`)
  - ✅ CLI admin-trigger を HTTP 化 (`5779e25`、+6 tests、累計 322)
  - ✅ wrangler d1 migrations apply 用 migrations_dir 設定 (`70ccae3`)
  - ✅ ドメイン名 `migrate-bot.dev` 確定 + placeholder 一括反映 (`b24de9b`、+2 tests、累計 324)
    - 商標調査結果: USPTO TMview / J-PlatPat / EUIPO すべてクリア
    - Foster LLP の MIGRATE は移民法務専用で業種完全に異なる
    - operator が Cloudflare Registrar で取得作業中
  - ✅ apps/web に `/checkout/success` `/checkout/cancel` 追加 (`b24de9b`)
  - ✅ operator: ドメイン取得完了 (P0-2、`migrate-bot.dev`、Cloudflare Registrar)
  - ⏸ operator: 私書箱代行サービス契約 (P0-1、Karigo 神戸中央 問い合わせ済、応答待ち)
  - ⏸ operator: 法務レビュー応答待ち (P0-3):
    - 南本町行政書士事務所(ココナラ): **辞退** — 4 文書フルレビューで ¥200K 提示 + 「弁護士の方が合うかも」
    - Atlas行政書士法人(ココナラ): **辞退** — 詳細不明
    - STORIA 法律事務所: **辞退** — 多忙のため新規依頼受け不可
    - GVA 法律事務所: **辞退** — 「ご依頼項目が多岐にわたり、ご希望の納期での対応が難しい」
    - 法律事務所 ZeLo: 応答待ち(GW 明け 5/7 以降見込み)
    - → **5 社送信、4 社辞退、ZeLo のみ応答待ち**
    - パターン: 4 文書 + GDPR/CCPA + 5/13 期限 が "重い" と判断される。**戦略再考必要**:
      - 案 A: ZeLo 待ち、辞退なら追加候補(Monolith / AI-Con Pro / オンラインレビュー)に scope 縮小 + 期限延長で再送信
      - 案 B: scope を 2 文書(ToS + PP)に分割し、refund / 特商法は self-review で運用。Stripe Live 申請には十分
  - ⏸ operator: 税理士相談応答待ち (P0-4、freee 経由で 3 名 送信済)
    - スタートアップ税理士法人(東京)
    - BlueWorksTax(東京、IT 特化)
    - ハートランド税理士法人(大阪、関西で対面可)
  - ⏸ operator: 法務レビューサービス問い合わせ (P0-3)
  - ⏸ operator: 税理士相談アポ取り (P0-4)
  - ⏸ ドメイン取得 + custom domain 設定 (P1-1)
  - ⏸ DNS + Resend ドメイン検証 (P1-2 / P2-2)
  - ⏸ 法務レビュー結果反映 + landing 公開 (P2-1 / P2-3)
  - ⏸ 本番 GitHub App / Cloudflare D1 / Queue / Fly app 作成 (`docs/phase-4-deployment.md` §6-§8)
  - ⏸ Stripe Live activation 申請 (P3-1)
  - ⏸ デモ動画 + ローンチ告知文 (P4)
  - ⏸ Sentry プロジェクト作成 + DSN secret 登録 (operator)

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
