# Stripe Live activation 申請 runbook

> **目的**: Stripe アカウントを Test mode から Live mode (本番決済) に切り替えるための申請・承認・本番反映手順の完全ガイド。
>
> **想定 operator**: 日本居住・個人事業主・開業届未提出・米ドル建てグローバル販売の SaaS 運営者 (本プロジェクト固有条件)。
>
> **所要時間**:
> - 申請フォーム入力: 30-60 分
> - Stripe 審査: 通常 1-3 営業日、長い場合 1-2 週間
> - 承認後の本番反映: 30 分程度

---

## §1. Pre-application checklist (申請前準備)

申請フォーム入力中に書類が手元にないと中断するので、**すべて揃えてから着手**。

### §1.1 本人確認書類 (KYC)

Stripe Japan は以下のいずれか 1 点を要求:

- [ ] **マイナンバーカード** (推奨、両面)
- [ ] **運転免許証** (両面)
- [ ] **パスポート** (顔写真ページ + 住所記載ページ)
- [ ] **在留カード** (外国籍の場合、両面)

要件:
- 有効期限内
- 鮮明 (スマホ撮影なら室内灯+影なし)
- 端まで写る (切れない)
- 反射なし

### §1.2 マイナンバー (個人番号)

Stripe Japan は 個人事業主の本人確認に**マイナンバー必須**。

- [ ] マイナンバーの 12 桁を控えておく (通知カード or マイナンバーカードで確認)

### §1.3 銀行口座情報

Stripe からの売上振込先 (Japan 国内銀行のみ、外貨建ては自動 JPY 変換):

- [ ] 銀行名
- [ ] 支店名 / 支店コード (3 桁)
- [ ] 口座種別 (普通 / 当座)
- [ ] 口座番号 (7 桁)
- [ ] 口座名義 (カタカナ、半角)
  - 個人口座でも OK (例: `サワイ イサキ`)
  - 屋号付き口座があれば優先 (例: `migrate-bot サワイ イサキ`)
- [ ] 通帳の表紙 + 開いた最初の page の写真 (任意だが追加質問防止のため準備)

### §1.4 事業情報

- [ ] **事業名 / 屋号**: `migrate-bot`
- [ ] **代表者氏名**: `澤井功樹` (カナ: サワイ イサキ — ⚠ "イサキ" は誤読されがち、申請時 Stripe 側の照合で問題になりうるので確実に控える)
- [ ] **事業形態**: 個人事業主 (sole proprietor)
- [ ] **開業届**: 未提出 (Stripe は確認しない、税務署との関係であり Stripe には開示不要)
- [ ] **業種 (MCC)**: 候補 2 つ
  - **5734** Computer Software Stores
  - **7372** Computer Programming Services
  - → **5734 を推奨** (SaaS 販売の標準)
- [ ] **事業内容説明** (英語推奨、Stripe 内部審査者は英語):
  ```
  migrate-bot is an automated software migration service that converts
  Next.js applications from the legacy Pages Router to the App Router
  architecture. Customers install our GitHub App, pay a one-time fee
  (Small $99, Medium $249, Large $499) via Stripe Checkout, and receive
  a draft pull request with the migrated codebase. We use Anthropic's
  Claude API to perform the code transformation. All processing is
  automated; no manual labor is involved per customer order.
  ```
- [ ] **Webサイト URL**: `https://migrate-bot.dev`
- [ ] **法務文書 URL** (Stripe 審査担当者が閲覧):
  - 利用規約: `https://migrate-bot.dev/legal/terms`
  - プライバシーポリシー: `https://migrate-bot.dev/legal/privacy`
  - 返金ポリシー: `https://migrate-bot.dev/legal/refunds`
  - 特商法表記: `https://migrate-bot.dev/legal/specified-commercial-transactions`

### §1.5 事業所住所

- [ ] **〒651-0094 兵庫県神戸市中央区琴ノ緒町五丁目二番二号 三信ビル401**
- [ ] **Karigo 利用契約書** (PDF) を手元に保管 (※ Stripe 審査で「住所の使用権」を追加質問される可能性 30% 程度。聞かれたら即提出できるよう用意)
  - Toones の管理画面 (`https://voffice.toones.jp/voffice_user_plans/`) からダウンロード可能
  - 契約書がない場合は Karigo Support (`kobe@karigo.net`) に依頼

### §1.6 連絡先

- [ ] **Support email**: `support@migrate-bot.dev`
- [ ] **電話番号**: operator 携帯番号 (Stripe には開示、公開はされない)

### §1.7 売上 / 取引予測 (Stripe フォームの記入用)

