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
following applies. You may notify us at any time within **30 days of
payment**; for failures attributable to the Service, we will also process
the refund proactively (without you having to ask) where we can detect
the failure on our side.

- Our automated verification (TypeScript typecheck and `next build`) cannot
  reach a passing state within 14 days of payment for reasons attributable
  to the Service.
- The migration job fails to complete due to a Service-side defect (for
  example, a runtime error inside our agent that we cannot reproduce as a
  pre-existing condition in your repository).
- Our agent identifies a blocker in your repository that we did not detect
  upfront (for example, a custom server, monorepo layout that our analyzer
  missed, or a regulated dependency we cannot process). In this case the
  migration job is aborted and the refund is processed promptly upon our
  detection of the blocker.

In refund-eligible cases, the refund covers the full order price. Refunds
are issued back to the original payment method via Stripe and typically
clear within 5–10 business days depending on your card issuer.

> **Note on 14 days vs 30 days**: 14 days is our internal commitment for
> when the Service must complete the migration (役務提供時期). If we
> haven't delivered a passing draft PR by then, the order qualifies for a
> refund. 30 days is the window during which **you** can notify us of
> issues you've observed (e.g., quality problems noticed after merge);
> see Section 5 for the request procedure.

## 2. Not refund-eligible

Subject to Section 2A below, the following situations are **not**
eligible for refund:

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

## 2A. Carve-out for our intentional misconduct, gross negligence, or non-conformance

Notwithstanding Section 2 and Section 3, the limitations in this Refund
Policy do **not** apply to and do **not** waive any of the following:

- Damage caused by **our intentional misconduct or gross negligence
  (故意又は重大な過失)**;
- A **non-conformance with the contract (契約不適合)** in the migration
  output that exists at the time of delivery and that is attributable to
  the Service. In such a case, you retain your rights under Civil Code
  Articles 562 through 564 (代金減額請求権・履行追完請求権・解除権)
  and equivalent statutory remedies, regardless of the outcome of our
  automated verification step;
- For Japan-resident consumer customers, any right under the Consumer
  Contract Act (消費者契約法), including without limitation Articles
  8, 8-2, 9, and 10. This Refund Policy is to be construed and applied
  consistently with those provisions and shall not operate to
  invalidate the consumer's statutory rights.

If you believe Section 2A applies to your situation, contact
<CONTACT_EMAIL> with the order details and a description of the
non-conformance. We will respond within 2 business days and, where
your claim is well-founded, issue a full or partial refund (or other
remedy) consistent with applicable law.

## 3. Partial refunds

As a general matter we do not issue partial refunds; the unit of sale is
the migration job and we either deliver a working draft PR or refund the
entire order price. **However, this Section 3 does not limit any right
to partial-price reduction (代金減額請求権) under Civil Code Articles
562–564 in cases of contract non-conformance, nor any other partial
remedy required by applicable consumer-protection law.**

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
applicable consumer-protection laws. This Refund Policy is incorporated by
reference into our [Terms of Service](/legal/terms) §6 and is to be read
together with that document.

## 7. Changes

We may update this Refund Policy from time to time. The current version is
always posted at https://migrate-bot.dev/legal/refunds.
