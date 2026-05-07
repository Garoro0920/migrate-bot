# Acknowledgment template

> 顧客メール受領確認、調査・対応に時間がかかる場合に**まず先に**送る。
> 30 分以内に送ることを目標。

---

## English version

```
Hi [CUSTOMER_NAME],

Thanks for reaching out. We've received your message regarding
[BRIEF_SUMMARY: e.g., "the migration job for octocat/hello"] and
wanted to confirm it has reached the right place.

We'll investigate and respond with a substantive answer within
[2 business days / 1 business day if urgent]. If you need to add
any context (additional logs, screenshots, expected behavior), feel
free to reply to this thread anytime.

Best regards,
— migrate-bot support
```

## 日本語版 (日本居住顧客向け)

```
[CUSTOMER_NAME] 様

ご連絡いただきありがとうございます。
[BRIEF_SUMMARY: 例「リポジトリ ○○ の移行ジョブについてのお問い合わせ」]
の件、確かに承りました。

内容を確認のうえ、[2 営業日 / 緊急の場合は 1 営業日] 以内に
改めて詳細をご連絡いたします。
追加情報 (ログ、スクリーンショット、想定動作等) がございましたら、
本メールに返信する形でお送りください。

引き続きどうぞよろしくお願いいたします。
migrate-bot サポート
```

---

## 埋める値

| プレースホルダ | 例 |
|---|---|
| `[CUSTOMER_NAME]` | メール署名から抽出、不明なら "there" / "様" |
| `[BRIEF_SUMMARY]` | 顧客メール 1 文目を要約 (1 行) |
| `[2 business days / 1 business day]` | 状況に応じて選択 |

## 送信タイミング

- 受領後 **30 分以内**
- operator が外出中など即時対応不能なら、Gmail のフィルタ + Auto-reply (vacation responder) で受領確認を自動化することも検討
- ただし **Auto-reply は 24 時間以内に手動 follow-up が必須**(ボット応答だけは失礼)