- [ ] **想定月商 (推測 OK)**: $500 - $2,000 (= 月 5-20 件の注文想定、現実的な launch 初期予測)
- [ ] **平均取引額**: $249 (Medium プランを中央値想定)
- [ ] **最大取引額**: $499 (Large プラン)
- [ ] **想定返金率**: < 5% (Refund Policy で 14 日全額返金保証あるが実発生は限定的想定)
- [ ] **charge timing**: Immediately at checkout (即時決済、サービス開始前)

---

## §2. 申請手順 (Stripe Dashboard)

### §2.1 Dashboard アクセス

1. https://dashboard.stripe.com/ にログイン (現在 Test mode で動作中のアカウント)
2. 右上の **Test mode** トグルを **Off** にする (Live mode に切替試行)
3. 「**Activate your account**」 (本番化) ボタンが表示される → クリック

### §2.2 業種選択

- **Business type**: Individual / Sole proprietor
- **Country**: Japan
- **Currency**: JPY (default)
  - ※ USD acceptance は別画面で後ほど設定 (settings → Currency)

### §2.3 本人情報

- 漢字氏名: 澤井 功樹
- カナ氏名: サワイ イサキ
- 生年月日: (operator のもの)
- 性別 (Stripe Japan は必須)
- マイナンバー: §1.2 で控えた 12 桁
- 自宅住所: (operator の自宅住所、Karigo 住所ではなく**実居住地**を入力)
  - Stripe は本人確認のために実居住地を要求
  - これは Stripe 内部のみで使用、顧客には開示されない
- 電話番号: §1.6 の携帯番号

### §2.4 事業情報

- 屋号: migrate-bot
- 事業所所在地: §1.5 の Karigo 住所
  - ⚠ Stripe フォームは「事業所所在地」と「本人住所」を別欄で入力させる。本人住所は §2.3 の自宅、事業所は Karigo
- 業種 (MCC): 5734 Computer Software Stores
- 事業説明: §1.4 の英語説明文を貼り付け
- Web サイト: https://migrate-bot.dev

### §2.5 売上予測

- 月商見込み: $500-2,000 USD相当 (= ¥75,000 - ¥300,000 で入力推奨)
- 平均取引額: $249 (= 約 ¥37,000)
- charge timing: Immediately

### §2.6 銀行口座

- §1.3 の情報を入力
- 名義は通帳記載のとおり半角カナで正確に
- Stripe は名義一致を厳密にチェック、1 文字違いで差し戻し

### §2.7 本人確認書類アップロード

- §1.1 の書類を撮影してアップロード
- 表面 + 裏面 を別々にアップロード (運転免許証等)

### §2.8 利用規約への同意 + 申請送信

- Stripe Services Agreement (日本版) への同意 checkbox
- **Submit** ボタンで申請完了

### §2.9 セキュリティ対策措置状況申告書 (Stripe からの追加要求、確率 ~100%)

**実体験 (2026-05-13)**: 主フォーム提出の数時間後、Stripe Support からセキュリティ対策に関する申告書フォームの URL がメールで届く。割賦販売法・改正割販法に基づく必須項目として、6 セクション × ドロップダウン形式 + 1 セクションのチェックボックスを記入。

各セクションの想定回答 (SaaS 個人事業主の場合):

| セクション | 項目 | 推奨回答 |
|---|---|---|
| 1. アクセス制御 | OS/MW のセキュリティパッチ適用 | はい |
| 1. アクセス制御 | 不要なサービスの停止 | はい |
| 1. アクセス制御 | 強固なアクセス制御 | はい |
| 2. ネットワークセキュリティ | WAF / IDS 相当の防御 | はい (Cloudflare Workers なので) |
| 2. ネットワークセキュリティ | アップロード可能な拡張子・ファイルを制限 | **該当なし** (migrate-bot にアップロード機能はない) |
| 3. Web アプリケーションの脆弱性対策 | 脆弱性診断/ペネトレーションテスト定期実施 | はい (**強制**、フォームが「いいえ」を許容しない。実態は `pnpm audit` + 静的解析 + Pass 8 までの security review log で代替) |
| 4. ログ取得 | 全 access / 操作ログを取得 | はい (Cloudflare Workers ログ + D1 audit) |
| 5. 暗号化 | 通信は HTTPS、保存データは暗号化 | はい (Cloudflare HTTPS + D1 encrypted at rest) |
| 6. インシデント対応 | インシデント発生時の連絡先・体制 | はい (`support@migrate-bot.dev`) |
| 委託先情報 | データ処理委託先 | Anthropic / GitHub / Cloudflare / Fly.io / Stripe / Resend を列挙 |
| 責任者氏名 | | 澤井 功樹 |
| 申告日 | | 当日 |

