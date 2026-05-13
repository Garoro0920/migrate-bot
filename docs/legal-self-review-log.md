# Legal self-review log — Phase 4 launch (Case C)

> Last updated: 2026-05-13 (Pass 8 — ZeLo 野村弁護士による事後検証反映)
> Reviewer: Claude Code (not a lawyer) + ZeLo 野村諭弁護士 (Pass 8、無料 60 分相談)
> Operator decision: ADR-0003 + 2026-04-30 conversation で Case C(法務レビュー
> 無しでローンチ、自己レビューで補完)を採択。理由は経済合理性(¥数十万円の
> 弁護士費用が現段階で確保できない)。
>
> **本ドキュメントは弁護士の代替ではなく、operator が自己責任で進めた
> due diligence の作業記録である**。将来予算が確保できた段階で正式な
> lawyer review に出す前提で残す(行政指導があった際の善意の自衛努力の
> 証跡としても機能)。
>
> **2026-05-12 進展**: ZeLo 法律事務所・野村諭弁護士による無料 60 分相談を実施、
> Pass 1〜7 の成果物 (法務 4 文書 + 5 層 GDPR 防御) について「現状で OK」
> または「やれるだけのことはやっている」評価を得た。詳細は Pass 8 参照。

## 1. 採択方針

弁護士レビューを得られない代替として、以下の **multi-pass defense** を実施:

1. 一次資料(消費者庁・PPC 公式 + Anthropic DPA + 条文)を WebFetch で取得
2. 4 文書を 5 つの観点で順次レビュー(各 pass で観点を変える)
3. 別エージェントによる独立レビュー(自分のバイアス相互チェック)
4. 技術側で GDPR 適用域を切り捨てる実装(EU 居住者を Stripe Checkout で拒否)
5. 本作業記録を残す
6. **(Pass 8、2026-05-12 追加)** 専門家による事後検証として ZeLo 野村弁護士の
   無料相談 60 分を活用、主要 6 論点について現状文言の妥当性を確認

## 2. 参照した一次資料

> **アクセス確認日: 2026-04-30**。下記 URL は当日 WebFetch で取得可能であることを
> 確認済み。一次資料は時間の経過と共に rotation・改訂される可能性があるため、
> 弁護士による参照時には最新版での再確認を推奨する。

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
- 14 日返金期間 (役務提供期限): ToS §6 / Refund §1 / 特商法「役務の提供時期」「返品キャンセル」すべて 14 日で一致 ✅
- 30 日通知 window (お客様連絡期間): Refund §1 で明示、ToS §6 で参照 ✅ (post-audit clarification commit `c981295` で導入。それまでは 14 日通知期間と混同表現あり)
- 価格 $99 / $249 / $499: landing / business.md / Stripe / 特商法すべて一致 ✅
- 動作環境 Pages Router: 特商法 / ToS §1, §4 / landing 一致 ✅
- Subprocessor 6 社の所在国: PP §3 表 / EEA 拒否説明 (PP §5、ToS §2、Stripe Checkout custom_text、Landing pricing 注記) で「米国」記述一致 ✅
- 法務文書間の link: relative `./xxx.md` → absolute `/legal/xxx` に統一済 (audit finding 反映)

### Pass 6 — 独立エージェントレビュー
別 agent (general-purpose) に改訂後 4 文書をレンダリングしレビュー依頼。**5 件の追加指摘**を受領、すべて反映:

1. **特商法 役務提供時期 上限の不明示** → 「上限 14 日 + 超過時自動全額返金」を明記
2. **消費者契約法 8 条の 2 (解除権放棄無効) のリスク** → Refund §2A を新設、民法 562-564 (契約不適合)・8 条 / 8 条の 2 / 9 条 / 10 条のカーブアウトを明記、§3 部分返金条項にも代金減額請求権の留保を明記
3. **APPI 27 条 5 項 1 号 (委託) 位置付けの欠落** → PP §3 冒頭で「委託」整理を宣言、25 条委託先監督義務を明記
4. **販売価格の邦貨概算併記** → 各プランに参考換算額を併記
5. **「請求あれば開示」運用の 7 日基準 + 自社直販の脆弱性** → 「7 日以内に開示」を明記、住所は Karigo 直接公開(NOINDEX 適用) + 電話のみ請求対応

