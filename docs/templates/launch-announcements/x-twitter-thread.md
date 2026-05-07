# X (Twitter) thread draft

> Status: DRAFT
> 投稿時刻: HN + Reddit の翌日 水 〜 木 PT 7-9 am or JP 22-24 (US 朝)
> Format: 5 連スレッド(本論 4 + cta 1)

---

## Thread 構成

各 post は 280 文字以内(英語)。改行 / 絵文字は適度に。
`migrate-bot.dev` は thread 末尾の post で 1 度だけ。

---

## Post 1/5(Hook、最重要)

```
Migrating a Next.js codebase from Pages Router to App Router takes 2-3
days of senior eng time, minimum.

I built a service that does it in one PR for $99-$499.

You install a GitHub App, pay, and review the draft PR. Refund if our
build doesn't pass within 14 days.

Thread 🧵
```

**280 文字制限チェック**: ↑ は 245 文字。OK。

---

## Post 2/5(How it works)

```
The flow:

1. Install the GitHub App on one repo
2. We size the repo from `pages/` + `components/` file count → plan
   tier ($99 / $249 / $499)
3. Pay via Stripe Checkout
4. Agent (Claude) clones to a Fly.io VM, plans, rewrites files, runs
   typecheck + `next build`
5. Draft PR opens, email lands

Typical small repos: 5–15 min. Larger/complex repos may take longer.
```

---

## Post 3/5(Differentiation)

```
Why not just use `@next/codemod`?

The official codemod handles syntax. Our agent additionally:

- Converts getStaticProps to async server components
- Moves next/router → next/navigation
- Migrates next/head → Metadata API (best-effort; some patterns
  remain a mix the customer reviews)
- Updates relative imports when files move directory levels

Output is always a draft PR for you to validate.
```

---

## Post 4/5(Trust)

```
On trust, three deliberate design choices:

→ Draft PR, never auto-merged. Your CI is the gate.
→ 14-day full refund if our build verify can't pass for reasons on us.
→ Repo is on an isolated VM that's destroyed at job end. No retention,
  no training-data use. Anthropic API contract backs that.
```

---

## Post 5/5(CTA)

```
Built solo as a student in Japan. End-to-end works on real Next.js
repos today.

Demo (4 min): [INSERT_YOUTUBE_URL]

Pricing + how it works:
👉 migrate-bot.dev

Beta-priced for the first 3 customers. Reply or DM if you want in.
```

---

## 補助 reply candidates

メインスレッド以外、想定される質問への返信:

### Q: "How does it handle X?"

```
Good question. For monorepos and projects with custom servers we
currently abort and refund — that's on the Phase 5 roadmap. For
[specific case], the agent [specific behavior]. Happy to share more.
```

### Q: "Is the migrated code idiomatic?"

```
We use Claude Sonnet 4.6 for the per-file rewrite and Opus 4.7 as a
fallback. Quality is "good enough that build passes," not "indistinguishable
from a senior engineer." The draft-PR + verify model is specifically to
let your review be the final word, not ours.
```

### Q: "Source available?"

```
Closed source for now. Customer code is never retained — see privacy
policy at migrate-bot.dev/legal/privacy. If you need source-available
for procurement, ping me; we can discuss enterprise options.
```

### Q: "Why not free?"

```
LLM cost per migration is real ($0.05–$2 depending on size, plus VM
time). At $99 the unit economics work for both sides; at $0 they
don't. The 14-day refund is the trust mechanism instead of $0.
```

---

## 投稿後の対応

- 反応した人に対して、できる限り個別 reply
- DM で beta 申込が来たら **手動で /admin/trigger** から流す(operator の運用作業)
- 良い反応のあるツイートは pinned tweet にして 1 週間維持
- リツイート / 共有してくれたユーザーに ✨ で謝意

---

## NG 行動

- ❌ Bot 風の連投(時間を空けない)
- ❌ ハッシュタグスパム(#javascript #react #typescript ... 5 個以上)
- ❌ 「@」で大物に対して unsolicited なメンション
- ❌ Like / RT 買い

---

## 期待される結果

X は impression が出やすい代わり engagement → conversion は低い。

| シナリオ | 確率 | 結果 |
|---|---|---|
| 1,000+ impression、10+ engagement | 20-30% | brand awareness |
| 100-1,000 imp、3-10 eng | 40-50% | 細々と |
| 100 未満 imp | 30% | Algorithm に拾われず |

→ 単独では弱い。**HN + Reddit + X の合算で initial traction** を狙うのが現実的。
