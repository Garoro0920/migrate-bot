# Customer Support Templates

ローンチ後の顧客対応で頻発する 7 シナリオの返信テンプレート集。
すべて英語ベース (主要顧客層が英語圏のため)。日本居住顧客向けには
末尾の日本語ブロックを使う。

## 設計原則

1. **2 営業日以内に応答** (refund-policy.md §5 で約束済)
2. **絶対に無視しない** — 受領確認だけでも返信する (acknowledgment.md)
3. **Refund Policy §1-3 に厳密に従う** — operator 個人裁量で勝手に決めない
4. **故意・重過失起因のクレームは Refund Policy §2A で全額返金 + 謝罪** — 訴訟予防、$99-499 規模で粘らない
5. **テンプレを編集して送る前提** — 状況固有の値 (repo, plan, PR URL, refund amount) を埋める

## テンプレート一覧

| ファイル | シナリオ | 頻度予想 |
|---|---|---|
| [`acknowledgment.md`](./acknowledgment.md) | 受領確認、回答に時間が必要なとき | 高 |
| [`refund-approve-manual.md`](./refund-approve-manual.md) | 顧客側が refund 要求、Refund Policy §1 該当で承認 | 中 |
| [`refund-decline.md`](./refund-decline.md) | Refund Policy §2 該当(顧客側都合)で却下 | 中 |
| [`pr-issue-investigation.md`](./pr-issue-investigation.md) | 顧客が PR の品質問題を報告、調査開始の連絡 | 高 |
| [`eea-uk-ch-rejection.md`](./eea-uk-ch-rejection.md) | EEA/UK/CH 居住者が ToS §2 違反で決済通過 → 即時 refund + 利用拒否 | 低 (Stripe 画面警告で抑止) |
| [`appi-data-request.md`](./appi-data-request.md) | 日本居住者から APPI 32-35 条 個人情報開示請求 | 低 (将来の運用想定) |
| [`generic-faq.md`](./generic-faq.md) | よくある質問への簡潔な回答群 | 中 |

## 運用フロー

```
顧客メール受信 (support@migrate-bot.dev → operator Gmail に転送)
  ↓
operator が状況判定 (どのテンプレが該当するか)
  ↓
30 分以内に acknowledgment.md (即時受領確認)
  ↓
状況調査 (jobs / orders / job_events / Fly logs / GitHub PR 確認)
  ↓
2 営業日以内に該当テンプレで返信
  ↓
DB に対応履歴を記録 (将来 Sentry / Linear 等で記録、現状は手動)
```

## 注意事項

- **金額・支払い先・本人確認情報** を顧客に開示する場合は二重確認
- **法律上の主張**(訴訟、損害賠償等)が顧客から来た場合は **必ず一旦 acknowledgment のみ** で返信、その後 ZeLo 法律事務所に相談 (野村弁護士、5/12 初回無料相談済)
- **EEA/UK/CH 居住者** が万一発覚した場合は `eea-uk-ch-rejection.md` で即時対応 (放置は GDPR 適用域に引き込まれるリスク)
- **個人情報の取扱い**: 顧客 email・repo 名・PR URL を operator の手元 (Gmail / メモ等) に保管する場合は `docs/security.md` のキー管理ルールに準拠

## §6 公開文言確認

これらは「直接顧客に送るメール文面」なので CLAUDE.md §6 に該当。
operator が初回送信前に必ずレビュー。複雑な状況は ZeLo に確認。
