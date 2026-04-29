# Refund Policy

> **Status: DRAFT — not yet legally reviewed.**
> Operator must have this policy reviewed alongside the Terms of Service.
>
> Placeholders to fill before publishing:
> - `<CONTACT_EMAIL>`
> - `<EFFECTIVE_DATE>`
> - `migrate-bot.dev`

**Effective date: <EFFECTIVE_DATE>**

We are committed to delivering working migration output. This Refund Policy
explains when you are entitled to a refund and how to request one.

## 1. Refund-eligible scenarios

You are eligible for a **full refund** of the order price if **any** of the
following applies and you contact us within 14 days of payment:

- Our automated verification (TypeScript typecheck and `next build`) cannot
  reach a passing state for reasons attributable to the Service.
- The migration job fails to complete due to a Service-side defect (for
  example, a runtime error inside our agent that we cannot reproduce as a
  pre-existing condition in your repository).
- Our agent identifies a blocker in your repository that we did not detect
  upfront (for example, a custom server, monorepo layout that our analyzer
  missed, or a regulated dependency we cannot process). In this case the
  refund is automatic; the migration job is aborted and the refund is
  initiated within minutes.

In refund-eligible cases, the refund covers the full order price. Refunds
are issued back to the original payment method via Stripe and typically
clear within 5–10 business days depending on your card issuer.

## 2. Not refund-eligible

The following situations are **not** eligible for refund:

- The CI / typecheck / build failures arise from changes you made to your
  repository after our migration job ran (including custom tests we did
  not have visibility into at job time).
- The CI / typecheck / build failures arise from your custom configuration,
  proprietary plugins, internal libraries, or third-party services we have
  no visibility into.
- You change your mind after the draft pull request was successfully
  produced. Once a PR is open and our verification passed, the order is
  considered fulfilled.
- You requested cancellation but the migration job had already completed
  successfully.

## 3. Partial refunds

We do not issue partial refunds. The unit of sale is the migration job; we
either deliver a working draft PR or we refund the entire order price.

## 4. Cancellation before job completion

If you contact us before the migration job has produced a draft PR (typical
window: 0–10 minutes after payment), we may be able to cancel and refund
the order, but cancellation is not guaranteed once the job has started.
Email <CONTACT_EMAIL> immediately if you wish to cancel.

## 5. How to request a refund

Email <CONTACT_EMAIL> with:

1. The email address used at checkout
2. The repository full name (e.g., `octocat/hello`)
3. A short description of the issue

We will respond within 2 business days. If your case falls under Section 1,
we will initiate the refund through Stripe immediately. We may ask
clarifying questions before issuing a refund where the cause is unclear.

## 6. Disputes

If you disagree with our refund decision, please reply to our determination
email and we will review the case again with a different reviewer. If we
still cannot reach an agreement, you retain your statutory rights under
applicable consumer-protection laws.

## 7. Changes

We may update this Refund Policy from time to time. The current version is
always posted at https://migrate-bot.dev/refunds.
