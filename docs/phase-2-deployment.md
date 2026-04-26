# Phase 2 デプロイガイド (operator 用)

> Last reviewed: 2026-04-26
> 関連: `docs/architecture.md`, `docs/security.md`, `docs/roadmap.md` §1.3

Phase 2 完了基準（自分のテスト repo で Webhook → Queue → Fly.io ジョブ → draft PR）
を満たすために必要な外部サービスの登録・接続手順。憲章 §6 に該当する課金・
セキュリティ判断を含むため、各ステップで operator が承認したうえで実行する。

---

## §0. 月額固定費の合意（憲章 §6）

| サービス | 月額目安 | 必須？ | 備考 |
|---|---|---|---|
| GitHub App | $0 | ✅ | webhook 配信元 |
| Cloudflare Workers Paid | $5 | ✅ | apps/api ホスト。無料 plan は CPU 時間制限が厳しい |
| Cloudflare D1 | 無料枠で開始 | ✅ | 5GB / 25M reads / 50K writes 無料 |
| Cloudflare Queues | 無料枠で開始 | ✅ | 100k messages/day 無料、$5/mo で 100M |
| Fly.io | $5 (使用量次第) | ✅ | shared-cpu-1x で 1 ジョブ数分 |
| Sentry Team | $26 | ⚠ Phase 4 | 監視。Phase 2 はログのみで OK |
| ドメイン | $1/月換算 | ⚠ Phase 4 | landing 時に取得 |
| Resend | 無料 | ⚠ Phase 3 | メール (返金通知等) |
| Stripe | 取引手数料のみ | ⚠ Phase 3 | 課金 |

**Phase 2 で発生する固定費合計: 月 $10〜$15 程度** (Cloudflare $5 + Fly.io ~$5 + 余裕)。
予算ライン (`docs/business.md` §4.5 固定費 $35/mo) の半分以下に収まる。

✅ **operator: この合計額で進めることを確認してから §1 以降に進む**。

---

## §1. GitHub App 登録 (dev / prod 2 つ)

### §1.1 dev 用 App

1. https://github.com/settings/apps/new
2. **GitHub App name**: `migrate-bot-dev` (任意、global unique)
3. **Homepage URL**: 仮で `https://example.com` (後で landing に置換)
4. **Webhook**:
   - **Active**: ON
   - **Webhook URL**: 仮で `https://migrate-bot-api-dev.<your-cf-subdomain>.workers.dev/webhooks/github`
   - **Webhook secret**: ランダム 32 バイト hex (例: `openssl rand -hex 32` / PowerShell `-join (1..32 | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })`)。控えておく
5. **Permissions** (architecture.md §3.2 / security.md §):
   - **Contents**: Read & write (branch push のため)
   - **Pull requests**: Read & write (draft PR 作成)
   - **Metadata**: Read (default)
6. **Subscribe to events**:
   - Installation
   - Installation repositories
   - Push (Phase 2 後半で使う想定、今は subscribe だけ)
7. **Where can this GitHub App be installed?**: Only on this account
8. **Create GitHub App** クリック後の画面で:
   - **App ID** を控える (整数)
   - **Generate a private key** で .pem をダウンロード（再表示不可）
   - .pem は安全な場所に保存 (`.env.local` ではなく secrets manager 推奨、Phase 2 では一時的に local の暗号化保管)

### §1.2 prod 用 App

dev と同じ手順で `migrate-bot-prod` を別途作成。Webhook URL はあとで本番ドメインに置換。

> 当面 dev のみで Phase 2 完了基準を満たし、prod は Phase 4 (ローンチ) 直前に作る運用でも可。

---

## §2. Cloudflare アカウント + Workers Paid

### §2.1 アカウント作成

1. https://dash.cloudflare.com/sign-up でメール認証
2. ログイン後、**Workers & Pages → Plans** で **Paid ($5/mo)** にアップグレード
   - 課金: クレジットカード or PayPal
   - **Spend limit を $20/mo に設定**（Workers の使用量次第で従量課金されるため上限を切る）

### §2.2 wrangler CLI

```powershell
# operator のローカルで:
corepack pnpm add -g wrangler   # またはプロジェクト dev dep に追加 (推奨)
wrangler --version
wrangler login
```

### §2.3 D1 データベース作成

```powershell
wrangler d1 create migrate-bot-dev
# 出力された database_id を apps/api/wrangler.toml の [[d1_databases]] に貼る
```

スキーマ適用 (Phase 2 後半で `drizzle-kit generate` 経由に置換予定):

```powershell
# 当座は packages/db のテスト SETUP_SQL を D1 に直接適用
wrangler d1 execute migrate-bot-dev --file=packages/db/migrations/0001_init.sql
```

> migrations/ はまだ未生成。`pnpm --filter @migrate-bot/db generate` で
> drizzle-kit が SQL を出力する仕組みが Phase 2 後半に追加される。

### §2.4 Queues 作成

```powershell
wrangler queues create migrate-bot-jobs
# apps/api/wrangler.toml の [[queues.producers]] のコメントを外して有効化
```

