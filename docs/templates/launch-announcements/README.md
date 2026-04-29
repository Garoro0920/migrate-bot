# Launch announcements (drafts)

Phase 4 §2.4 ローンチ告知文 3 種のドラフト。**operator が公開前に必ずレビュー**(`CLAUDE.md` §6 公開文言の確認必須項目)。

| ファイル | 用途 |
|---|---|
| [`hn-show-hn.md`](./hn-show-hn.md) | Hacker News "Show HN" 投稿 |
| [`reddit-r-nextjs.md`](./reddit-r-nextjs.md) | Reddit r/nextjs 投稿 |
| [`x-twitter-thread.md`](./x-twitter-thread.md) | X (Twitter) スレッド(3-5 ポスト) |

## 公開のタイミング

`docs/phase-4-deployment.md` §12 推奨スケジュール:

```
月 PT 7-9 am — HN "Show HN" 投稿
火 — Reddit r/nextjs 投稿(HN の反応を見て少しメッセージ調整)
水 — X (Twitter) スレッド投稿
木以降 — 個別反応にレスを集中
```

> ⚠ HN は「1 投稿 / 月」制限。フライング投稿は禁止。
> ⚠ Reddit r/nextjs は「自社宣伝」と判定されるとアカウント BAN。**一度コメントで他のスレッドに参加**してからの方が安全。

## 公開前のチェックリスト

- [ ] operator が全文レビュー済(§6)
- [ ] `<DOMAIN>` は `migrate-bot.dev` に置換済
- [ ] 価格 ($99/$249/$499) が business.md と一致
- [ ] デモ動画 URL が貼られている(`docs/templates/demo-video-script.md` 参照)
- [ ] GitHub App install URL が `https://github.com/apps/migrate-bot/installations/new` に正しい
- [ ] support email が `support@migrate-bot.dev` または現行の operator email
- [ ] 法務文書 4 点が公開済
- [ ] Stripe Live mode が活性化済
- [ ] バグ・障害がない状態で投稿(投稿後の流入で初日にトラブルが起きると印象悪い)