⚠ §3-1 の「脆弱性診断またはペネトレーションテストを定期的に実施」項目は**「はい」でなければ提出できない**強制項目。後追いで Stripe から具体的なツール名を聞かれた場合は「`pnpm audit` 定期実行 + TypeScript strict + ESLint + Pass 8 までの security self-review (`docs/legal-self-review-log.md`)。外部ペネトレーションテストは顧客ベース拡大後に導入予定」と回答可能。

提出後は「アカウントのステータス」画面の「要対応」タブが空になれば完全承認。

---

## §3. 申請後の流れ

### §3.1 自動受付 (申請直後)

- Stripe から `Your account is under review` メール (即時)
- Test mode の機能は引き続き使用可能 → 現状の動作確認は影響なし

### §3.2 審査 (1-3 営業日が目安)

審査担当者が以下をチェック:
1. 本人確認書類の鮮明度・有効期限
2. マイナンバーの形式
3. 銀行口座名義の一致
4. **Webサイト の確認** ← migrate-bot.dev を実際にブラウザで開いて確認:
   - landing page が SaaS としてまともか
   - 法務 4 ページが揃っているか (URL を辿る)
   - 価格・refund policy が明示されているか
   - support 連絡先が明示されているか
5. 事業説明の妥当性

### §3.3 追加質問の可能性 (確率 30-40%)

以下のケースで Stripe Support から追加メールが来る可能性:

| 質問内容 | 対応 |
|---------|------|
| 「事業所住所が virtual office のようですが、Karigo の利用契約書を提示してください」 | §1.5 で準備した Karigo 利用契約書 PDF を返信添付 |
| 「事業説明をもう少し具体的に」 | §1.4 の説明 + 「我々は GitHub App として動作し、顧客の Next.js リポジトリを App Router に移行する。1 件あたり 5 分〜数時間で完了。全て自動」と補足 |
| 「想定月商を支える根拠は?」 | 「Phase 4 ローンチ初期想定。月商 ¥10 万-30 万を 3-6 ヶ月で達成目標」と回答 |
| 「同種サービスの実績は?」 | 「本サービスは新規ローンチで実績ゼロ。先行的に法務文書・refund policy・GDPR 域外性確保を整備済」と正直に回答 |

返信は **24 時間以内** が推奨。長引くと審査が更に遅延。

### §3.4 承認 or 拒否

**承認**: `Your Stripe account has been activated` メール + Live mode 自動有効化
**拒否**: 理由メールあり、対応指示に従って再申請

---

## §4. 承認後の本番反映

> **実体験 (2026-05-13)**: 以下の手順で実行したが、`corepack pnpm exec wrangler ...` が PowerShell の PATH 問題で `pnpm: 用語が認識されません` で失敗。代替として **`npx wrangler ...`** を使用したところ問題なく完了。Node.js 同梱の `npx` は `apps/api/node_modules/.bin/wrangler` を自動で探すため最も堅い。以下のコマンドはすべて `npx wrangler` 表記に統一する。

### §4.0 Prerequisite チェック (実体験で抜けやすい項目)

承認後すぐ実カードテストに進む前に、以下が prod 環境に揃っているか確認:

- [ ] **apps/web `/post-install` ルート**: GitHub App Setup URL からの redirect 先 (`https://migrate-bot.dev/post-install?installation_id=...`)。Phase 4 初期デプロイで抜け落ちて 404 を返していた。`apps/web/src/app.ts` に GET / POST ハンドラがあるか確認 (`a389c54` で追加)。
- [ ] **runner image が最新**: `apps/api/wrangler.toml` の `RUNNER_IMAGE` が R1-R5 + Batch E/F + skippedTaskIds 修正を含む最新 image を指しているか。古いままだと auto-refund flow が未デプロイで failure 時に手動 refund が必要になる。確認方法は `git log --oneline -- apps/api/wrangler.toml` で最新 commit を見る。
- [ ] **dev 環境で動作する webhook イベント一覧**: Test mode の webhook 設定で何を購読しているか確認し、Live mode でも同じイベントセットを設定する。

### §4.1 Live mode の API key 取得

1. https://dashboard.stripe.com/apikeys にアクセス
2. **Live mode** に切替 (右上トグル)
3. **Reveal live key token** をクリック → `sk_live_...` をコピー
4. 公開可能 key (`pk_live_...`) も控えておく (Phase 5 以降の landing JS で必要になる可能性)