### §2.5 Secrets 設定

```powershell
wrangler secret put GITHUB_WEBHOOK_SECRET   # §1.1 の hex を入力
wrangler secret put GITHUB_APP_ID            # §1.1 の App ID を入力
wrangler secret put GITHUB_APP_PRIVATE_KEY   # §1.1 の .pem の中身を貼り付け
```

### §2.6 デプロイ

```powershell
corepack pnpm --filter @migrate-bot/api exec wrangler deploy
```

成功すると `https://migrate-bot-api-dev.<subdomain>.workers.dev` が払い出される。

### §2.7 webhook 接続確認

GitHub の dev App 設定画面で **Webhook URL** を上記の Workers URL に書き換え。
**Recent Deliveries** タブから `Redeliver` で動作確認。Workers の Logs に
`[migrate-bot-api]` が出れば接続成功。

---

## §3. Fly.io アカウント + runner デプロイ

### §3.1 アカウント作成

1. https://fly.io/app/sign-up でアカウント作成 + クレジットカード登録
2. **Spend limit / alert** を `$10/mo` に設定（dashboard から）

### §3.2 flyctl CLI

```powershell
# Windows PowerShell:
iwr https://fly.io/install.ps1 -useb | iex
flyctl version
flyctl auth login
```

### §3.3 runner アプリ作成

```powershell
cd apps/runner
flyctl launch --name migrate-bot-runner-dev --no-deploy
# 既存の fly.toml を尊重するか聞かれたら yes
```

### §3.4 secrets

```powershell
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-...
flyctl secrets set GITHUB_APP_ID=<id>
flyctl secrets set GITHUB_APP_PRIVATE_KEY="$(Get-Content path/to/private-key.pem -Raw)"
```

> D1 へのアクセスは Phase 2 後半で実装。Workers binding を使えるのは Workers のみなので
> runner からは HTTP 経由で D1 を叩く別 Worker を立てる or Cloudflare Tunnel
> を使う方針を検討中。

### §3.5 イメージビルドとデプロイ (Phase 2 後半)

```powershell
flyctl deploy
# モノレポビルドが通れば machine を 1 台立てる (auto_stop_machines=true で待機 0)
```

---

## §4. デプロイ後の動作確認 (Phase 2 完了基準)

1. **テスト repo に GitHub App をインストール**
   - dev App の **Install App** 画面で自分のテスト repo を選ぶ
2. **webhook 受信確認**
   - Workers の Logs に installation event が記録されることを確認
3. **手動でジョブ起動** (まだ Queue 連携が wired していない Phase 2b 段階):
   ```powershell
   corepack pnpm --filter '@migrate-bot/cli' exec tsx src/index.ts admin-trigger 12345 octocat/hello
   ```
4. **Phase 2 後半完了後**: webhook 受信 → Queue → Fly.io machine 起動 → migrate → draft PR 作成
   までが自動で動くこと。

---

## §5. 撤退手順

うまく行かない / 一時停止したい場合:

| 何を止めるか | コマンド |
|---|---|
| GitHub App | dashboard で **Suspend** または **Delete** |
| Cloudflare Workers | `wrangler delete` で worker 削除 (D1/Queues は別 lifecycle) |
| Cloudflare Workers Paid | dashboard で **Cancel plan** (請求は当月分のみ) |
| Fly.io app | `flyctl apps destroy migrate-bot-runner-dev` |
| Cloudflare アカウント | dashboard で **Close account** (請求停止) |

`wrangler.toml` / `fly.toml` の値を消したり repo を削除しても課金が止まる
わけではない。**ダッシュボード側でアカウント / プラン解約まで実行する**。

---

## §6. セキュリティチェックリスト (デプロイ前)

`docs/security.md` 準拠:

- [ ] GitHub App private key を `.env.local` 等に置いていない (Workers/Fly secrets のみ)
- [ ] webhook secret を git に commit していない
- [ ] Cloudflare D1 の database_id 自体は機密ではないが、内容 (顧客 email 等) は機密
- [ ] Anthropic API key は `wrangler secret` / `fly secrets` で設定（コードに埋め込まない）
- [ ] Spend limit (Cloudflare $20、Fly $10) が設定済
- [ ] dev / prod の App / D1 / queue が分離されている

---

## §7. operator の作業順序まとめ

1. §0 の合計月額に合意
2. §1.1 dev GitHub App 登録 (秘密鍵を安全に保管)
3. §2.1〜§2.5 Cloudflare アカウント + secrets 設定
4. **コード側で Phase 2 後半の wiring が完了するまで §2.6 以降は保留**
5. §2.6 deploy + §2.7 webhook 接続確認
6. §3.1〜§3.4 Fly.io アカウント + secrets
7. §3.5 deploy (Phase 2 後半完了後)
8. §4 動作確認

> Phase 2 後半の wiring (D1/Queues 接続、agent パイプライン統合) は次のセッションで
> Claude Code が実装する。それまで operator は §0〜§3.4 まで進めれば OK。
