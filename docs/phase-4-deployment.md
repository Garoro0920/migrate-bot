# phase-4-deployment.md — Phase 4 ローンチ準備手順

> Last reviewed: 2026-04-29
> 関連: `docs/roadmap.md` §1.5, `docs/phase-2-deployment.md` (dev 環境構築の参考)

Phase 4 ローンチに必要な operator 作業をひとまとめにする。コード側の作業は
別 commit で完了済 (legal docs / landing page / Sentry / prod env config)。

---

## §1. 全体像

```
operator が用意するもの:
  - 法務 (private mailbox 住所、法務文書レビュー、開業届方針)
  - ドメイン (Cloudflare Registrar 推奨)
  - メール (Resend ドメイン検証 + Cloudflare Email Routing)
  - 本番環境 (Cloudflare D1/Queue/Worker prod、GitHub App prod、Fly app prod)
  - Stripe Live activation
  - Sentry プロジェクト (任意、free Developer plan)
  - ローンチ告知文 (HN / Reddit / X)

Claude Code 側で完了済:
  - apps/web Landing + 法務 4 ページ (`apps/web/`)
  - apps/api Stripe / Resend integration
  - apps/runner agent pipeline
  - 全 app の Sentry instrumentation (no-op when SENTRY_DSN unset)
  - wrangler.toml の [env.prod] テンプレート
```

---

## §2. 前提条件

`docs/phase-2-deployment.md` の dev 環境構築が完了していること:
- GitHub App `migrate-bot-dev`
- Cloudflare D1 `migrate-bot-dev` + Queue `migrate-bot-jobs`
- Fly.io app `migrate-bot-runner-dev`
- 全 dev secrets

---

## §3. 法務 / 税務 (operator-only)

### §3.1 私書箱代行サービス (P0-1)

CLAUDE.md §6 確認必須項目。

- 推奨: **Karigo WHITE プラン**(¥4,700/月〜)、関西圏拠点
- 契約前確認: 「特商法表記用住所として利用可能」「個人事業主の SaaS 利用可能」
- 月額固定費 ¥4,700 + 郵便転送送料実費 + 入会金 ¥5,500
- 最低 2 ヶ月縛り、解約申請後 1 ヶ月の lag

### §3.2 法務文書レビュー (P0-3)

- 対象: `docs/templates/legal/` の 4 文書 (ToS / PP / refund / 特商法)
- 推奨: **リーガルチェックサービス**(¥5,000〜¥30,000、1〜2 日)
- 重点確認:
  1. 米ドル建てで日本居住者が販売する形態の準拠法・裁判管轄
  2. 責任制限条項の消費者契約法 8 条適合
  3. 海外データ移転 (Anthropic = 米国) の APPI 28 条準拠
  4. 返金条件の消費者契約法 9 条適合

### §3.3 税理士相談 (P0-4)

- 学生扶養 (年 103 万円超で扶養外れる) の影響を試算
- 雑所得 vs 事業所得の判断
- USD 入金の為替差損益の記録方針
- ローンチ前に 1 回、初回確定申告前に 1 回が現実的

### §3.4 法務文書の placeholder 埋め

レビュー完了後、operator が以下を埋める:

- `<OPERATOR_LEGAL_NAME>`: 戸籍上のフルネーム
- `<OPERATOR_ADDRESS>`: §3.1 で取得した私書箱住所
- `<CONTACT_EMAIL>`: §5 で取得する support アドレス
- `<CONTACT_PHONE>`: 携帯番号 (「請求あり次第開示」運用なら公開せず)
- `<EFFECTIVE_DATE>`: 公開日 (ISO 8601、例: 2026-05-15)
- `<GOVERNING_LAW>`: 弁護士確認後の値 (推奨: "Japan")
- `migrate-bot.dev`: §4 で取得したドメイン

埋めた後、`apps/web/scripts/embed-legal.mjs` を実行 (or `pnpm build:legal`)
して `legal-content.gen.ts` を再生成、wrangler deploy。

---

## §4. ドメイン取得 + DNS (P1-1 / P1-2)

CLAUDE.md §6 確認必須 (月額固定費発生)。

### §4.1 取得

```powershell
# 推奨: Cloudflare Registrar (原価)
# https://dash.cloudflare.com → Domain Registration → Register Domain
```

候補: `migrate-bot.dev` ($12/年程度) / `migrate-bot.app` / `migrate-bot.com`

### §4.2 DNS 設定 (Cloudflare Dashboard)

1. landing page (`apps/web`) に apex (`migrate-bot.dev`) を割当:
   - Cloudflare Workers → migrate-bot-web-prod → Custom Domains → Add `migrate-bot.dev`
2. apps/api に subdomain (`api.migrate-bot.dev`) を割当:
   - Cloudflare Workers → migrate-bot-api-prod → Custom Domains → Add `api.migrate-bot.dev`
3. 共通 DNS records:
   - MX: `route1.mx.cloudflare.net` priority 50 (Email Routing 用)
   - TXT (SPF): Resend 検証 §5.1 で取得
   - TXT/CNAME (DKIM): Resend 検証 §5.1 で取得
   - TXT (DMARC): `v=DMARC1; p=none; rua=mailto:dmarc@migrate-bot.dev`