### §4.2 Worker secrets 更新

```powershell
# apps/api で STRIPE_SECRET_KEY を Live mode key に置換
cd "C:\Users\FroGr\Desktop\Claude Code Projects\apps\api"
npx wrangler secret put STRIPE_SECRET_KEY --env=prod
# プロンプトで sk_live_... を貼り付け
```

期待出力: `🌀 Creating the secret for the Worker "migrate-bot-api-prod"` + `✨ Success! Uploaded secret STRIPE_SECRET_KEY`。Worker 名末尾が **`-prod`** であることを必ず確認 (もし `-dev` で出たら `--env=prod` が効いていない or 別ディレクトリ)。

### §4.3 Live mode Webhook 作成

1. https://dashboard.stripe.com/webhooks にアクセス (Live mode で、URL に `/test/` を含まないこと)
2. **エンドポイントを追加** / **Add endpoint** をクリック
3. 「お客様のアカウント」を選択 (Connect プラットフォームではない)
4. API バージョン: 最新の dahlia 系で OK
5. イベント選択 (2 件):
   - `checkout.session.completed`
   - `charge.refunded`
6. 「続行」 → 送信先タイプ「Webhook エンドポイント」 → 「送信先を設定する」画面で:
   - **エンドポイント URL**: `https://api.migrate-bot.dev/webhooks/stripe` ← ⚠ **`/stripe/webhook` ではない**。実体験 (2026-05-13) で path を間違えて作成し、後で修正した。`apps/api/src/app.ts` の `app.route('/webhooks/stripe', ...)` に従う
   - **送信先名**: `migrate-bot-api-prod` (Cloudflare Worker 名と揃えると追跡しやすい)
7. **作成** で保存
8. 作成された webhook 詳細ページで **Signing secret** (`whsec_...`) をコピー (「クリックして表示」が必要な場合あり)
9. Worker secret に登録:

```powershell
cd "C:\Users\FroGr\Desktop\Claude Code Projects\apps\api"
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env=prod
# プロンプトで whsec_... を貼り付け
```

### §4.4 wrangler deploy で反映

```powershell
cd "C:\Users\FroGr\Desktop\Claude Code Projects\apps\api"
npx wrangler deploy --env=prod
```

deploy 出力で以下を確認:
- Worker 名: `migrate-bot-api-prod`
- Bindings: `JOBS_QUEUE`, `DB`, `ENVIRONMENT: prod`, `INTERNAL_API_URL: https://api.migrate-bot.dev` 等
- `Producer for migrate-bot-jobs-prod` + `Consumer for migrate-bot-jobs-prod` トリガー

### §4.5 USD 通貨設定 (任意、現状で USD 受付可能か確認)

1. https://dashboard.stripe.com/settings/payments にアクセス (Live mode で)
2. **Currencies** セクション
3. USD が有効になっているか確認
4. 無効なら **Enable USD** をクリック
   - JPY が default settlement currency になる (= USD 受領後、Stripe が自動で JPY に変換して入金)
   - **為替手数料 2%** が Stripe 取り分から追加で発生
   - 実質手数料: 3.6% (decimal/AMEX 3.95%) + 2% (FX) + ¥0 (JCB/Diners) = **約 5.6% / 取引**
   - $99 → 顧客請求 → Stripe 受領 → ~$93.5 → ¥(現相場 ≈ 150 で) ¥14,000 銀行入金

### §4.6 本番テスト (運用初日のみ)

実カードでの初回 E2E テスト前に、**並行で 2 つのログ監視ウィンドウを起動**:

```powershell
# ウィンドウ 1: apps/api prod ログ (最重要、webhook 受信が見える)
cd "C:\Users\FroGr\Desktop\Claude Code Projects\apps\api"
npx wrangler tail --env prod

# ウィンドウ 2: runner ログ (clone → plan → migrate → verify → push)
$env:PATH = "C:\Users\FroGr\.fly\bin;$env:PATH"
flyctl logs -a migrate-bot-runner-prod
```

テスト用 repo の準備 (持っていなければ新規作成):

```powershell
# 最小 Pages Router サンプル: pages/index.tsx + _app.tsx + _document.tsx + api/hello.ts
# 推奨は 5-10 ファイル程度。docs/runbooks/ 配下に scaffold スクリプト追加候補
gh repo create Garoro0920/migrate-bot-prod-test --private --source=. --remote=origin --push
```

実行:

