# Generic FAQ response template

> 顧客からよくある質問への簡潔な回答集。
> Landing page の FAQ セクションで答えていない / 答えていても顧客が
> メールで聞いてきた場合に使う。

---

## Q1: How long will my migration take?

```
Most small repos (≤100 files) finish within 5–15 minutes. Medium
repos (≤500 files) usually 10–30 minutes. Larger or more complex
repos may take longer — sometimes up to several hours for the
biggest jobs.

The maximum window is 14 days; if your job hasn't completed by
then, you'll receive an automatic full refund per our refund
policy.

You'll get an email when your draft PR is ready. You don't need
to keep the page open after payment.
```

---

## Q2: What if my repo has a custom server (`server.ts` etc.)?

```
Currently we abort with a refund if our analyzer detects a custom
server, since the App Router migration of those is non-trivial
and we'd rather refund than ship a half-broken PR. We're tracking
custom server support on our roadmap.

If you'd like to discuss your specific case, let me know your repo
URL (public, or share read access to a private one) and I can
take a look manually.
```

---

## Q3: Does it work with Tailwind / styled-components / CSS modules?

```
Yes. We don't touch your styling layer — file moves preserve
imports, and CSS modules / Tailwind / styled-components / Emotion
all continue to work. We've tested on `next-tailwind` and a few
private repos with various setups.

If you have a specific setup that's failing, share the repo or
the diff and we'll investigate.
```

---

## Q4: Can you migrate just specific routes, not the whole `pages/` directory?

```
Phase 4 (current) covers the entire `pages/` directory in one PR.
Selective migration is on the roadmap (Phase 5+) but not yet
available.

If you have a specific subset you want migrated, you can:

a) Manually move the routes you don't want migrated *out* of
   `pages/` before installing the App, run our service, then move
   them back into `pages/` after. The App Router and Pages Router
   coexist in Next.js 13+.

b) Wait for our selective-migration support; we'll email you when
   it ships if you'd like.
```

---

## Q5: My CI is failing after I merged the PR. Help?

```
Sorry to hear that. A few questions to help me investigate:

1. What's the failure? (failing test name, build error, runtime
   error?)
2. Is the failure something that was passing on main before the
   merge?
3. Did you make any local changes after our PR was opened, or
   merge it as-is?

If the failure is on our side (PR as-merged broke something we
should have caught), we'll either:
- Investigate and push a fix to your branch (if the PR is still
  open or recently merged), or
- Process a full refund per Refund Policy Section 1

If the failure is downstream of customizations you made after
the PR opened, that falls under Section 2 of the policy. We can
still help debug, just with a different commercial framing.

Either way, share the failure details and we'll get on it.
```

---

## Q6: Is my source code retained after the migration?

```
No. Your repository contents are processed only on a temporary
virtual machine that is destroyed at job end (typically within
minutes). We don't retain a copy.

The only data we keep long-term is metadata: file paths, line
counts, error messages, token counts, and timestamps. Source
code snippets are not in our logs.

For full details, see our Privacy Policy at
https://migrate-bot.dev/legal/privacy.

Anthropic's API contract additionally states that data sent to
the Claude API is not used for training. We rely on that for
the migration LLM step.
```

---

## Q7: Do you offer enterprise / monorepo support?

```
Monorepos and large enterprise codebases (>2,000 files) require
manual quoting due to the complexity. If you're interested,
please share:

- Approximate `pages/` file count
- Whether the repo is a single Next.js app or a monorepo
- Any non-standard configuration (custom server, plugins,
  internal packages with peer deps, etc.)
- Your timeline

We'll quote within 2 business days.
```

---

## Q8: I'm in the EU. Can I use this?

```
Currently no — at our launch the Service is not offered to
residents of the European Economic Area, the United Kingdom, or
Switzerland (Terms of Service Section 2). The reason is GDPR /
UK GDPR / Swiss FADP compliance: as a small operator we can't
credibly meet the full data-controller obligations on day 1.

We expect to revisit this once we have proper DPA infrastructure,
likely 6–12 months after launch.

If you're outside those jurisdictions but happen to have an EEA
billing card, please reply with that context and I can re-evaluate
your specific case.
```

---

## Q9: Can I get a quote before paying?

```
For Small / Medium / Large tiers ($99 / $249 / $499) the price
is fixed by file count under `pages/` + `components/`, so the
landing page calculator at https://migrate-bot.dev/#estimator
gives the exact number — feel free to plug in your repo there.

For Enterprise / monorepo, please share details (Q7 fields) and
I'll quote within 2 business days.
```

---

## Q10: How does this compare to `@next/codemod`?

```
The official `@next/codemod` handles syntactic patterns —
useRouter → useRouter from next/navigation, etc. It doesn't:

- Convert getStaticProps / getServerSideProps to async server
  components (semantic rewrite, not just syntax)
- Migrate `pages/api/*` → `app/api/*/route.ts` route handlers
- Move `next/head` to the Metadata API consistently
- Update relative imports when files move into `app/` (which
  changes directory depth)
- Run a verify pass before opening a PR

Our agent (Anthropic Claude) does each of these. The output is
a draft PR so you can validate, run your own CI, and merge.

For very simple repos, `@next/codemod` may be enough and you
shouldn't pay us. For non-trivial repos, the verify-or-refund
model is meant to make this a low-risk decision.
```

---

## 埋める値

各 Q&A はそのまま使える。状況に応じて 1 行追加 / 削除して send。

## 利用上の注意

- **逐次 update 必要**: launch 後の実際の問い合わせを見て、テンプレを増やす / 修正
- **landing FAQ と整合性**: Q1 / Q3 等は landing FAQ にも書いてあるので **同じ内容を答える** こと (矛盾は信頼喪失)
- **Q5 (CI fail) は要判定** — Refund Policy §1 / §2 の見極めが必要、operator 個人裁量で勝手に決めない
