# Refund decline template

> 顧客が refund を要求したが、Refund Policy §2 (= 顧客側の事情で fail)
> 該当で却下するときの返信。
>
> ⚠ **判断は慎重に**。$99-499 規模で粘って訴訟リスクを取るより、
> グレーなら refund する方が経済合理。本テンプレートは
> **明確に §2 該当 + 顧客のクレームに正当な根拠なし** の場合のみ使用。

---

## 判定フロー (operator が事前に必ず確認)

### ✅ Refund 却下が妥当なケース (本テンプレ使用 OK)

- 顧客が PR をマージ後、自分でコードを修正 → CI が fail → "migrate-bot のせい"
- 顧客側 CI に独自テスト (移行時に visibility なし) があり、それが fail
- PR は draft 状態で開かれており、verify (typecheck + next build) は pass 済
- 顧客が "気が変わった" と言って refund 要求

### ⚠ 微妙なケース (refund する方が安全)

- PR の差分品質が低い (idiomatic でない) と顧客が主張、ただし build pass
  → ✅ 還付推奨 (Refund Policy §2A 「契約不適合」議論の余地あり)
- Custom server 等の動作環境記載と矛盾しないが、移行が困難なケース
  → ✅ 還付推奨
- 顧客が "想定と違う" 程度のクレーム
  → ✅ Goodwill refund 検討、特に Beta 期は

### ❌ 絶対に refund 却下してはダメなケース

- ⚠ 内容証明郵便で要求が来た → **必ず一旦 acknowledgment + ZeLo 弁護士に相談**
- ⚠ 「訴訟」「弁護士」「消費者庁」 のキーワードが顧客メールに含まれる → 同上
- ⚠ 故意・重過失起因のクレーム (Refund Policy §2A 該当) → 全額還付

---

## English version (refund 却下 + 説明)

```
Hi [CUSTOMER_NAME],

Thanks for reaching out, and I appreciate the patience.

I've taken a careful look at the migration job for [REPO_FULL_NAME]
(order [ORDER_ID_SHORT]) and the resulting PR [#PR_NUMBER]. To
share what I found:

- The PR was successfully opened in draft state on [DATE]
- Our verify pipeline (TypeScript typecheck + `next build`) passed
  before the PR was opened
- The behavior you've described ([CUSTOMER_DESCRIPTION_OF_ISSUE])
  appears to relate to [SPECIFIC_REASON: e.g., "modifications made
  to the migrated code after the PR was opened" / "your custom
  test suite, which was not visible during our automated
  verification" / "configuration in your repository that falls
  outside the scope described in the Refund Policy Section 1"]

Per our Refund Policy Section 2 [link to public refund policy],
this scenario is not eligible for an automatic refund. I want to
be transparent about that rather than leave the decision unclear.

That said:
- If you'd like, I can provide more detailed analysis of the diff
  and any patterns we could improve in our agent for similar future
  jobs (no extra charge)
- If you believe my reading of the situation is incorrect or if
  there's context I've missed, please share it and I'll re-review.
  We're happy to be wrong here.
- If you'd like, we can also offer a 50% credit toward a future
  migration on the same or different repository (Beta-period
  goodwill, not promised by policy).

Sorry I couldn't deliver better news here. Let me know how you'd
like to proceed.

Best regards,
— migrate-bot support
```

## 日本語版 (refund 却下 + 説明)

```
[CUSTOMER_NAME] 様

ご連絡ありがとうございます。

[REPO_FULL_NAME] (注文番号 [ORDER_ID_SHORT]) の移行ジョブと
作成された PR [#PR_NUMBER] につきまして、当方で確認いたしました。
以下、確認できた状況を共有させていただきます。

・PR は [DATE] に draft 状態で正常に作成されています
・PR 作成前の自動検証 (TypeScript 型チェック + next build) は
  すべて通過しています
・お客様からお知らせいただいた事象 ([CUSTOMER_DESCRIPTION_OF_ISSUE])
  は、[具体的理由: 例「PR 作成後にお客様側でなされた変更」
  /「当社の自動検証時には visibility のなかったお客様独自のテスト
  群」/「返金ポリシー第 1 条で対象としているスコープ外の
  リポジトリ構成」] に起因するものと思われます

恐縮ながら、本件は当社返金ポリシー第 2 条該当となるため、
自動返金の対象外となる旨をご案内させていただきます。
誠意ある対応のため、判断を曖昧にせず明確にお伝えいたします。

ただし以下のオプションをご提案させていただきます。

・無償で diff の詳細分析と、今後同様のジョブで agent を改善する
  パターンのご報告
・当方の判断に誤解 or 情報不足がございましたら追加情報を
  ご教示いただけますと幸いです。再検討させていただきます。
・Beta 期間の好意 (ポリシー外の運用上の措置) として、
  同一または別リポジトリでの次回移行に対して 50% クレジットを
  発行することも可能です。ご希望の場合はお申し付けください。

ご期待に添えない結果となり大変申し訳ございません。
ご希望の対応をお知らせいただけますでしょうか。

引き続きどうぞよろしくお願い申し上げます。
migrate-bot サポート
```

---

## 埋める値

| プレースホルダ | 取得元 |
|---|---|
| `[CUSTOMER_NAME]` | メール署名から |
| `[REPO_FULL_NAME]` | `orders.repo_full_name` |
| `[ORDER_ID_SHORT]` | `orders.id` 先頭 8 文字 |
| `[#PR_NUMBER]` | `jobs.pr_url` から PR 番号抽出 |
| `[DATE]` | `jobs.completed_at` を YYYY-MM-DD に |
| `[CUSTOMER_DESCRIPTION_OF_ISSUE]` | 顧客メールから引用 (1 行に要約) |
| `[SPECIFIC_REASON]` | 当方の判定根拠 (Refund Policy §2.X 該当を明示) |

## 重要な原則

1. **顧客側の落ち度を強調しない** — 「あなたが悪い」と読める文面は避ける
2. **却下の根拠は Refund Policy 該当条文を必ず引用** — 後から言い分が変わったように見せない
3. **Goodwill オプション (50% クレジット 等) を必ず提示** — 完全 No だけだと感情的反発を招く
4. **再検討余地を残す** — 「情報不足ならご教示ください、再検討します」 は実質コスト 0 で重要
5. **却下後 24 時間以内に顧客が "では訴訟する" 等の威圧** が来たら **即時 ZeLo 相談**