- [ ] `https://migrate-bot.dev` から GitHub App を install (テスト repo 選択)
- [ ] post-install ページのフォームに email / repo / Small プラン入力 → checkout
- [ ] 自分の card で $99 (Small プラン) を Live mode で実際に決済
- [ ] wrangler tail で `POST /webhooks/stripe - Ok` 確認
- [ ] flyctl logs で `runner finished: state=pr_ready aborted=false prUrl=...` 確認
- [ ] GitHub で draft PR 確認 (`app/` 配下が期待通り、`failed tasks: 0` が PR body にある)
- [ ] support@migrate-bot.dev に「Migration ready」メールが届くか確認 (Resend 配信)
- [ ] 動作確認後、自分への refund 処理を test (Stripe Dashboard → Payments → 該当 charge → 返金ボタン、`charge.refunded` webhook が動くか確認)
- [ ] 手数料 $0.30 + 3.6% = 約 $3.86 + 2% FX ≈ $5.85 は戻らない → 「動作確認費」と割切

⚠ **launch blocker が発覚しうるタイミング**: 初回 E2E で agent が `_document.tsx` を持つ repo で失敗する場合がある (2026-05-13 に発生)。修正済 (`1e28460`) だが、runner image が古いまま使われていると再発するので §4.0 の prerequisite を必ずチェック。失敗した場合は手動 refund 後、`node scripts/deploy-runner-and-update-image.mjs --env=prod` で runner image を最新化してから再テスト。

---

## §5. 想定リスク・対応策

### §5.1 審査差し戻し (確率 20-30%)

最頻原因と対応:

| 差戻し原因 | 対応 |
|---------|------|
| 本人確認書類が不鮮明 | スマホで再撮影 (室内灯下、無反射) |
| マイナンバーの形式不正 | 12 桁が正しいか再確認 |
| 銀行口座名義不一致 | 通帳と一字一句合わせる (半角カナ) |
| Webサイトの法務情報不足 | (今回対応済) |
| 事業説明が曖昧 | 具体例を追加 (例: "we automate the conversion of `pages/` to `app/` directory using Anthropic's Claude API") |

### §5.2 個人事業主の住所が Karigo 住所の場合の追加質問 (確率 30%)

Stripe 担当者は virtual office を「shell company」として警戒する場合がある。対応:
1. **Karigo 利用契約書 PDF** を即時返信
2. メール本文に「Karigo は日本国内の正規 virtual office service。当方は個人事業主として継続利用契約を締結済」と説明
3. 自宅住所も併記 (Stripe 内部のみ参照、顧客非開示)

### §5.3 USD 売上で「マネーロンダリング」関連の質問

低確率だが、米ドル建てで日本居住者という珍しい組み合わせで以下が来る可能性:
1. 「なぜ JPY 建てではなく USD 建てなのか?」
   - 「英語圏顧客が主たる ICP のため、USD 建てが市場標準」と回答
2. 「想定顧客の国別内訳は?」
   - 「米国 40-50%、英語圏他 (UK 除く、Australia / Canada / NZ) 20-30%、その他 20-30%」と回答
3. 「EU 顧客は?」
   - 「ToS §2 で EEA/UK/Switzerland 居住者は除外している。GDPR 適用外を確保」と回答

---

## §6. 申請完了後の operator TODO

### §6.1 すぐに

- [ ] 申請完了スクリーンショットを保管 (`docs/` 配下にいるかどうかは個人情報なので含めない)
- [ ] Stripe からの確認メール (申請受付) の保管

### §6.2 1-3 営業日後 (審査中)

- [ ] 毎営業日朝にメールを確認 (追加質問があれば即対応)
- [ ] 追加書類請求が来たら 24 時間以内に返信

### §6.3 承認後

- [ ] §4 の本番反映手順を実施
- [ ] §4.6 の本番テスト (自分で $99 決済 → migration → refund)
- [ ] `docs/status.md` の Stripe Live activation を ✅ に更新
- [ ] (任意) ローンチ告知 (HN / Reddit / X) の準備に着手

---

## §7. 参考: 既存 Test mode 環境への影響

- Test mode は申請中も**継続使用可能** (本プロジェクトで PR #6 / #7 で確認済)
- Live mode 切替後も Test mode は別 namespace で残る (`sk_test_...` のまま動く)
- Webhook も Test 用 / Live 用で別 endpoint (現状は Test 用が登録済 → Live 用を §4.3 で追加作成)
- 開発・テストは引き続き Test mode で実施可能 (現 staging 環境を維持)

---

**Last updated**: 2026-05-14 (2026-05-13 申請 + 承認、2026-05-14 prod E2E 完走後、実体験で §2.9 security checklist / §4.0 prerequisites / §4.2-§4.6 を全面的に書き直し)
