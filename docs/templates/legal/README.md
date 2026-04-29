# Legal templates

Phase 4 ローンチに必要な法務文書 4 点のドラフト。

| ファイル | 言語 | 目的 |
|---|---|---|
| [`terms-of-service.md`](./terms-of-service.md) | 英語 | 利用規約。サービスの責任範囲・禁止事項・準拠法を規定 |
| [`privacy-policy.md`](./privacy-policy.md) | 英語 | プライバシーポリシー。収集情報・処理者・データ保持・権利 |
| [`refund-policy.md`](./refund-policy.md) | 英語 | 返金ポリシー。`docs/business.md` §4.4 を実装 |
| [`specific-commercial-transactions.md`](./specific-commercial-transactions.md) | 日本語 | 特定商取引法に基づく表記。日本居住者向け |

## ⚠ 公開前のチェックリスト (operator)

すべて DRAFT 段階。公開前に必ず以下を実施:

1. **法務レビュー**(可能なら弁護士、最低でも法律事務所のリーガルチェック
   サービス) — 特に以下の点:
   - 米ドル建てで日本居住者が販売する形態の準拠法・裁判管轄
   - GDPR / CCPA / APPI 各法域の整合
   - 利用規約の責任制限が消費者保護法に抵触しないか
2. **placeholder の埋め込み** — 各文書冒頭に `<...>` で示してある:
   - `<OPERATOR_LEGAL_NAME>`: operator の戸籍上のフルネーム
   - `<OPERATOR_ADDRESS>`: 事業所住所(私書箱代行サービス推奨)
   - `<CONTACT_EMAIL>`: support メアド
   - `<CONTACT_PHONE>`: 連絡可能な電話番号(特商法のみ)
   - `<EFFECTIVE_DATE>`: 公開日
   - `<GOVERNING_LAW>`: 準拠法(弁護士確認)
   - `migrate-bot.dev`: 公開ドメイン
3. **landing page から各 URL へのリンク**:
   - `https://migrate-bot.dev/terms` → terms-of-service
   - `https://migrate-bot.dev/privacy` → privacy-policy
   - `https://migrate-bot.dev/refunds` → refund-policy
   - `https://migrate-bot.dev/legal` (まとめページ) → 特商法表記含む
4. **Stripe Live activation 申請時に上記 URL を Stripe Dashboard に入力**

## 重要な前提・想定

- **準拠法**: operator が日本居住、サービスは USD 建てでグローバル販売の前提
- **個人事業主前提**: 法人化していない場合、住所・氏名は本人のものになる。
  虚偽記載は特商法違反。私書箱代行で住所を実生活と分離する運用を推奨
- **学生期間中**: 開業届を出していなくても個人として販売は可能だが、所得税
  申告(雑所得 or 事業所得)は義務。Phase 4 ローンチ後最初の確定申告までに
  税理士相談推奨
- **GDPR / CCPA**: 適用される顧客がいれば対応必須。privacy-policy.md §7 で
  権利を明示
