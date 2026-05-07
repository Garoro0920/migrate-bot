# Manual refund approval template

> 顧客が refund を要求し、**Refund Policy §1 (full refund) または §2A (intentional misconduct / gross negligence / 契約不適合) のカーブアウト** で
> 該当すると判定 → 全額返金を承認するときの返信。
>
> 自動 refund フロー (Refund Policy §1 第 3 号 = blocker 検出) は webhook 経由で
> 既に処理されるが、顧客が能動的にメールで申請してきた場合は手動。

---

## 判定フロー (operator が事前に確認)

1. **DB 確認**: `orders` テーブルで該当 order の state、`jobs` テーブルで該当 job の state
2. **PR 確認**: GitHub で実際に PR が作成されたか、verify ステップが pass したか
3. **該当条件**:
   - ✅ Refund Policy §1.1 (typecheck/`next build` が当社起因で 14 日以内に通らない)
   - ✅ Refund Policy §1.2 (agent 起因のランタイムエラーで完了不能)
   - ✅ Refund Policy §1.3 (blocker 検出で abort)
   - ✅ Refund Policy §2A (我々の故意・重過失、または提供物の契約不適合)
   - ❌ Refund Policy §2 (顧客が PR 後に修正、CI が顧客側の構成で fail) → `refund-decline.md`

## Stripe で refund 操作

```powershell
# operator 確認: Stripe Dashboard → Payments → 該当 PaymentIntent → Refund full
# または以下でコマンド実行 (要 Stripe API key、test mode は同じパターン)
```

実際の refund は **Stripe Dashboard 手動操作** が確実 (¥99-499 規模なら手動で十分)。
DB の `orders.refunded_at` は Stripe webhook (`charge.refunded`) で自動更新される。

---

## English version (refund 承認 + 返信)

```
Hi [CUSTOMER_NAME],

Thanks for following up, and apologies for the friction.

After reviewing the migration job for [REPO_FULL_NAME] (order
[ORDER_ID_SHORT]), I've confirmed that [REASON: e.g., "our verify
step could not pass typecheck within the 14-day window for reasons
attributable to the service" / "our agent encountered an internal
error during the migration phase"]. This falls under our Refund
Policy Section [1 / 2A], so a full refund of $[AMOUNT_USD] has
been issued back to the original card via Stripe. It typically
clears within 5–10 business days depending on the issuer.

[If applicable: A few notes on what we found and what we're
improving so this doesn't happen for the next customer:
- [SHORT_OBSERVATION_1]
- [SHORT_OBSERVATION_2]
]

Sorry again for the trouble. If there's anything else we can do
to help — including a re-attempt at no charge if you'd like to try
once we've fixed the underlying issue — just let me know.

Best regards,
— migrate-bot support
```

## 日本語版 (refund 承認 + 返信)

```
[CUSTOMER_NAME] 様

ご連絡ありがとうございます。
ご不便をおかけしてしまい誠に申し訳ございませんでした。

[REPO_FULL_NAME] の移行ジョブ (注文番号 [ORDER_ID_SHORT]) について
確認いたしましたところ、[理由: 例「14 日以内に当社の verify
ステップ (typecheck + next build) が当社側の理由により通らなかった」
/ 「移行処理中に当社 agent 内部エラーが発生した」] こと
が確認できました。本件は当社返金ポリシー第 [1 / 2A] 条に該当いたします
ので、ご決済額 $[AMOUNT_USD] (約 ¥[AMOUNT_JPY_APPROX]) の全額を
Stripe 経由でご利用カードに返金処理させていただきました。
お客様のカード会社により 5〜10 営業日で反映される見込みです。

[該当する場合: 今回確認できた点と改善方針を共有させていただきます
(同様の問題が他のお客様で発生しないよう対処いたします):
・[観察事項_1]
・[観察事項_2]
]

このたびはご期待に沿えず申し訳ございませんでした。
基盤の問題を修正後、無償で再度移行を試みることも可能でございますので、
ご希望の場合はお気軽にお申し付けください。

引き続きどうぞよろしくお願い申し上げます。
migrate-bot サポート
```

---

## 埋める値

| プレースホルダ | 取得元 |
|---|---|
| `[CUSTOMER_NAME]` | メール署名から |
| `[REPO_FULL_NAME]` | `orders.repo_full_name` |
| `[ORDER_ID_SHORT]` | `orders.id` の先頭 8 文字 (例 `b78e5aca`) |
| `[REASON]` | 状況に応じて記述 (`jobs.error_code` / `error_detail` 参照) |
| `[AMOUNT_USD]` | `orders.amount_usd_cents / 100` (例 99 / 249 / 499) |
| `[AMOUNT_JPY_APPROX]` | 当時のレートで概算 |
| `[SHORT_OBSERVATION_*]` | 任意、将来の改善コミットメント (省略可) |

## 注意事項

- **「故意・重過失」「契約不適合」** という法的タームは**メール本文では使わない** — Refund Policy §2A 該当でも、顧客向けには「当社側の理由」「当社の不具合」と日常語で言い換える
- 改善方針の共有は **ある程度の謙虚さで**。「次回は完璧です」と過信しない
- 日本語版で **¥概算額** を併記するのは、為替レート差で「思ったより少なかった」クレーム予防