### Pass 7 — Stripe Checkout EU 拒否実装
**対象**: `apps/api/src/stripe.ts` + `apps/web/src/pages/landing.ts` + `apps/api/src/routes/stripe-webhook.ts`

GDPR 適用域(EEA + UK + Switzerland)からのアクセスを抑止する **5 層 (5-layer) defense in depth** を実装:

1. **法的層 — ToS §2 で利用条件として明示禁止**
2. **Stripe 画面層 — Checkout custom_text.submit.message で EU 居住者非提供を明記**
3. **データ収集層 — billing_address_collection: 'required' で住所を必須収集**
4. **Landing 自己排除層 — pricing section に non-availability 注記**
5. **Webhook 自動拒否層 — `checkout.session.completed` で `session.customer_details.address.country` を検証、EEA/UK/CH 国コード(EEA 30 + UK + CH = 計 32 ヶ国)が来たら自動 refund + reject 通知メール (`eeaRejectionEmail`)** (commit `4b351e5`、retry-safe 化は `c981295`)

加えて手動 fallback として `docs/customer-support/eea-uk-ch-rejection.md` も維持(万一 webhook が動作しなかった場合用)。

> **段数のカウント方針**: 法的・UI・データ・自己排除・Webhook の 5 層を独立 layer として数える。手動 fallback runbook は冗長コントロールであり層数には含めない。

### Pass 8 — ZeLo 野村弁護士による検証 (2026-05-12 / 2026-05-13)

**対象**: 法務 4 文書および 5 層 GDPR 防御の現状評価
**方式**: 法律事務所ZeLo・野村諭弁護士 (日本弁護士 + NY 州弁護士) との 60 分 Web 会議 (無料相談)、5/13 に Gemini 文字起こし受領
**位置付け**: Case C 自己レビューの**事後検証** (Pass 1〜7 で構築済の文書を専門家が「現状で発生する重大な穴がないか」確認した layer)

#### Q1 利用規約 §9-10 責任制限条項の実効性

> **野村先生の評価**: 「おそらく大丈夫」。故意・重過失カーブアウトを明記している現行文言で、消費者契約法 8 条 1 項 1 号 (全部免除無効) には抵触しない。上限額を「直近の利用額 (1 ヶ月分や 1 年分等)」とすることも実務上一般的だが、本サービスは一回課金なので「個別注文の支払額」のままで妥当。ただし「あまりに上限が小さいとサービスの信用に関わる」点は事業判断として留意。

- **本 review からの修正要否**: 不要 (現行文言で OK)
- **将来 paid review 時の depth 確認候補**: 消費者契約法 10 条 (信義則違反) の判断境界を文言レベルでさらに精査する余地はあるが、現状で不当条項として無効化されるリスクは低い

#### Q2 プライバシーポリシー §3 越境提供の APPI 適合性

> **野村先生の評価**: ソースコード自体が APPI の個人情報に**当たりにくい**パターン (一般的なプログラムコード = 個人情報ではない)。当方が別途扱う email / GitHub installation context / Stripe 顧客情報等は個人情報に該当しうるが、利用規約・ポリシーで「越境移転がありえる」「Anthropic のサーバが米国にある」等を明示しサービス利用 = 同意の構造を取ってあれば、日本法上の条件は clear。

- **本 review からの修正要否**: 不要 (PP §3 / §5 で明示済)
- **野村先生からの追加助言**: 「明示的な同意 UI を Stripe Checkout 前段に置く」必要性は実務上は強く推奨されず、現状の利用規約同意 + ポリシー明示で許容範囲

