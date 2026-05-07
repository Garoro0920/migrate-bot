# EEA / UK / Switzerland rejection template

> ToS §2 で **EEA / UK / Switzerland 居住者の利用を明示禁止** している。
> しかし Stripe Checkout の `custom_text.submit.message` の警告を
> 顧客が無視 / 見落として決済通過する可能性が残る。
> その場合、即時全額返金 + 利用拒否で応答。
>
> ⚠ **GDPR 適用域に引き込まれない** ためにも、絶対に放置しない。
> 検出後 24 時間以内に対応すること。

---

## 検出方法

### Stripe webhook 受信時の自動検出 (post-launch TODO、未実装)

`docs/legal-self-review-log.md` §3 Pass 7 で TODO 記載:
> webhook (checkout.session.completed) で session.customer_details.address.country を検証し
> EEA(30) + UK + CH = 計 32 ヶ国コードが来たら自動 refund + reject 通知

未実装のため、**Beta 中は Stripe Dashboard 手動チェックが必要**。

### 手動検出フロー (Beta 期間中)

決済成功通知 (paymentReceived メール送信時 = Stripe webhook 受信時) に operator が
Stripe Dashboard で billing country をチェック:

1. <https://dashboard.stripe.com/payments> (test mode は `/test/payments`)
2. 該当 PaymentIntent をクリック
3. **Customer details** → **Billing address** で country code 確認
4. 以下のいずれかが含まれていれば EEA/UK/CH 該当:

```
EU (27): AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE
EEA 追加 (3): IS, LI, NO
UK: GB
Switzerland: CH
```

**32 ヶ国コードのいずれかなら EEA/UK/CH 該当** → 本テンプレで対応。

---

## 対応フロー

1. **即時 Stripe で全額 refund** (Stripe Dashboard → Refund full)
2. **本テンプレートで返信メール送信** (英語のみで十分、EU 向けなので)
3. **DB の `orders` テーブルで refunded_at 確認**(Stripe webhook で自動更新)
4. **GitHub installation を revoke** (operator 操作、または顧客に install を外してもらう)
5. **operator メモ**: `docs/legal-self-review-log.md` または別途の incident log に記録

---

## English version (refund + 利用拒否)

```
Hi [CUSTOMER_NAME],

Thanks for trying migrate-bot. Unfortunately I have to issue an
immediate full refund and explain why.

Per our Terms of Service Section 2, the Service is currently not
offered to residents of the European Economic Area, the United
Kingdom, or Switzerland. The billing address on your payment
([COUNTRY_NAME]) falls within that scope.

I've now:

- Issued a full refund of $[AMOUNT_USD] back to your card via
  Stripe (typically clears in 5–10 business days)
- Cancelled the migration job before it ran (no repository data
  was processed by our agent)
- Asked our system to suspend further service to your installation

There's a brief disclaimer on the Stripe Checkout screen and on
our pricing page noting this restriction. I'm sorry it slipped
through; we'll work on making it more visible.

The reason for the restriction is GDPR / UK GDPR / Swiss FADP
compliance. As a solo founder I can't credibly meet the full
data-controller obligations on day 1, so I've chosen to exclude
those jurisdictions for now rather than offer a service that
fails on the legal side. We may revisit this once we have proper
DPA infrastructure.

If you're a developer outside those jurisdictions and the billing
address was a one-time mismatch (e.g., card issued in EEA but you
reside elsewhere), please reply with that context and I'll
re-evaluate.

Apologies for the friction.

Best regards,
— migrate-bot support
```

---

## 埋める値

| プレースホルダ | 取得元 |
|---|---|
| `[CUSTOMER_NAME]` | Stripe Dashboard customer name または メール署名 |
| `[COUNTRY_NAME]` | EEA/UK/CH の該当国名 (例 "Germany", "France", "United Kingdom", "Switzerland") |
| `[AMOUNT_USD]` | `orders.amount_usd_cents / 100` |

## 注意事項

- **謝罪を入れすぎない** — ToS §2 で明示済の condition、顧客の自己責任。ただし「すり抜けた」事実は誠実に認める
- **「再評価する余地」を残す** — billing address と居住地が一致しない場合 (法人カード等) があるため
- **GitHub installation 強制 revoke は最終手段** — 顧客に「install を外してください」依頼で先に解決を試みる

## 再発防止策 (operator が中長期で実施)

1. **post-launch TODO 実装**: webhook で country 自動検出 → 自動 refund (人手介入不要に)
2. **landing pricing 末尾の non-availability 注記** をより visible にする (現状は小さく表示)
3. **Stripe Checkout custom_text** の文言を強化 (現状 1 文、3 文くらいに増やす)

これらは launch 安定後の段階改善。Beta 期間中は手動運用で OK。
