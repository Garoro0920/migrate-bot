# Legal self-review log — Phase 4 launch (Case C)

> Last updated: 2026-04-30
> Reviewer: Claude Code (not a lawyer)
> Operator decision: ADR-0003 + 2026-04-30 conversation で Case C(法務レビュー
> 無しでローンチ、自己レビューで補完)を採択。理由は経済合理性(¥数十万円の
> 弁護士費用が現段階で確保できない)。
>
> **本ドキュメントは弁護士の代替ではなく、operator が自己責任で進めた
> due diligence の作業記録である**。将来予算が確保できた段階で正式な
> lawyer review に出す前提で残す(行政指導があった際の善意の自衛努力の
> 証跡としても機能)。

## 1. 採択方針

弁護士レビューを得られない代替として、以下の **multi-pass defense** を実施:

1. 一次資料(消費者庁・PPC 公式 + Anthropic DPA + 条文)を WebFetch で取得
2. 4 文書を 5 つの観点で順次レビュー(各 pass で観点を変える)
3. 別エージェントによる独立レビュー(自分のバイアス相互チェック)
4. 技術側で GDPR 適用域を切り捨てる実装(EU 居住者を Stripe Checkout で拒否)
5. 本作業記録を残す

## 2. 参照した一次資料

| 資料 | URL | 確認内容 |
|---|---|---|
| 消費者庁「特定商取引法・通信販売における表示」 | <https://www.no-trouble.caa.go.jp/what/mailorder/> | 11 条 必須表示 9 項目 + 「請求あれば開示」運用条件 |
| PPC「外国にある第三者への提供 ガイドライン」 | <https://www.ppc.go.jp/personalinfo/legal/guidelines_offshore/> | APPI 28 条 + 規則 17 条 必須項目(国名・制度・保護措置) |
| 国民生活センター「消費者契約法」 | <https://www.kokusen.go.jp/wko/kk/kk-keiyaku.html> | 8 条(免除無効)/ 9 条(損害賠償予定上限)/ 10 条(信義則違反)の要件 |
| 消費者契約法 全文 | <https://laws.e-gov.go.jp/law/412AC0000000061/> | 故意・重過失の文言(8 条)、平均的損害の額(9 条)、年 14.6%(9 条 2 項) |
| Anthropic Commercial Terms | <https://www.anthropic.com/legal/commercial-terms> | API 入力をモデル学習に使わない契約条項、DPA 参照 |
| Anthropic DPA | <https://www.anthropic.com/legal/data-processing-addendum> | SCC Module 2/3 incorporated、契約終了後 30 日以内データ削除、Subprocessor 15 日異議申立 |

## 3. パスごとの作業

### Pass 1 — 特定商取引法 11 条 9 項目チェック
**対象**: `docs/templates/legal/specified-commercial-transactions.md`

確認項目(消費者庁ガイドの 9 項目 + 動作環境等):

| 項目 | 状態 | 改訂内容 |
|---|---|---|
| 販売価格 | ✅ | USD + 邦貨概算併記("Small $99 ≈ ¥14,800")、Stripe レート明記 |
| 代金以外の必要料金 | ✅ | 為替・海外取引手数料を顧客負担と明記 |
| 代金支払時期・方法 | ✅ | Stripe Checkout 即時、5 種クレカ |
| 役務提供時期 | ✅ | 上限 14 日、超過時の自動全額返金を明記 |
| 申込み有効期限 | ✅ | 「定めなし(常時受付)」を追記 |
| 撤回・解除条件 | ✅ | 14 日返金、Refund Policy 参照 |
| 事業者氏名 / 代表者氏名 | ✅ | placeholder + 業務責任者を独立行に明記 |
| 所在地 | ✅ | Karigo 私書箱住所(契約後埋める)+ NOINDEX 適用済 |
| 電話番号 | ✅ | 「請求あれば 7 日以内に開示」運用、開示請求先(<CONTACT_EMAIL>)明記 |
| メールアドレス | ✅ | <CONTACT_EMAIL> |
| 不適合時の責任 | ✅ | 故意・重過失除外を明記、ToS §10 参照 |
| 動作環境 | ✅ | Next.js 13.x〜15.x、Pages Router、GitHub.com、custom server / monorepo の例外を列挙 |
| 苦情お問合せ先 | ✅ | <CONTACT_EMAIL>、2 営業日以内応答 |

**残課題**:
- `<OPERATOR_LEGAL_NAME>` / `<OPERATOR_ADDRESS>` / `<CONTACT_PHONE>` / `<EFFECTIVE_DATE>` は Karigo 契約 + ドメイン公開時に operator が埋める

### Pass 2 — 消費者契約法 8-10 条 適合チェック
**対象**: `docs/templates/legal/terms-of-service.md`

