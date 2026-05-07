# Reddit r/nextjs draft

> Status: DRAFT
> Subreddit: https://www.reddit.com/r/nextjs/
> 投稿規則: https://www.reddit.com/r/nextjs/about/rules/
> 投稿時刻: HN 投稿の翌日 火 PT 7-9 am 推奨

---

## ⚠ Reddit r/nextjs 投稿前の必読

r/nextjs は **自社宣伝(self-promotion)に厳しい**。守るべき:

1. **9:1 ルール**: 自社投稿 1 件に対し、他者の投稿への建設的なコメント 9 件以上の履歴
2. **flair**: 投稿時に "Discussion" or "Resource" or "Help" のいずれかを付ける(self-promotion はカテゴリされていない場合 BAN リスク)
3. **モデレータ事前確認**: 公式に "Self-promotion ok?" メッセージを送る or "Discussion" 文体で書く
4. **アカウント年齢**: 1 ヶ月以上、karma 50 以上 が推奨基準(暗黙ルール)

operator の Reddit account がない場合、以下を 2-3 週間かけて準備:
- 既存の r/nextjs / r/reactjs / r/typescript スレッドに 10-20 件 質問 / コメント
- 他人の作品に建設的なフィードバック
- 自分の HN 投稿等の経験を共有(自社サービスは出さない)

→ 準備不足のまま投稿すると **shadowban** 即発生

---

## Title(300 文字制限、推奨 100 文字以内)

**Discussion 文体**(推奨):
```
Tried automating the Pages Router → App Router migration as a paid service. Curious what r/nextjs thinks.
```

**Tool announcement 文体**(BAN リスクやや高):
```
I built migrate-bot — a service that does Pages Router → App Router migration as a draft PR ($99-$499 per repo)
```

→ **推奨は最初**(Discussion 入口で community feedback を求める文体は許容されやすい)

## Flair

`Discussion` または `Resource`(モデレータの設定に従う)

---

## Body

```
Hey r/nextjs,

I'm a student building [migrate-bot.dev](https://migrate-bot.dev) — a
service that takes a Next.js repo on the Pages Router and produces a
single draft PR with the migration to the App Router.

The high-level flow:
1. Install the GitHub App on a single repo
2. Pay per repo: Small ($99, ≤100 files), Medium ($249, ≤500), Large
   ($499, ≤2000), Enterprise/monorepo (custom quote)
3. The agent (Anthropic Claude under the hood) clones the repo on an
   isolated VM, plans the migration, rewrites every file, runs `tsc
   --noEmit` and `next build`, and opens a draft PR if those pass
4. You get an email with the PR link, review, run your CI, merge

Three things I've explicitly designed in:
- **Refund**: If verify can't reach passing within 14 days for reasons
  on our side, full refund. Aim is to put the risk of "did the agent
  actually do this right" on us, not you.
- **Draft PR, not auto-merge**: Your CI is the final arbiter, not us.
- **EEA / UK / Switzerland exclusion at launch**: GDPR territorial
  scope is a real obligation I can't credibly meet as a solo founder
  on day 1. Excluding for now; will revisit later.

What I want feedback on:

1. Is the pricing shape right? Per-repo flat fee vs subscription vs
   per-file vs per-LOC? My instinct was flat-fee-by-size to make it
   easy to budget, but I might be wrong.

2. What edge cases should I worry about? My current "abort and refund"
   list: custom server, monorepo (Enterprise tier), heavy mixed-app-
   router state. What am I missing?

3. Trust: would you actually run this on a real codebase? If not, what
   would you need to see first? (Source available? Specific
   certifications? More detailed demo?)

I'd genuinely value the wider community's perspective before launch.
The product itself is built and we've completed end-to-end runs on
`vercel/next.js examples/with-typescript`, but reception will determine
whether to push for launch or pivot.

Demo video (~4 min): [INSERT_YOUTUBE_URL]
Pricing details: https://migrate-bot.dev/#pricing
Refund policy: https://migrate-bot.dev/legal/refunds

(Happy to answer technical questions about the agent design, the
Cloudflare Workers + Fly.io stack, or anything else.)
```

---

## 投稿後の対応

- すべてのコメントに丁寧に返信、特に技術的批判には誠実に
- "Looks like an ad" のコメントが付いたら謝罪 + 「discussion 寄りに書いたつもりだったが配慮不足」と認める
- DM で個人が興味を示したら beta 割引を offer する余地

---

## 期待される結果

| シナリオ | 確率 | 結果 |
|---|---|---|
| 50+ upvotes、有意な議論 | 15-25% | コミュニティの実際のフィードバック取得 |
| 数 upvote、コメント 0-5 件 | 50-60% | 静かに沈む |
| Removed by moderator | 10-15% | 規則違反(self-promotion 強すぎ等) |
| Shadowban | 5% | アカウント年齢 / karma 不足 |

---

## NG 行動

- ❌ アカウント作成 1 週間以内の投稿
- ❌ 直近 1 ヶ月の他スレッド参加履歴ゼロ
- ❌ "buy now" "limited time" 等の煽り表現
- ❌ 同じ内容を r/reactjs / r/webdev に同時投稿(crosspost violation)
- ❌ コメントで自分のサービスを過度に推す
