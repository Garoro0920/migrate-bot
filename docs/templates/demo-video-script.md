# Demo Video Script — migrate-bot

> Status: DRAFT — operator が録画前にレビュー
> 想定尺: **3 分 30 秒 〜 4 分**(短いほうが拡散しやすい)
> 録画ツール: Loom / OBS / QuickTime のいずれか
> 公開先: YouTube unlisted、または Loom 共有 URL → landing page と告知文に貼る
> 言語: **English narration / English UI**(英語圏向け B2B 想定)
>
> ---
> ## 撮影前チェック
>
> - [ ] dev 環境(現状の workers.dev / fly.io dev image)で本番と同じ flow を再現
> - [ ] `Ga1or0920.main@gmail.com` 等の私的メアドが映らないテスト用メアドに切り替え
> - [ ] `5e9eba47...` 等の secrets / token は **絶対に映らない**ように
> - [ ] Stripe テストカード `4242 4242 4242 4242` 使用
> - [ ] テスト repo: `Garoro0920/migrate-bot-e2e-test`(既存)
> - [ ] ブラウザ: Chrome incognito で履歴・拡張無効
> - [ ] 解像度: **1920 × 1080(16:9)**
> - [ ] 字幕(英語)を後で乗せる前提でナレーション台本を書いている

---

## Section 0: Cold open(0:00 〜 0:08、8 秒)

### 画面

`migrate-bot.dev` landing page の **hero section** を画面いっぱいに表示。
Hero 見出し「**Pages Router → App Router, in a single draft PR.**」が中央。

### ナレーション(英語)

> "Migrating a Next.js codebase from Pages Router to App Router takes weeks.
> migrate-bot does it in minutes — for a flat fee, with a refund guarantee."

### 編集メモ

- BGM: 控えめなインスト(YouTube Audio Library で royalty-free)
- カット: ロゴ → hero の段階的アニメーション

---

## Section 1: The pricing(0:08 〜 0:30、22 秒)

### 画面

Landing page を下にスクロール → Pricing section の 4 cards 全部を映す。

### ナレーション

> "Three plans, one-time payment. Small at $99, Medium at $249, Large at $499.
> Plan is automatically picked from the file count under your `pages/` and
> `components/` directories. No subscription, no surprises. Enterprise and
> monorepo support is custom-quoted."

### カット

- 0:08 — Pricing 全体
- 0:18 — Medium card にズーム(most-popular badge)
- 0:24 — 14-day refund 文言にズーム

### 編集メモ

- "$99 / $249 / $499" を画面上に大きく重ねるテロップ
- 「14-day refund guarantee」をハイライト

---

## Section 2: How it works(0:30 〜 1:00、30 秒)

### 画面

How it works section の 3 step ボックス。

### ナレーション

> "Step one: install the GitHub App on a single repository. Step two: pay
> for the right plan via Stripe Checkout. Step three: review the draft
> pull request after our verify step — typecheck and `next build` — passes.
> Most jobs finish in five to fifteen minutes."

### カット

- 0:30 — 3 step 全体
- 0:38 — Step 1 ボックスズーム(install)
- 0:46 — Step 2 ボックスズーム(pay)
- 0:53 — Step 3 ボックスズーム(review)

---

## Section 3: Install the GitHub App(1:00 〜 1:25、25 秒)

### 画面

Landing 上部の「Install on GitHub →」CTA をクリック → GitHub App install 画面に遷移。

「Only select repositories」を選び、テスト repo `migrate-bot-e2e-test` を選択
→「Install」クリック。

### ナレーション

> "Click 'Install on GitHub'. Pick the single repository you want to migrate.
> migrate-bot only requests the minimum permissions: read-write on contents
> and pull requests, plus metadata. No actions, no secrets, no organization
> admin."

### カット

- 1:00 — landing の CTA クリック
- 1:05 — App install ページ
- 1:12 — 「Only select repositories」 + repo 選択
- 1:20 — Permissions 表示にズーム(`contents: write` `pull_requests: write` `metadata: read`)
- 1:24 — 「Install」クリック

### 編集メモ

- Permissions 部分はゆっくり、視聴者が読める速度で

---

## Section 4: Stripe Checkout(1:25 〜 2:05、40 秒)

### 画面

(simulated dashboard or curl response) で Stripe Checkout URL を取得 →
ブラウザで開く → Stripe のテストカード入力。

> 注: Phase 4 ローンチ時点でダッシュボードがあれば「dashboard で repo 選択 → checkout」
> の flow が望ましいが、現状は curl + Checkout URL を表示。録画で「ダッシュボード経由」を
> simulate する場合はモックを作って撮影。

### ナレーション

> "After install, you'll be guided to checkout. Pricing is set automatically
> based on the repository size we detected. Payment is handled by Stripe;
> we never see your card details. I'll use Stripe's test card here."

### カット

- 1:25 — Checkout URL に遷移
- 1:30 — Stripe Checkout の price 表示「$99.00」
- 1:38 — Card number 4242 入力
- 1:48 — Expiry / CVC 入力
- 1:55 — Pay $99.00 クリック
- 2:00 — Success page 表示「Payment received — we are on it.」

### 編集メモ

- Card 番号は **テストカード** だけ。本物の card は絶対映さない
- Success page の "We will email you when the PR is ready" を強調

---

## Section 5: The agent at work(2:05 〜 2:50、45 秒)

### 画面

