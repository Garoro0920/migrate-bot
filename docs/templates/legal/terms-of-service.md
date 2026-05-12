# Terms of Service

> **Status: DRAFT — not yet legally reviewed.**
> Operator must have these terms reviewed by a lawyer (or at minimum, by a
> service like LegalZoom / SmartAsset) before publishing.
>
> Placeholders to fill before publishing:
> - `Sawai Kouki` — operator's legal name on file
> - `support@migrate-bot.dev` — support contact email
> - `2026-05-12` — date this version takes effect
> - `migrate-bot.dev` — production domain once registered
>
> Self-review notes (see `docs/legal-self-review-log.md`):
> - Governing law fixed to Japan (operator-resident jurisdiction). Tokyo
>   District Court non-exclusive. Consumer's domicile-court right under 民訴法
>   3-4 preserved.
> - Section 9/10/11 contain explicit "intentional misconduct or gross
>   negligence" carve-outs to comply with 消費者契約法 8〜10 条.
> - Section 2 excludes EEA/UK/CH residents to keep the Service outside the
>   GDPR territorial scope.

**Effective date: 2026-05-12**

These Terms of Service ("Terms") govern your use of the migrate-bot service
("Service") provided by Sawai Kouki ("we", "us", "our"). By
installing the migrate-bot GitHub App, paying for a migration, or otherwise
using the Service, you ("Customer", "you") agree to these Terms.

If you do not agree to these Terms, do not use the Service.

## 1. The Service

The Service automatically converts a Next.js application from the Pages Router
to the App Router and produces a draft pull request in your GitHub repository.
The Service operates as a GitHub App and processes the source code of one
selected repository per paid order.

The Service uses third-party AI providers (currently Anthropic) to perform
the code transformation. By using the Service you acknowledge that the
contents of the source files in your selected repository will be transmitted
to those providers solely for the purpose of producing the migration output.

## 2. Eligibility and Account

You represent that:

- You are at least 18 years old (or the age of majority in your jurisdiction).
- You have the authority to grant migrate-bot access to the GitHub
  organization or user account whose repository you select.
- You are not a competitor of the Service intending to reverse-engineer it.
- You will not use the Service from a country subject to a comprehensive U.S.
  trade embargo.
- **You are not a resident of, and do not access the Service from, the
  European Economic Area (EEA), the United Kingdom, or Switzerland.** The
  Service is not currently offered to residents of those jurisdictions.
  If you are unsure whether this restriction applies to you, please contact
  us at support@migrate-bot.dev before paying.

You are responsible for the security of your GitHub account and the
correctness of your billing information.

## 3. Permitted Use

You may use the Service to migrate repositories you own or repositories your
organization owns and on which you have authority to install third-party
GitHub Apps. You may use the resulting pull request and migrated code without
restriction in your own products.

## 4. Prohibited Use

You may not:

- Submit a repository you do not have authority to modify.
- Submit content that is unlawful, infringing, malicious (malware,
  cryptominers, etc.), or that violates third-party rights.
- Attempt to circumvent rate limits, bypass billing, or extract proprietary
  prompts or system messages from the Service.
- Use the Service to migrate repositories whose content cannot be lawfully
  transmitted to a third-party AI processor (for example, repositories that
  contain regulated personal data subject to data-residency requirements
  incompatible with our subprocessors). See Privacy Policy.
- Resell the Service to third parties without our prior written consent.

We may suspend or terminate access if we reasonably believe these terms have
been violated.

## 5. Pricing and Payment

Pricing is per-migration and is presented at checkout in U.S. dollars. The
current plans are:

| Plan | Eligibility | Price (USD) |
|---|---|---|
| Small | Up to 100 files in `pages/` and `components/` | $99 |
| Medium | Up to 500 files | $249 |
| Large | Up to 2,000 files | $499 |
| Enterprise | More than 2,000 files or monorepo | Custom quote |

Payments are processed by Stripe. By submitting payment you authorize Stripe
and us to charge your selected payment method for the chosen plan.

We may change pricing at any time. Changes do not apply retroactively to
already-purchased migrations.

## 6. Refunds

Refunds are governed by our [Refund Policy](/legal/refunds), which is
incorporated into these Terms by reference. In summary, you are entitled to
a full refund of the order price for any failure attributable to the
Service — including unrecoverable verification failure within the 14-day
service-delivery window, agent-side defects, and blockers we did not
detect upfront. The full list of refund-eligible scenarios, exclusions,
and the 30-day notification window during which you may raise issues are
described in the Refund Policy.

## 7. Intellectual Property