---

## §5. メール (Resend ドメイン検証 + Email Routing)

### §5.1 Resend ドメイン検証

1. Resend Dashboard → Domains → Add Domain → `migrate-bot.dev` 入力
2. 表示される SPF / DKIM レコードを Cloudflare DNS に追加
3. Resend で Verify ボタン → 数分で Verified
4. 検証後、`EMAIL_FROM_ADDRESS` を `migrate-bot <noreply@migrate-bot.dev>` に変更:
   ```powershell
   cd apps/api
   corepack pnpm exec wrangler secret put EMAIL_FROM_ADDRESS --env=prod
   ```

### §5.2 Cloudflare Email Routing

1. Cloudflare Dashboard → Email → Email Routing → Enable
2. `support@migrate-bot.dev` を operator の Gmail に転送
3. 同じく `noreply@migrate-bot.dev` を operator の Gmail に転送 (送信専用なので受信は不要だが、bounce 受け用)

---

## §6. 本番 GitHub App 作成

### §6.1 App 登録

1. https://github.com/settings/apps/new で新規作成
2. App name: `migrate-bot` (dev は `migrate-bot-dev`、prod は `migrate-bot`)
3. Webhook URL: `https://api.migrate-bot.dev/webhooks/github`
4. Webhook secret: ランダム 32 byte hex を生成 (dev と別値)
5. Permissions:
   - Contents: Read and write
   - Pull requests: Read and write
   - Metadata: Read-only
6. Subscribe to events: `installation`, `installation_repositories`, `push` (任意)
7. 登録後、App ID と Private key (.pem) を控える

### §6.2 install URL の更新

`apps/web/wrangler.toml` の `[env.prod.vars]` で:
```toml
GITHUB_APP_INSTALL_URL = "https://github.com/apps/migrate-bot/installations/new"
```

すでにそのフォーマットで設定済。App slug が `migrate-bot` であることを確認。

---

## §7. 本番 Cloudflare 環境

### §7.1 D1 + Queue 作成

```powershell
cd apps/api

# prod D1
corepack pnpm exec wrangler d1 create migrate-bot-prod
# 出力の database_id を控える

# prod Queue
corepack pnpm exec wrangler queues create migrate-bot-jobs-prod
```

### §7.2 wrangler.toml の prod セクションを完成

`apps/api/wrangler.toml` の `[env.prod]` 配下のコメントアウトを外し、
- `<PROD_D1_DATABASE_ID>` を §7.1 で取得した値に置換
- `migrate-bot.dev` を §4 で取得したドメインに置換
- `<DEPLOYMENT_TAG>` は §8 deploy 後に置換 (毎 deploy 後の更新が必要)

### §7.3 prod secrets を設定

```powershell
cd apps/api
$secrets = @(
  'GITHUB_WEBHOOK_SECRET',
  'GITHUB_APP_ID',
  'GITHUB_APP_PRIVATE_KEY',
  'INTERNAL_API_TOKEN',
  'FLY_API_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM_ADDRESS',
  'SENTRY_DSN'  # 任意
)
foreach ($s in $secrets) {
  corepack pnpm exec wrangler secret put $s --env=prod
}
```

### §7.4 D1 schema 適用

```powershell
cd apps/api
corepack pnpm exec wrangler d1 migrations apply migrate-bot-prod --remote
```

(dev DB は Phase 2/3 で手動適用したので backfill 必要だが、prod は新規なので
そのまま全 migration を順次適用してくれる)

### §7.5 wrangler deploy (prod)

```powershell
cd apps/api
corepack pnpm exec wrangler deploy --env=prod

cd ../web
corepack pnpm exec wrangler deploy --env=prod
# secrets が必要 (任意): SENTRY_DSN
corepack pnpm exec wrangler secret put SENTRY_DSN --env=prod
```

deploy 後、`api.migrate-bot.dev` と `migrate-bot.dev` (apex) が稼働していることを確認:
```powershell
Invoke-RestMethod https://api.migrate-bot.dev/health
Invoke-RestMethod https://migrate-bot.dev/health
```

---

## §8. 本番 Fly.io 環境

### §8.1 Fly app 作成

```powershell
cd "C:\Users\FroGr\Desktop\Claude Code Projects"
flyctl apps create migrate-bot-runner-prod
```

### §8.2 prod 用 fly.toml の用意

現状 `fly.toml` は dev (`migrate-bot-runner-dev`) を指している。prod デプロイ時は
**`fly.prod.toml` を新規作成** か、deploy 時に `--app migrate-bot-runner-prod`
で上書きする。

最も簡潔: deploy コマンドで指定:
```powershell
flyctl deploy --app migrate-bot-runner-prod --no-public-ips
```

### §8.3 prod secrets を設定