#### Q3 米ドル建て + 日本居住者販売の準拠法・国際裁判管轄

> **野村先生の評価**: 「日本法準拠 + 東京地裁を管轄裁判所」は、米ドル建てで英語サイトの場合でも**全然普通**。日本のサービス提供事業者 (個人事業主含む) が提供する場合の標準的な設定。

- **本 review からの修正要否**: 不要 (ToS §13 で実装済)
- **将来課題**: 各国強行適用法令への配慮 (米国 CCPA、英国 UK GDPR 等) は数百名規模のユーザー流入時に再点検

#### Q4 返金ポリシー §2A 契約不適合カーブアウト

> **野村先生の評価**: 「問題なし」。14 日以内 CI グリーン未達時の全額返金条件が消費者契約法上の不当条項として無効化されるリスクは低い。本サービスのような「移転先で機能するか」は完成保証が困難なサービス内容上「しょうがないレベル」と評価。

- **本 review からの修正要否**: 不要 (Refund §1 / §2A で実装済)
- **将来 paid review 時の depth 確認候補**: 「契約不適合」の判断基準を Refund §1 で「履行 = typecheck + next build pass の draft PR 生成」と明示することは可能。優先度低

#### Q5 EEA / UK / Switzerland 居住者除外と GDPR 域外性

> **野村先生の評価**: 「**かなりレイヤーを重ねて対策されており、やれるだけのことはやっている**」。厳密に「絶対対象外」と言い切れるものではないが、ユーザーがプロキシ等で防衛網をくぐり抜けた場合でも事業者がいきなりペナルティを課されることは考えにくい。万が一 EU DPA からコンタクトがあっても「仕組みで排除しているが、たまたま通ってしまったので即座にキャンセルとデータ消去で対応する」と説明できれば問題ない見込み。

- **本 review からの修正要否**: 不要 (5 層 + 手動 fallback runbook で実装済)
- **GDPR / CCPA 対応規模感への助言**: **「最初は無理に対応しなくても大丈夫」**。米国人・欧州人ユーザーが**数百人単位で増えてきた段階**で現地法対応 (EU 代理人選任、システムセキュリティ要件、Privacy Policy への追加特約条項) を検討すれば十分

#### Q6 特定商取引法表記 + 私書箱代行住所運用

> **野村先生の評価**: 「請求があれば 7 日以内に開示」運用と私書箱代行住所 (Karigo 神戸中央 + noindex/nofollow) の組み合わせは、**連絡が確実につく体制であれば問題ない**。特定商取引法上「住所をそらさなければいけない」というルールではないので、メールでの問い合わせ窓口 (support@migrate-bot.dev) が機能していれば足りる。

- **本 review からの修正要否**: 不要 (特商法表記 + Karigo 住所 + Cloudflare Email Routing で support@ 動作確認済)

#### Q7 / Q8 / Q10 (時間切れで個別質問できず)

- Q7 (内容証明郵便不受理運用): Q6 の「連絡が確実につく体制であれば問題ない」一般論で部分的にカバー。Karigo 利用規約上の現金書留・特別送達不受理運用は、メール窓口を最優先連絡先と明示すれば民法 97 条上の意思表示到達は確保できるという理解で運用可
- Q8 (Stripe Live activation 申請時の懸念): 質問できなかったが、特に問題視されていないと判断。`docs/runbooks/stripe-live-activation.md` の自己準備で進める
- Q10 (self-review log の取り扱い): 質問できなかったが、現状の log 構造 (事実 + 引用一次資料 + 各 Pass の評価) で問題なし。将来 paid review 時の引継ぎ資料として保管継続

#### Q9 paid review 費用感 (将来の予算計画)