### 7.1 Your code

You retain all rights, title, and interest in and to your repository and any
migrated output. We do not claim any ownership of your code or your migrated
output.

### 7.2 Our Service

The migrate-bot software, prompts, agent infrastructure, and documentation
are owned by us. Nothing in these Terms grants you a license to our software
or prompts beyond using the Service as documented.

### 7.3 No training-data use

We do not retain your repository contents after the migration job completes,
and we do not use your repository contents to train any machine-learning
model. See the Privacy Policy for details on data handling.

## 8. Third-party services

The Service depends on third-party services including:

- **Anthropic** (LLM provider used for code transformation)
- **GitHub** (repository hosting and OAuth provider)
- **Stripe** (payment processing)
- **Cloudflare** (web infrastructure)
- **Fly.io** (compute infrastructure)
- **Resend** (transactional email)

Their respective terms and privacy policies apply to your interactions with
them. We are not responsible for actions or omissions of these third parties,
but we will work in good faith to address service incidents.

## 9. Service availability and disclaimers

The Service is provided on an "as is" and "as available" basis. Except to
the extent prohibited by applicable consumer-protection law (including, for
Japan-resident customers, the Consumer Contract Act, Articles 8 through
10), we make no express or implied warranty of merchantability, fitness for
a particular purpose, or non-infringement.

We do not warrant that the migrated output will be free of bugs, will
compile in every environment, or will be functionally identical to your
original codebase. The output is provided as a *draft* pull request
specifically so that you can review and adjust before merging.

**Nothing in this section excludes or limits our liability for damages
caused by our intentional misconduct or gross negligence (故意又は重大な
過失). The limitations in this Section 9 and Section 10 apply only to
ordinary negligence (軽過失) and to the maximum extent permitted by
applicable law.**

## 10. Limitation of liability

Subject to Section 9 and to applicable consumer-protection law, our total
cumulative liability under these Terms for any claim arising out of or
relating to a particular migration order shall not exceed the amount you
paid us for that order.

To the maximum extent permitted by applicable law and except in the case
of our intentional misconduct or gross negligence, we will not be liable
for indirect, incidental, consequential, special, or exemplary damages,
including without limitation lost profits, lost data, lost goodwill, or
business interruption, even if we have been advised of the possibility of
such damages.

**For Japan-resident consumer customers**: Pursuant to the Consumer
Contract Act (消費者契約法) Articles 8 and 10, none of the limitations
in this Section 10 shall apply where they would void the limitation
under those Articles. In particular, this Section 10 does not exclude
liability arising from our intentional misconduct or gross negligence,
and does not impose any obligation that would unilaterally harm consumer
interests in violation of Civil Code Article 1, Paragraph 2.

## 11. Indemnification

To the extent permitted by applicable law, and only where you have acted
intentionally or with negligence, you agree to indemnify and hold us
harmless from third-party claims, damages, and reasonable expenses
arising from:

- Your material breach of these Terms;
- Your repository content infringing on third-party rights or violating
  applicable law (where you knew or should have known of the violation);
- Your unauthorized or unlawful use of the Service.

This Section 11 does not apply to claims caused in whole or in part by
our intentional misconduct or gross negligence. For Japan-resident
consumer customers, this Section 11 is to be construed and applied
consistently with the Consumer Contract Act, Article 10, and shall not
operate to unilaterally harm consumer interests beyond what general law
would impose.

## 12. Termination

You may stop using the Service at any time. We may terminate or suspend
your access if we reasonably believe you have violated these Terms or if
required by law. Sections 7, 9, 10, 11, and 13 survive termination.

## 13. Governing law and disputes

These Terms are governed by the laws of Japan, without regard to
conflict-of-law principles. The Tokyo District Court (東京地方裁判所)
shall have non-exclusive jurisdiction as the court of first instance for
any dispute arising out of or in connection with these Terms or the
Service.

**For Japan-resident consumer customers**: Notwithstanding the above,
nothing in this Section 13 limits a consumer's right under the Code of
Civil Procedure (民事訴訟法) Article 3-4 to bring proceedings in the
courts of the place of the consumer's domicile at the time of contract
formation, or to invoke any other consumer-protection forum granted by
Japanese law.

Either party may seek equitable relief in any court of competent
jurisdiction to protect its intellectual property.

## 14. Changes to these Terms

We may update these Terms from time to time. The current version is always
posted at https://migrate-bot.dev/legal/terms. Material changes will be announced by
email to active customers at least 14 days before they take effect.

## 15. Contact

Questions about these Terms can be sent to support@migrate-bot.dev.