```powershell
flyctl secrets set ANTHROPIC_API_KEY="..." --app migrate-bot-runner-prod
flyctl secrets set GITHUB_APP_ID="..." --app migrate-bot-runner-prod
flyctl secrets set GITHUB_APP_PRIVATE_KEY="..." --app migrate-bot-runner-prod
flyctl secrets set INTERNAL_API_TOKEN="..." --app migrate-bot-runner-prod  # apps/api と同じ値
flyctl secrets set SENTRY_DSN="..." --app migrate-bot-runner-prod  # 任意
```

### §8.4 RUNNER_IMAGE を更新

§8.2 deploy 後、出力の `image: registry.fly.io/migrate-bot-runner-prod:deployment-XXXX`
を `apps/api/wrangler.toml` の `[env.prod.vars] RUNNER_IMAGE` に反映 → 再 deploy。

### §8.5 自動起動 machine の destroy

dev と同様、`flyctl deploy` 後に standby machine が自動起動するため:
```powershell
flyctl machines list --app migrate-bot-runner-prod
flyctl machines destroy <id> --force --app migrate-bot-runner-prod
```

---

## §9. Stripe Live activation

### §9.1 申請 (P3-1)

§3 と §4 と §7.5 完了後、以下を Stripe Dashboard で確認できる状態にする:
- `https://migrate-bot.dev/` で landing page
- `https://migrate-bot.dev/legal/terms` 等で 4 法務文書
- 価格表が landing に表示
- contact email が footer に表示

→ Stripe Dashboard 右上 "Activate payments" をクリック → フォーム入力。
詳細フィールドは `apps/api/src/routes/checkout.ts` のコメント参照。

### §9.2 承認後

1. `STRIPE_SECRET_KEY` を Live mode の `sk_live_...` に更新
2. Stripe Dashboard で本番 webhook endpoint 作成
   - URL: `https://api.migrate-bot.dev/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`,
     `charge.refunded`
3. Webhook secret (`whsec_...`) を `STRIPE_WEBHOOK_SECRET` に登録 (env=prod)
4. wrangler deploy --env=prod で反映
5. 本番テスト: 自分の card で $99 を実際に決済 → ジョブ実行 → 自分への返金処理
   で動作確認 (手数料 $0.30 + 3.6% は戻らないが「動作確認費」として割切)

---

## §10. Sentry (任意)

### §10.1 プロジェクト作成

1. https://sentry.io/signup/ で free Developer plan に登録
2. 3 つのプロジェクトを作成:
   - `migrate-bot-api` (Cloudflare Workers)
   - `migrate-bot-web` (Cloudflare Workers)
   - `migrate-bot-runner` (Node.js)
3. 各プロジェクトの DSN をコピー

### §10.2 secrets に登録

```powershell
# apps/api
corepack pnpm exec wrangler secret put SENTRY_DSN --env=prod  # api 用 DSN

# apps/web
cd apps/web
corepack pnpm exec wrangler secret put SENTRY_DSN --env=prod  # web 用 DSN

# apps/runner (Fly.io)
flyctl secrets set SENTRY_DSN="..." --app migrate-bot-runner-prod  # runner 用 DSN
```

すべて設定後、wrangler / flyctl の deploy で反映。

### §10.3 動作確認

意図的に例外を発生させて Sentry Dashboard に表示されることを確認:
```powershell
# 例: 存在しない job ID で internal API を叩く
$token = "<INTERNAL_API_TOKEN>"
Invoke-RestMethod -Uri "https://api.migrate-bot.dev/internal/jobs/nonexistent" `
  -Headers @{ Authorization = "Bearer $token" }
```

---

## §11. ローンチ前最終チェックリスト

`docs/roadmap.md` §2 の項目を上から順に確認:

- [ ] §2.1 機能面: golden corpus 全件で CI green
- [ ] §2.2 法務: 4 文書公開済 + リーガルレビュー完了
- [ ] §2.3 運用: Sentry 設定、キー管理ルール、インシデントランブック
- [ ] §2.4 マーケティング: landing 完成、デモ動画、告知文ドラフト (§6 確認必須)
- [ ] §2.5 セキュリティ: secrets ローカル残存なし、最小権限、CSP / セキュリティヘッダ

---

## §12. ローンチ告知 (P4)

CLAUDE.md §6 確認必須 (公開文言)。

`docs/templates/launch-announcements/` (Phase 4 後半で作成予定) に以下を起草 →
operator レビュー → 投稿:

- HN: "Show HN: migrate-bot — Pages Router → App Router migration as a draft PR"
- Reddit r/nextjs: タイトル + 本文
- X (Twitter): スレッド (3-5 ポスト)

**重要**: 同日に複数プラットフォーム投稿しない (HN は 1 投稿/月制限)。
推奨: 月-木の朝 (PT 7-9am 着) に HN 投稿、24h 後に Reddit、48h 後に X。

---

## 関連ドキュメント

- 憲章: `CLAUDE.md`
- ロードマップ: `docs/roadmap.md` §1.5, §2
- dev 環境構築: `docs/phase-2-deployment.md`
- 事業: `docs/business.md` §4
- セキュリティ: `docs/security.md`
- 状態: `docs/status.md`