| 元の条文 | リスク | 改訂内容 |
|---|---|---|
| §9 "AS IS, WITHOUT WARRANTY OF ANY KIND" | 8 条 1 項 1 号(債務不履行責任の全部免除)で無効化 | 「故意又は重大な過失による場合を除く」を Section 9 末尾に明記、適用範囲を「軽過失」に限定 |
| §10 "TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT" | 8 条 1 項 2 号(一部免除)で無効化のおそれ | 同様に故意・重過失除外を明記 + 「日本居住消費者向け」に独立段落で 8 条準拠を宣言 |
| §11 Indemnification(顧客から事業者への補償義務) | 10 条(信義則違反)で無効化のおそれ | 「合理的な範囲」「顧客に故意又は過失がある場合に限り」 + 「故意・重過失起因のクレームは除外」を明記 |
| §13 Governing law: `<GOVERNING_LAW>` placeholder | 民訴法 3 条の 4(消費者の住所地裁判所提訴権)を制限する条項は無効 | 準拠法を Japan 固定、Tokyo 地裁を非専属管轄に変更、3 条の 4 の権利を明示的に保護 |
| §2 Eligibility | EEA 居住者を含めると GDPR 適用域に入る | 「You are not a resident of EEA / UK / Switzerland」を eligibility に追加 |

### Pass 3 — APPI 28 条 + PPC ガイドライン適合
**対象**: `docs/templates/legal/privacy-policy.md`

PPC ガイドラインで必須の 3 項目(規則 17 条 2 項):
1. **第三者の所在国の名称** — 元の §3 は欠落。**改訂後**: subprocessor table に「Location」列を追加(Anthropic = US/Ireland、GitHub/Stripe/Cloudflare/Fly/Resend = US)
2. **当該外国の個人情報保護制度に関する情報** — 元の §5 は欠落。**改訂後**: 「米国は包括的個人情報保護法を欠き、業種別・州法(例 CCPA)で対応」「米国政府機関は一定の調査権限を有する」を明記
3. **第三者が講ずる保護措置** — 元の §3 末尾に Anthropic 1 行のみ。**改訂後**: subprocessor 6 社それぞれの DPA・SCC・認証(ISO 27001 / SOC 2 / PCI DSS)を表に明記

加えて Pass 6 (独立 review) の指摘を反映:
- **APPI 27 条 5 項 1 号「委託」位置付けを §3 冒頭で宣言**(第三者提供同意を別途取得しない法的根拠)
- **APPI 25 条「委託先監督義務(委託先監督義務)」を当社が負うことを明記**
- **APPI 27 条と 28 条を分けて説明**(委託 vs 越境)

§7 Your rights は APPI 32-35 条(開示・訂正・利用停止・第三者提供停止請求権)を明示、PPC を監督機関として明記。

### Pass 4 — 不実表示 / 景表法リスク
**対象**: `apps/web/src/pages/landing.ts`

検出された絶対語句と対応:

| 元の表現 | 検出箇所 | リスク | 改訂後 |
|---|---|---|---|
| "Most popular" pricing バッジ | landing pricing section | **顧客 0 段階で「最多」は事実無根、景表法 5 条 1 号(優良誤認)** | "Recommended" に変更 |
| "Most jobs finish in 5–15 minutes" | how-it-works section | 規模により大きく変動するのに過小表示 | 「Typical Small repos … larger or more complex repos may take longer」に修正 |
| "Typical Small jobs finish in 5–10 minutes" | FAQ | 上に同じ | 観測ベースの「Most jobs we have observed in testing complete within」+ 警告文言に修正 |

「14-day full refund guarantee」「No code retention」「No training-data use」等は事実(Anthropic Commercial Terms と PP に整合)で残置。

### Pass 5 — Cross-doc 整合
**確認項目**:
- 14 日返金期間: ToS §6 / Refund §1 / 特商法 / PP §9 すべて一致 ✅
- 価格 $99 / $249 / $499: landing / business.md / Stripe / 特商法すべて一致 ✅
- 動作環境 Pages Router: 特商法 / ToS §1, §4 / landing 一致 ✅

### Pass 6 — 独立エージェントレビュー
別 agent (general-purpose) に改訂後 4 文書をレンダリングしレビュー依頼。**5 件の追加指摘**を受領、すべて反映:

1. **特商法 役務提供時期 上限の不明示** → 「上限 14 日 + 超過時自動全額返金」を明記
2. **消費者契約法 8 条の 2 (解除権放棄無効) のリスク** → Refund §2A を新設、民法 562-564 (契約不適合)・8 条 / 8 条の 2 / 9 条 / 10 条のカーブアウトを明記、§3 部分返金条項にも代金減額請求権の留保を明記
3. **APPI 27 条 5 項 1 号 (委託) 位置付けの欠落** → PP §3 冒頭で「委託」整理を宣言、25 条委託先監督義務を明記
4. **販売価格の邦貨概算併記** → 各プランに参考換算額を併記
5. **「請求あれば開示」運用の 7 日基準 + 自社直販の脆弱性** → 「7 日以内に開示」を明記、住所は Karigo 直接公開(NOINDEX 適用) + 電話のみ請求対応

