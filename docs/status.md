# status.md — 現在のフェーズ・進行中タスク

> Last updated: 2026-05-13 (Pass 8 反映完了、Stripe Live activation 申請着手可能状態)

各セッション開始時に Claude Code が読み、終了時に必要なら更新する。
履歴を残したい場合はコミットメッセージで充分（このファイルは最新状態のみ保持）。

---

## 現在のフェーズ

**Phase 4: ローンチ準備 (進行中、prod 稼働中・残作業は外部依存タスクのみ)**

prod environment 全機能通電完了済 (2026-04-30):
- apps/api / apps/web Worker deploy
- Custom Domain (`migrate-bot.dev` apex + `api.migrate-bot.dev`)
- Cloudflare D1 prod + Queue prod + Fly prod app
- Resend ドメイン検証 + Cloudflare Email Routing (`support@`, `noreply@`)
- Stripe Test mode webhook + secret 全 9 件
- E2E 完走 (PR #6 admin-trigger / PR #7 Stripe Test 経由、所要 1m35s / 3m16s、コスト $0.05)
- 法務 4 文書 self-review (Case C) + EEA/UK/CH 5 段防御実装 (`4b351e5`)
- 包括的レビュー Batch A→B→D→C 完了 (`c981295` + Batch C):
  - Batch A: 法務文書 cross-doc 修正 (refund 14d/30d 区別、ToS §6、特商法 link)
  - Batch B: stripe-webhook fail-closed + retry-safe (`PermanentWebhookError`)
  - Batch D: refund failure 構造化ログ + Sentry capture
  - Batch C: runner 安全強化 — R1 idempotency / R2 mid-pipeline crash → aborted_blocker / R3 subprocess timeouts / R4 tmp dir try/finally cleanup / R5 SIGTERM handler. tests 371 → 398.

残作業:
- ✅ Karigo 神戸 私書箱契約 (5/12 貸与住所受領: 〒651-0094 兵庫県神戸市中央区琴ノ緒町五丁目二番二号 三信ビル401)
- ✅ ZeLo 野村弁護士 60 分相談 (5/12 17:00-18:00 完了、御礼メール送信済)
- ✅ 法務 4 文書 placeholder 埋め + apps/web prod deploy (`377ad6f`)
- ✅ ZeLo Gemini 文字起こし受領 (5/13) → legal-self-review-log.md に Pass 8 として反映 (`fff5328`)、御礼返信メール送信済
- ✅ 野村先生の評価: 主要 6 論点 (Q1-Q6) すべて「現状で OK」または「やれるだけのことはやっている」、**法務 4 文書の実質修正は不要**
- ⏳ Stripe Live activation 申請 (runbook `docs/runbooks/stripe-live-activation.md` 参照) → 承認後 sk_live_... 差替 → Live mode webhook 再作成
- ⏳ ローンチ告知 (HN / Reddit / X、`docs/templates/launch-announcements/`)

詳細 → `docs/roadmap.md` §1.5、ADR-0003

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
  - ✅ legal pages に `<meta name="robots" content="noindex, nofollow">` 付与 (`a5ede14`、Karigo 私書箱の検索回避条件対応、+5 tests、累計 353)
  - ✅ prod resources 作成 (`153f923`、2026-04-30):
    - D1 `migrate-bot-prod` (database_id `d65c36a6-130e-4c95-99c2-ef02e3590447`、APAC region) + 0000_initial + 0001_orders 適用済 (8 業務テーブル + d1_migrations)
    - Queue `migrate-bot-jobs-prod`
    - Fly app `migrate-bot-runner-prod` (region nrt、初回 deploy 待ち)
    - apps/api/wrangler.toml の `[env.prod.d1_databases]` / `[env.prod.queues.*]` をアンコメント、prod database_id 反映
    - `wrangler deploy --env=prod --dry-run` で全 binding 解決確認済
  - ✅ **法務レビュー方針: Case C (自己レビューで補完してローンチ) 採択** (`6f22c90` + `d4a82d7`、2026-04-30):
    - 弁護士費用 (¥数十万円) を学生期間中は確保不能との operator 判断
    - Claude Code が 7-pass の自己レビューを実施 (一次資料 6 件 WebFetch 引用 + 別 agent による独立レビュー):
      - 特商法 11 条 9 項目 / 消費者契約法 8〜10 条 / APPI 27・28 条 / 景表法 / Anthropic DPA / Cross-doc / EEA 拒否
    - `docs/templates/legal/*.md` 4 文書を改訂 (ToS / PP / Refund / 特商法)
    - `docs/legal-self-review-log.md` 新規作成 — 引用一次資料、pass 別作業記録、残存リスク、運用指針、将来弁護士レビュー時の引継ぎ事項
    - EEA/UK/CH 居住者拒否を 4 段防御で実装 (ToS §2 / Stripe Checkout custom_text / billing_address required / Landing 注記)
    - 残課題: 売上発生後 (月商 ¥10 万到達等) に弁護士レビュー予算化、6 ヶ月後に PPC ガイド最新版で再点検
  - ✅ **prod E2E 完走** (2026-04-30、PR #6 作成):
    - apps/api Worker deploy + Custom Domain 紐付け (`api.migrate-bot.dev`)
    - apps/web Worker deploy + Custom Domain 紐付け (`migrate-bot.dev`)
    - Resend ドメイン検証 + DKIM/SPF/DMARC + Cloudflare Email Routing (support@ / noreply@)
    - Stripe Test webhook endpoint + STRIPE_WEBHOOK_SECRET prod 値
    - EMAIL_FROM_ADDRESS = `migrate-bot <noreply@migrate-bot.dev>`
    - admin/trigger → Queue → Fly machine → agent → draft PR + email まで完走 (1分35秒)
    - 失敗 → 解決した tricky issue: **Fly app secret は Worker config.env を override する仕様**。Fly secret の値が Worker と一致していないと runner で env が空に見える。両方を同じ hex で再設定して解消 (`22a6d5b` 診断 log clean up)
    - 既知の改善余地: machine が `sjc` region で起動 (Fly app primary_region 未設定、想定は nrt)。レイテンシ影響あるが機能はする → launch 後の改善
  - ⏸ operator: 私書箱代行サービス契約 (P0-1、Karigo 条件了承の返信送信済、契約は launch 1〜2 週間前)
  - ⏹ operator: 法務レビュー応答待ち (P0-3) — **Case C 採択により 不要化**:
    - 5 社送信、4 社辞退 (南本町 / Atlas / STORIA / GVA)、ZeLo のみ応答待ちだったが Case C で全 close 済
  - ⏸ operator: 税理士相談応答待ち (P0-4、freee 経由で 3 名 送信済)
    - スタートアップ税理士法人(東京)
    - BlueWorksTax(東京、IT 特化)
    - ハートランド税理士法人(大阪、関西で対面可)
  - ⏸ operator: 法務レビューサービス問い合わせ (P0-3)
  - ⏸ operator: 税理士相談アポ取り (P0-4)
  - ⏸ ドメイン取得 + custom domain 設定 (P1-1、ドメインは取得済、custom domain 紐付けはこれから)
  - ⏸ DNS + Resend ドメイン検証 (P1-2 / P2-2)
  - ⏸ 法務レビュー結果反映 + landing 公開 (P2-1 / P2-3)
  - ⏸ 本番 GitHub App `migrate-bot` 作成 (`docs/phase-4-deployment.md` §6、operator: GitHub web UI)
  - ✅ 本番 Cloudflare D1 / Queue / Fly app 作成 (`docs/phase-4-deployment.md` §7.1 / §8.1、`153f923`)
  - ⏸ prod secrets 設定 + 初回 deploy (`docs/phase-4-deployment.md` §7.3〜§7.5 / §8.2〜§8.5)
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

**次回セッション開始時の最初のタスク**: Stripe Live activation 申請の進捗確認、または以下の残作業のうち operator が選択した項目。

### ✅ 完了済 (5/12-5/13)

- Karigo 神戸 私書箱契約 + 住所受領 (5/12)
- 法務 4 文書 placeholder 埋め + apps/web prod deploy (5/12 `377ad6f`)
- ZeLo 野村弁護士 60 分相談 (5/12) + Pass 8 反映 (5/13 `fff5328`)
- 御礼メール 2 通送信済 (5/12 会議直後、5/13 文字起こし受領後)

### 🔴 Stripe Live activation 申請 (operator 主体、最優先)

詳細手順 → `docs/runbooks/stripe-live-activation.md`

主な準備:
1. operator が runbook §1 checklist で書類収集 (本人確認書類、マイナンバー、銀行口座、Karigo 利用契約書 PDF)
2. Stripe Dashboard で申請 (所要 30-60 分)
3. 審査 1-3 営業日待機 (追加質問があれば 24h 以内返信)
4. 承認後の本番反映 (runbook §4):
   - `STRIPE_SECRET_KEY` を `sk_live_...` で再 put
   - Stripe Dashboard で Live mode prod webhook 新規作成 → `STRIPE_WEBHOOK_SECRET` 更新
   - apps/api 再 deploy
   - Live 自分カード決済で end-to-end 確認

### Stripe Live 承認後のフロー

1. STRIPE_SECRET_KEY を `sk_live_...` で再 put
2. Stripe Dashboard で Live mode の prod webhook endpoint 新規作成 → STRIPE_WEBHOOK_SECRET 更新
3. apps/api 再 deploy
4. Live 自分カード決済で end-to-end 確認
5. 確認後 ローンチ告知 (HN / Reddit / X) を operator 確認の上で投稿

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