(2 分割画面) **左側**: Gmail で `paymentReceived` メールが受信箱に届く瞬間。
**右側**: ターミナルで Worker tail / Fly logs(モックでも可)を流す → analyze →
plan → migrate → verify の各 stage が進む様子を 5 倍速等で。

### ナレーション

> "Within seconds you receive a confirmation email. Behind the scenes, our
> agent clones your repository to an isolated VM, runs analysis, plans the
> migration tasks, rewrites each file, and runs typecheck plus `next build`
> to verify the output. Your code never lives outside that VM, and is
> destroyed at job end."

### カット

- 2:05 — 受信箱に新着メール → 開いて「Migration job has started」確認
- 2:15 — ターミナル: analyze 開始 ログ
- 2:25 — plan / migrate ログ(ファイル名表示)
- 2:38 — verify(typecheck → next build)成功ログ
- 2:48 — 「runner finished: state=pr_ready」 ログ

### 編集メモ

- ログの実時間は 4-5 分なので **5 倍速 or タイムラプス**
- 「コードは VM 外に出ない」を文字で大きくテロップ

---

## Section 6: Review the draft PR(2:50 〜 3:30、40 秒)

### 画面

Gmail で `prReady` メール到着 → URL クリック → GitHub の draft PR ページ。
Files changed タブで diff を見せる。

### ナレーション

> "A few minutes later, the PR-ready email arrives with a direct link. The
> PR is in draft so your CI can run before you decide to merge. You can
> see exactly what changed: pages restructured under `app/`, getStaticProps
> rewritten as async server components, and so on. Review, run your tests,
> and merge when you're ready."

### カット

- 2:50 — Gmail で「PR ready for [repo]」メール
- 2:55 — メール内 PR URL クリック
- 3:00 — PR ページ(タイトル「[migrate-bot] Pages Router → App Router migration」、Draft tag)
- 3:08 — Files changed タブ → 実際の diff(例: `pages/index.tsx` 削除、`app/page.tsx` 追加)
- 3:18 — Specific file の diff にズーム — `getStaticProps` → async function
- 3:25 — PR 説明欄を表示(変更概要・file count・cost が記載)

### 編集メモ

- diff は **読める速度** で。流すだけは NG
- PR 説明欄は static で 3 秒キープ

---

## Section 7: Trust & Refund(3:30 〜 3:50、20 秒)

### 画面

Landing の Trust bar(14-day refund / no code retention / no training-data use /
draft not auto-merge)→ Refund Policy ページ。

### ナレーション

> "If our verify step can't reach a passing state within 14 days for reasons
> on our side, you get a full automatic refund. We never retain your code
> after the job, and we never use it to train any AI model. Anthropic's
> API terms back this up contractually."

### カット

- 3:30 — Trust bar 全体
- 3:36 — 「14-day refund」拡大
- 3:42 — Refund policy ページの section 1 「Refund-eligible scenarios」表示

### 編集メモ

- 信頼性の根拠を明示するセクション。短く端的に

---

## Section 8: Closing CTA(3:50 〜 4:00、10 秒)

### 画面

Landing page トップに戻る → Hero CTA 「Install on GitHub →」を表示。

### ナレーション

> "Stop putting off the migration. migrate-bot.dev — install, pay, review.
> One PR. Done."

### カット

- 3:50 — Hero に戻る
- 3:55 — `migrate-bot.dev` を画面下部のテロップ
- 3:58 — Logo + 「migrate-bot.dev」フェードアウト

### 編集メモ

- ロゴ アニメーション
- BGM フェードアウト

---

# 撮影 + 編集の checklist

## 撮影

- [ ] テスト repo (`Garoro0920/migrate-bot-e2e-test`) に App インストール状態を確認
- [ ] Stripe Test mode で動作 (Live mode はまだ)
- [ ] ブラウザ: Chrome 最新、incognito、拡張なし
- [ ] 全画面録画(1920×1080)、マウス strikes 表示
- [ ] 各セクションの**カット間で 1 秒余裕**(編集で詰められる)
- [ ] **ナレーションは別撮り**(画面録画と分けて録る → 後で同期)

## 編集

- [ ] BGM: YouTube Audio Library から royalty-free インスト
- [ ] テロップ: 全英語、Section 1 / Section 7 等の重要部分は英語と日本語両方検討
- [ ] エンディング: ロゴ + URL + 「Install on GitHub」 button の motion
- [ ] 字幕(英語)は CapCut / DaVinci Resolve 等で auto-generate → 手動修正

## 公開

- [ ] **YouTube unlisted** にアップロード(URL を landing page と告知文に埋め込む)
- [ ] サムネイル: 「Pages Router → App Router」のキャッチコピー入り
- [ ] description: landing URL + GitHub App install URL + Twitter handle
- [ ] **Loom 共有 URL のバックアップ** も用意(動画が削除されたとき用)

## NG 事項

- [ ] 個人情報(operator の本名・住所・電話・メアド)が映らない
- [ ] secrets / API keys / Stripe live key が映らない
- [ ] Stripe Live mode は使わない(テスト card のみ)
- [ ] 顧客の実 repo 名は使わない(テスト用 e2e-test repo のみ)

---

# 関連

- `apps/web/src/pages/landing.ts` — 動画内に映る landing の構造ソース
- `docs/templates/legal/refund-policy.md` — 14 日返金の根拠
- `docs/business.md` §4.1 — 価格表
- `docs/roadmap.md` §1.5 — Phase 4 §1.5 デモ動画要件
