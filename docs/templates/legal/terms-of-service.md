# Terms of Service

> **Status: DRAFT — not yet legally reviewed.**
> Operator must have these terms reviewed by a lawyer (or at minimum, by a
> service like LegalZoom / SmartAsset) before publishing.
>
> Placeholders to fill before publishing:
> - `<OPERATOR_LEGAL_NAME>` — operator's legal name on file
> - `<CONTACT_EMAIL>` — support contact email
> - `<EFFECTIVE_DATE>` — date this version takes effect
> - `<GOVERNING_LAW>` — likely Japan (operator is Japan-based) but USD pricing
>   to global customers complicates jurisdiction; lawyer to confirm
> - `<DOMAIN>` — production domain once registered

**Effective date: <EFFECTIVE_DATE>**

These Terms of Service ("Terms") govern your use of the migrate-bot service
("Service") provided by <OPERATOR_LEGAL_NAME> ("we", "us", "our"). By
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

Refunds are governed by our [Refund Policy](./refund-policy.md), which is
incorporated into these Terms by reference. In summary: if our automated
verification (typecheck and `next build`) cannot reach a passing state within
14 days of payment for reasons attributable to the Service, you are entitled
to a full refund of the order price.

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

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

We do not warrant that the migrated output will be free of bugs, will compile
in every environment, or will be functionally identical to your original
codebase. The output is provided as a *draft* pull request specifically so
that you can review and adjust before merging.

## 10. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL CUMULATIVE LIABILITY UNDER
THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID US FOR THE INDIVIDUAL
MIGRATION ORDER GIVING RISE TO THE CLAIM.

WE WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR
EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION LOST PROFITS, LOST DATA,
LOST GOODWILL, OR BUSINESS INTERRUPTION, EVEN IF WE HAVE BEEN ADVISED OF THE
POSSIBILITY OF SUCH DAMAGES.

Some jurisdictions do not allow the exclusion or limitation of certain
damages; these provisions shall apply to the maximum extent permitted by
applicable law.

## 11. Indemnification

You agree to indemnify and hold us harmless from claims, damages, and
expenses (including reasonable attorneys' fees) arising from:

- Your breach of these Terms;
- Your content or repository (including infringement of third-party rights);
- Your violation of applicable law in connection with the Service.

## 12. Termination

You may stop using the Service at any time. We may terminate or suspend
your access if we reasonably believe you have violated these Terms or if
required by law. Sections 7, 9, 10, 11, and 13 survive termination.

## 13. Governing law and disputes

These Terms are governed by the laws of <GOVERNING_LAW>, without regard to
conflict-of-law principles. Any dispute will be resolved in the courts of
<GOVERNING_LAW>, except that either party may seek equitable relief in any
court of competent jurisdiction to protect its intellectual property.

## 14. Changes to these Terms

We may update these Terms from time to time. The current version is always
posted at https://<DOMAIN>/terms. Material changes will be announced by
email to active customers at least 14 days before they take effect.

## 15. Contact

Questions about these Terms can be sent to <CONTACT_EMAIL>.
