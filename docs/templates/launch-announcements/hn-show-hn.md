# HN: Show HN draft

> Status: DRAFT
> Submission URL: https://news.ycombinator.com/submit
> 投稿時刻: 月-木 PT 7-9 am(US 平日朝のフロントページ採用が目立ちやすい時間帯)
> 1 投稿 / 月制限あり

---

## Title(80 文字以内)

```
Show HN: migrate-bot – Pages Router → App Router migration as a draft PR
```

**Title バリエーション**(operator が好みで選ぶ):

- `Show HN: migrate-bot – Pay $99, get a Next.js Pages → App Router PR`
- `Show HN: migrate-bot – Automated Next.js Pages Router migrations`
- `Show HN: I built a service that migrates Next.js to App Router for you`

→ **推奨は最初**(具体的でクリック誘発、`Show HN` 慣例に沿う)

---

## URL

```
https://migrate-bot.dev
```

---

## Text(任意。URL がメインなら空欄でも OK)

HN の Show HN は URL のみで本文なしも一般的だが、**少しだけコンテキストを書く** と engagement が上がる傾向。以下を「Text」フィールドに(空白許容):

```
I'm a student in Japan and I built migrate-bot to automate the
Pages Router → App Router migration that most teams keep putting off.

How it works:
- Install the GitHub App on one repo
- Pay per repo ($99 / $249 / $499 by file count)
- Our agent (powered by Claude) clones, plans, rewrites each file,
  runs typecheck + `next build`, and opens a draft PR
- Most jobs finish in 5–15 minutes
- 14-day full refund if our verify can't pass

Tech: Cloudflare Workers + D1 + Queues, Fly.io Machines for the runner,
Anthropic Claude API for the LLM work, Stripe for payment, Resend for
emails. Stack diagram and pricing on the landing page.

What I'd love feedback on:
1. The pricing tiers — $99/$249/$499 — is that the right shape?
2. The "draft PR + 14-day refund" trust model — does that feel safe
   enough to actually try?
3. Any failure modes I should plan for that I haven't thought of?

Demo video (~4 min): [INSERT_YOUTUBE_URL]
Pricing: https://migrate-bot.dev/#pricing
Refund policy: https://migrate-bot.dev/legal/refunds

Happy to answer questions.
```

---

## 投稿後の対応

### 必ずやる

1. 投稿後 **30 分以内に最初のコメント** を 1 つ自分から付ける(エンジニアリング上の興味深い詳細など)。これで自身のスレッドが「誰もコメントしていない」状態を避ける
2. **すべてのコメントに 24 時間以内に返信**。建設的な批判には謝意 + 具体的な改善方針
3. 「downvoted to oblivion」を避けるため、**自社宣伝色の強い表現は避ける**(HN ガイドライン)

### 想定される質問とテンプレ回答

| 質問 | 回答テンプレ |
|---|---|
| 「Just use `@next/codemod`?」 | 公式 codemod は構文変換のみ。getStaticProps → async server component 等の semantic 書き換えは未対応(差別化点) |
| 「How does it handle X edge case?」 | 「Currently we abort with a refund for X. Roadmap on that here: [link]」 |
| 「Why not open source?」 | 「Prompts and agent infrastructure are commercial. Customer code is never retained. See privacy policy.」 |
| 「Is this safe to run on prod code?」 | 「Output is *draft* PR — your CI runs first. Refund if verify can't pass.」 |
| 「Pricing seems high」 | 「One-time, no subscription. Manual migration takes a senior engineer 2-3 days; $99 is < 1 hour of that rate.」 |
| 「Is the migrated code idiomatic?」 | 「We use Claude Sonnet for the per-file rewrite. Quality varies; the verify step catches build failures, but you should still review.」 |

### NG 行動

- ❌ アカウント作成直後に投稿(throttled)
- ❌ 自分で複数 upvote(BAN 即時)
- ❌ 知人に upvote 依頼(検出されたら BAN)
- ❌ 「Plug」「Promo」 などの語を多用

---

## 期待される結果

| シナリオ | 確率 | 結果 |
|---|---|---|
| Front page(top 30)入り | 10-20% | 数時間で 100-1,000 PV、initial signup が来るかも |
| Top 100 程度で停滞 | 50-60% | 数十 PV、コメント 0-5 件、無風 |
| Flagged / dead | 5-10% | 何も起きない、再投稿は別アカウントから 1 ヶ月以上待つ |

→ **無風が想定範囲**。これで market validation の代替シグナルになる:
- コメントゼロ → ICP の関心は薄い → ピボット検討
- コメントあり、申込ゼロ → 価格 / メッセージ / 信頼性に課題
- 申込あり → ローンチ仮説が成立、改善継続

---

## CLAUDE.md §6 確認

公開文言。operator が必ずレビュー。特に:
- 「I'm a student in Japan」を含めるか(透明性 vs 信頼性のトレードオフ)
- 価格表記の正確性
- Demo video URL の最終版