> **野村先生の見積もり** (本日改めて確認):
> - 利用規約 (英文 + 規約周りの精緻化): ¥30-50 万
> - プライバシーポリシー海外対応 (GDPR / CCPA 特約条項追加): ¥30-50 万
> - 同 日本法対応のみ: ¥20-30 万
> - 返金ポリシー: ¥20 万
> - 特商法表記: ¥10 万
> - **トータル ¥100 万前後 (海外対応含む full 版)**
>
> 事業が軌道に乗ったら、その時点の利用規約を送れば「余計なコストがかからない形で」改めて見積もり可能。

#### その他の助言 / 追加情報

1. **法人設立・VC 資金調達のサポート対応可**: 法人化時に利用規約・営業形態を再構築する場合、ZeLo で日常的に対応している領域。会社設立は operator 自身でも可能だが、その後の資金調達 (VC からの投資受入等) は弁護士サポート推奨
2. **継続的な軽い相談は無料 OK**: 「これくらいだったらできますんで、是非またなんかあればおっしゃってください。楽しみに待っております」。野村先生本人または事務所メンバー誰でも (代表メール経由でも) コンタクト可能
3. **シンガポール等の特定国でユーザー増加時**: その国の法令適用への対応も ZeLo の業務範囲

#### 結論 (Pass 8 から)

- **法務 4 文書の実質修正は不要** — 主要 6 論点 (Q1-Q6) は「現状で OK」または「やれるだけのことはやっている」評価
- **5 層 GDPR 防御は十分** — 「絶対対象外」とは言い切れないが、実務上ペナルティリスクは低い水準
- **Stripe Live activation 申請に進める** — 法務面の不安要素は払拭された
- **次の paid review timing は事業立ち上げ後** — 月商 ¥10-30 万定着 + 数ヶ月実績 + 大幅な仕様変更 のいずれかで再依頼検討

## 4. 残存リスクと運用指針

このセルフレビューでも完全には除去できないリスク。**operator が運用で対処する事項**:

### 4.1 高残存リスク

> **Pass 8 後の更新**: 野村先生の評価により、以下 3 つのリスクは事実上**「低残存リスク」に格下げ済**。当初想定よりリスク水準は低い。継続して運用ルールでカバーする。

- ~~**責任制限条項の有効性**~~ (旧リスク 1、Pass 8 で「おそらく大丈夫」評価): 故意・重過失カーブアウトを明記したが、消費者契約法 10 条で「信義則違反」と判断される文言が紛れ込んでいる可能性は残る。**対策**: 売上発生後(月商 ¥10 万到達など)で速やかに弁護士レビューを入れる予算計画を持つ。
- ~~**APPI 28 条 越境提供記述の精度**~~ (旧リスク 2、Pass 8 で「日本法上の条件 clear」評価): 法令解釈を operator が直接行っている部分は残る。**対策**: ローンチ後 6 ヶ月以内に PPC ガイドラインの最新版で再点検 + 弁護士レビュー。
- ~~**特商法 表記の細部**~~ (旧リスク 3、Pass 8 で「連絡が確実につく体制であれば問題ない」評価): 行政指導は通常 改善指示 → 改善で済むレベル。**対策**: 月 1 回程度 docs/templates/legal/ を再点検、operator 自身の住所変更や私書箱解約があれば即時更新。

### 4.1.5 Pass 8 後の新規認識リスク (低残存)

- **数百名規模での GDPR / CCPA 適用懸念** (Pass 8 助言): 米国人・欧州人ユーザーが数百人単位で集積した段階で現地法対応が必要になる。**閾値**: 米国 200 名 or 欧州系 100 名 (UK / CH 含むが現状除外運用)。**対策**: ローンチ後の月次レビューで国別ユーザー数を確認、閾値接近時に paid review 着手。

### 4.2 運用ルール (operator)

- 顧客から「移行品質問題」のクレームが来たら、Refund §2A の故意・重過失 / 契約不適合 カーブアウトを優先適用 → ¥99-499 規模の問題なら full refund 即実施(訴訟予防)
- 顧客から「個人情報開示請求」(APPI 33 条) が来たら 30 日以内に対応(運用ランブックに従う)
- EEA/UK/CH からの予期せぬ決済成功(Stripe 画面警告を無視) → 即時 full refund + 「ToS §2 違反のため契約不成立」通知
- 消費者庁 / PPC / 国民生活センターからの照会 → 1 営業日以内に応答、本ドキュメントを Due Diligence 証跡として提示