### Pass 7 — Stripe Checkout EU 拒否実装
**対象**: `apps/api/src/stripe.ts` + `apps/web/src/pages/landing.ts`

GDPR 適用域(EEA + UK + Switzerland)からのアクセスを技術的に抑止する 3 段防御:

1. **ToS §2 で利用条件として明示禁止** (法的層)
2. **Stripe Checkout custom_text.submit.message で画面上に EU 居住者非提供を明記** (Stripe 画面層)
3. **billing_address_collection: 'required' で住所を必須収集** (将来の auto-refund 層の準備)
4. **Landing pricing section に non-availability 注記** (購入前の自己排除促進層)

**TODO (post-launch)**: webhook (`checkout.session.completed`) で `session.customer_details.address.country` を検証、EEA/UK/CH 国コード(EEA 30 + UK + CH = 計 32 ヶ国)が来たら自動 refund + reject 通知メール。Beta 中は Stripe 画面の警告文言で抑止する best-effort で運用。

## 4. 残存リスクと運用指針

このセルフレビューでも完全には除去できないリスク。**operator が運用で対処する事項**:

### 4.1 高残存リスク

- **責任制限条項の有効性** (リスク 1): 故意・重過失カーブアウトを明記したが、消費者契約法 10 条で「信義則違反」と判断される文言が紛れ込んでいる可能性は弁護士レビュー無しでは完全には排除できない。**対策**: 売上発生後(月商 ¥10 万到達など)で速やかに弁護士レビューを入れる予算計画を持つ。
- **APPI 28 条 越境提供記述の精度** (リスク 2): "米国は包括的個人情報保護法を欠く" 等の法令解釈を operator が直接行っている。PPC が望む文言と完全一致しているかは未確認。**対策**: ローンチ後 6 ヶ月以内に PPC ガイドラインの最新版で再点検 + 弁護士レビュー。
- **特商法 表記の細部** (リスク 3): 行政指導は通常 改善指示 → 改善で済むレベル。**対策**: 月 1 回程度 docs/templates/legal/ を再点検、operator 自身の住所変更や私書箱解約があれば即時更新。

### 4.2 運用ルール (operator)

- 顧客から「移行品質問題」のクレームが来たら、Refund §2A の故意・重過失 / 契約不適合 カーブアウトを優先適用 → ¥99-499 規模の問題なら full refund 即実施(訴訟予防)
- 顧客から「個人情報開示請求」(APPI 33 条) が来たら 30 日以内に対応(運用ランブックに従う)
- EEA/UK/CH からの予期せぬ決済成功(Stripe 画面警告を無視) → 即時 full refund + 「ToS §2 違反のため契約不成立」通知
- 消費者庁 / PPC / 国民生活センターからの照会 → 1 営業日以内に応答、本ドキュメントを Due Diligence 証跡として提示

### 4.3 弁護士レビュー後 mandatory 修正項目 (将来)

- ToS §10 上限額: "the amount you paid us for that order" の妥当性(平均的損害との関係)
- ToS §13 国際私法準拠法選択(日本法強制適用 vs 顧客住所地法尊重)の精査
- PP §3 各 subprocessor の location 記述の最新化(Anthropic がリージョンを公開したら更新)
- 特商法 § 業務責任者氏名 が法人化時に変わる場合の運用(現在は事業主本人)

## 5. 改訂履歴

| 日付 | 改訂者 | 内容 |
|---|---|---|
| 2026-04-30 | Claude Code (Pass 1〜7) + general-purpose agent (Pass 6 review) | 初版。Case C 自己レビュー実施・反映完了 |

## 6. 関連 commit

- (未 commit、最終 diff を operator が確認後にコミット)

## 7. 参考: 弁護士レビュー時の引継ぎ事項

将来 弁護士に依頼するときに、以下を伝えると効率的:

1. 「自己レビュー済」の表明と本ドキュメント
2. 「特に確認したい箇所」: ToS §9-10 (責任制限の有効性)、PP §3 (APPI 28 条記述精度)、特商法表記の代表者氏名運用、§13 governing law
3. 想定する顧客像: 主に英語圏 + 日本居住の Next.js 開発者(個人 / 小規模チーム)、USD 建て決済、サービスは draft PR 提供のみ(自動マージしない)
4. 「現時点で確定済の運用」: EU 居住者除外、14 日 verify 不通過時 全額返金、Karigo 私書箱住所運用
