# Privacy Policy

> **Status: DRAFT — not yet legally reviewed.**
> Operator must have this policy reviewed by a lawyer before publishing,
> particularly for GDPR/CCPA/Japan APPI compliance.
>
> Placeholders to fill before publishing:
> - `<OPERATOR_LEGAL_NAME>`
> - `<CONTACT_EMAIL>` — privacy contact email
> - `<EFFECTIVE_DATE>`
> - `<DOMAIN>`
> - `<OPERATOR_ADDRESS>` — required for APPI / 特商法 (mailbox service is fine)

**Effective date: <EFFECTIVE_DATE>**

This Privacy Policy describes how <OPERATOR_LEGAL_NAME> ("we", "us")
collects, uses, and protects information when you use migrate-bot
("Service").

## 1. Information we collect

### 1.1 Information you provide

- **Email address** — collected at checkout to send order confirmation,
  PR-ready notification, and support correspondence.
- **Payment method** — handled directly by Stripe; we never see or store
  your full card number, CVC, or expiration date.
- **GitHub installation context** — your GitHub user/organization handle
  and the installation ID for the repository you select.

### 1.2 Information collected automatically

- **Repository metadata** — file paths, file types, and line counts of the
  selected repository (used to determine plan size and migration scope).
- **Migration logs** — timestamps, state transitions, error messages, token
  counts, and cost. Logs do not include source code snippets; only file
  paths, line numbers, and short error excerpts.
- **Operational logs** — request timestamps, IP addresses, and user agents
  for security monitoring (kept for 30 days then purged).

### 1.3 Repository contents (transient)

While a migration job is running, the source code of the selected repository
is cloned onto a temporary virtual machine on our compute infrastructure
(see "Subprocessors") and the contents of source files are sent to the AI
provider for transformation. **Repository contents are not retained after
the job completes.** The temporary virtual machine is destroyed at job end,
typically within minutes.

We never use your repository contents to train, fine-tune, or improve any
machine-learning model.

## 2. How we use information

We use the information described above to:

- Provide the migration service and produce the draft pull request
- Process your payment and issue refunds when applicable
- Send order-related and account-related email notifications
- Monitor service health and prevent abuse
- Comply with legal obligations

We do not sell your personal information. We do not use it for behavioral
advertising.

## 3. Subprocessors

We use the following third-party processors, each governed by their own
privacy policy:

| Subprocessor | Purpose | Data shared |
|---|---|---|
| Anthropic, PBC | LLM-based code transformation | Source file contents (during job) |
| GitHub, Inc. | Repository hosting, App auth, PR creation | GitHub installation context, branch and PR metadata |
| Stripe, Inc. | Payment processing | Customer email, billing details |
| Cloudflare, Inc. | Web hosting, queue, database | All non-payment service data |
| Fly.io | Job execution VM | Source code (during job only) |
| Resend, Inc. | Transactional email delivery | Customer email and message content |

Anthropic's API terms (as of this policy's effective date) state that data
sent to the Claude API is not used for model training. We rely on this
contractual commitment.

## 4. Data retention

| Data type | Retention |
|---|---|
| Repository contents | Deleted at job end (typically minutes) |
| Migration logs (paths, line numbers, timing, costs) | 1 year |
| Email address and order history | Retained for the life of the customer relationship + 7 years (tax / accounting requirements) |
| Operational logs (IP, user-agent) | 30 days |
| Stripe records | Retained by Stripe per their policy |

## 5. International data transfers

Our infrastructure runs primarily on Cloudflare and Fly.io, which operate
globally. Data may be processed in regions outside your country of
residence, including the United States. We rely on the Standard Contractual
Clauses or equivalent transfer mechanisms offered by our subprocessors.

If you require data residency in a specific region (e.g., EU only), please
contact <CONTACT_EMAIL> before paying. Some plans may not be available
under residency restrictions.

## 6. Security

- Customer repository contents are processed only on isolated, ephemeral
  virtual machines.
- Secrets (API keys, GitHub App private key, Stripe key) are stored in
  Cloudflare Secrets and Fly.io Secrets and rotated at least every six
  months or upon suspected compromise.
- All in-transit traffic uses HTTPS.
- Webhooks are signature-verified.

## 7. Your rights

Depending on your jurisdiction, you may have the right to:

- **Access** — request a copy of personal data we hold about you
- **Correction** — request correction of inaccurate data
- **Deletion** — request deletion of your data (subject to legal-retention
  obligations such as tax records)
- **Portability** — request a machine-readable copy of your data
- **Object / restrict** — object to certain processing activities
- **Withdraw consent** — where processing is based on consent

To exercise any of these rights, contact <CONTACT_EMAIL>. We will respond
within 30 days (or sooner where required by applicable law).

For California residents (CCPA): we do not sell personal information. You
have rights to know, delete, and opt out (no sale to opt out from).

For EU/UK residents (GDPR): we process data under the legal bases of
**contract performance** (to provide the Service you paid for) and
**legitimate interest** (security and abuse prevention).

For Japan residents (個人情報保護法 / APPI): for inquiries please contact
<CONTACT_EMAIL>. Our 個人情報取扱事業者 representative is
<OPERATOR_LEGAL_NAME>, <OPERATOR_ADDRESS>.

## 8. Children's privacy

The Service is not directed to children under the age of 16. We do not
knowingly collect personal information from children. If you believe we
have inadvertently collected such information, please contact us for
deletion.

## 9. Changes to this policy

We may update this policy from time to time. Material changes will be
announced by email to active customers at least 14 days before they take
effect. The current version is always posted at
https://<DOMAIN>/privacy.

## 10. Contact

Privacy inquiries: <CONTACT_EMAIL>
Mail: <OPERATOR_LEGAL_NAME>, <OPERATOR_ADDRESS>