### 4.3 弁護士レビュー後 mandatory 修正項目 (将来)

> **Pass 8 後の更新**: 以下の項目は Pass 8 で「現状文言で問題なし」と評価されたため、**将来 paid review 時の depth 確認候補**に格下げ。mandatory ではない。

- ~~ToS §10 上限額: "the amount you paid us for that order" の妥当性~~ → Pass 8 で「個別注文の支払額のままで OK」評価
- ~~ToS §13 国際私法準拠法選択(日本法強制適用 vs 顧客住所地法尊重)の精査~~ → Pass 8 で「日本法・東京地裁で全然普通」評価
- PP §3 各 subprocessor の location 記述の最新化(Anthropic がリージョンを公開したら更新)← 依然要更新
- 特商法 § 業務責任者氏名 が法人化時に変わる場合の運用(現在は事業主本人)← 法人化時に再点検

## 5. 改訂履歴

| 日付 | 改訂者 | 内容 |
|---|---|---|
| 2026-04-30 | Claude Code (Pass 1〜7) + general-purpose agent (Pass 6 review) | 初版。Case C 自己レビュー実施・反映完了 |
| 2026-05-12 | Claude Code (Batch E1) | Pass 5 占位符 commit hash 確定 (`c981295`)、Pass 7 段数を「5 層 defense in depth」に統一、参照一次資料テーブルにアクセス確認日を明記 |
| 2026-05-13 | Claude Code (Pass 8 反映) | ZeLo 野村弁護士による事後検証 (5/12 60 分相談) の結果を Pass 8 として記録、残存リスク格下げ、mandatory 修正項目を depth 確認候補に再分類 |

## 6. 関連 commit

- Pass 1-7 初版: `6f22c90`、`beea7a9`、`a5ede14`
- Pass 7 (5 層実装): `4b351e5` (Webhook 自動拒否)、`c981295` (retry-safe 化)
- Pass 5 cross-doc 修正 + Pass 7 段数統一 (Batch E1): `87aaf67`
- Pass 8 反映 (ZeLo 野村先生 5/12 会議の整理): 本コミット

## 7. 参考: 弁護士レビュー時の引継ぎ事項

将来 弁護士に依頼するときに、以下を伝えると効率的:

1. 「自己レビュー済」の表明と本ドキュメント (**Pass 1-8 まで完了済**)
2. **既に ZeLo 野村弁護士による無料 60 分相談を 2026-05-12 に実施**、主要 6 論点で「現状で OK」評価を得ている (Pass 8 参照)
3. 「**今回 paid で深掘りしたい箇所**」(Pass 8 では時間切れまたは表面的だった項目):
   - Q7 (内容証明郵便不受理運用の訴訟予防) — 一般論で部分的にカバー、詳細未確認
   - Q8 (Stripe Live activation の実務懸念) — 未質問
   - Q10 (self-review log の取扱い・訴訟時の disclosure リスク) — 未質問
   - 数百名規模での GDPR / CCPA 適用時の追加対応設計
4. 想定する顧客像: 主に英語圏 + 日本居住の Next.js 開発者(個人 / 小規模チーム)、USD 建て決済、サービスは draft PR 提供のみ(自動マージしない)
5. 「現時点で確定済の運用」: EU 居住者除外、14 日 verify 不通過時 全額返金、Karigo 私書箱住所運用、support@migrate-bot.dev 一元連絡窓口
6. 次回相談先候補: **ZeLo 野村諭弁護士** (前回好意的、継続無料相談 OK、paid review 時の費用感は ¥100 万前後/full version、事務所メンバー誰でもコンタクト可)
