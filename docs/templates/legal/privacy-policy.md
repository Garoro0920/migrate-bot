# Privacy Policy

> **Status: DRAFT — self-reviewed against APPI Article 28 / Rule 17 and
> CCPA. Lawyer review deferred (see `docs/legal-self-review-log.md` for
> the review record and rationale).**
>
> Placeholders to fill before publishing:
> - `<OPERATOR_LEGAL_NAME>`
> - `<CONTACT_EMAIL>` — privacy contact email
> - `<EFFECTIVE_DATE>`
> - `migrate-bot.dev`
> - `<OPERATOR_ADDRESS>` — required for APPI / 特商法 (mailbox service is fine)
>
> Self-review notes:
> - Section 3 Subprocessors table now includes country, protection-regime
>   description, and subprocessor's protective measures, per APPI Rule 17.
> - Section 5 explicitly states that EEA / UK / Switzerland residents are
>   not offered the Service (matches Terms of Service Section 2).
> - Section 7 enumerates APPI Articles 32–35 disclosure / correction /
>   suspension rights and identifies the PPC as supervisory authority.

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

We use the following third-party processors to operate the Service.

**Legal characterization under APPI**: We engage each of the
subprocessors below **as 委託 (entrustment of handling) under Japan's
Act on the Protection of Personal Information (個人情報保護法) Article
27, Paragraph 5, Item 1**. We do not provide your personal information
to these subprocessors as third-party provision (第三者提供) requiring
separate consent under APPI Article 27. Each subprocessor processes
data on our instructions and for our purposes only, and we exercise the
supervision required by APPI Article 25 (consignor's supervision
obligation, 委託先監督義務) — including selecting subprocessors who
publish DPAs and security certifications, and reviewing those terms
before engagement.

**Cross-border disclosure under APPI Article 28 / Rule 17**: Because
these subprocessors are located outside Japan, the entrustment is also a
cross-border transfer governed by APPI Article 28. The table below
discloses, for each subprocessor: (i) the subprocessor's location, (ii)
the personal-information protection regime of that location, and (iii)
the protective measures the subprocessor has committed to, in accordance
with APPI Rule 17, Paragraph 2.

By using the Service you provide consent to (a) our entrustment of your
personal information to the subprocessors below for the purposes
described, and (b) the cross-border transfer of that information to the
locations identified.

| Subprocessor | Location | Purpose / data shared | Protection regime in that country | Subprocessor's protective measures |
|---|---|---|---|---|
| **Anthropic, PBC** | United States (operations); Republic of Ireland (DPA governing law for the EU SCC module) | LLM-based code transformation. Source file contents are sent during a job and are not retained on the API after the request completes. | The United States does not have a comprehensive federal personal-information protection statute equivalent to Japan's APPI; protection is provided through sectoral and state laws (e.g., the California Consumer Privacy Act). U.S. government agencies retain certain investigative powers over data held in the U.S. | Anthropic's Data Processing Addendum incorporates the EU Standard Contractual Clauses (Module 2 / Module 3) by reference. Anthropic's API terms contractually prohibit using API inputs to train models. Anthropic deletes API request payloads after processing except as required to operate the service or by law. |
| **GitHub, Inc.** | United States | Repository hosting, App authentication, draft PR creation. Receives the GitHub installation context, branch and PR metadata, and the migration commits (which are derived from your repository content). | Same as above — sectoral / state regime in the U.S. | GitHub publishes a Data Protection Addendum incorporating EU SCCs and is ISO 27001 / SOC 2 certified. |
| **Stripe, Inc.** | United States | Payment processing. Stripe receives customer email, billing details, and card data. We never see or store card numbers, CVC, or expiration. | Same as above. | Stripe is PCI DSS Level 1 certified and incorporates EU SCCs in its DPA. |
| **Cloudflare, Inc.** | United States (HQ); global edge / Workers may execute in any region | Web hosting, queue, primary database (D1). Receives all non-payment service data and operational logs. | Same as above. | Cloudflare publishes a DPA incorporating EU SCCs and is ISO 27001 / SOC 2 / PCI DSS certified. D1 data is stored in a region we select (currently APAC for prod). |
| **Fly.io** | United States | Job execution VM. The temporary VM clones your repository, runs the agent, and is destroyed at job end (typically minutes). | Same as above. | Fly.io publishes a DPA. VMs are isolated per job; secrets injected at boot and not persisted to image. |
| **Resend, Inc.** | United States | Transactional email delivery. Receives the recipient email address and the message content (order confirmation, PR-ready notification, refund notification). | Same as above. | Resend publishes a DPA and incorporates EU SCCs. |

If you do not consent to the entrustment and cross-border transfer
described in this Section 3, please do not use the Service. To withdraw
consent and request deletion after the fact, see Section 7.

## 4. Data retention

| Data type | Retention |
|---|---|
| Repository contents | Deleted at job end (typically minutes) |
| Migration logs (paths, line numbers, timing, costs) | 1 year |
| Email address and order history | Retained for the life of the customer relationship + 7 years (tax / accounting requirements) |
| Operational logs (IP, user-agent) | 30 days |
| Stripe records | Retained by Stripe per their policy |

## 5. International data transfers

The Service is operated from Japan, but processing occurs in the United
States and at globally distributed edge locations operated by our
subprocessors (see Section 3 for the country-by-country breakdown).

For Japan-resident users, by using the Service you provide consent under
APPI Article 28 to the cross-border transfer of your personal information
to the subprocessors and locations identified in Section 3. The
country-of-location, the protection regime of that country, and the
specific protective measures of each subprocessor are disclosed in
Section 3 in accordance with APPI Rule 17.

**The Service is not currently offered to residents of the European
Economic Area, the United Kingdom, or Switzerland** (see Terms of Service
Section 2). Accordingly, we do not undertake processing operations that
would bring this Service within the territorial scope of the GDPR or the
UK / Swiss equivalents. If you believe you have used the Service from one
of those jurisdictions in error, please contact <CONTACT_EMAIL> and we
will delete your data and refund any payment.

If you are a resident of a jurisdiction whose law restricts cross-border
transfer of personal data and you require data residency in a specific
region, please contact <CONTACT_EMAIL> before paying. We may not be able
to support every residency requirement.

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

**For California residents (CCPA / CPRA)**: we do not sell or share your
personal information for cross-context behavioral advertising. You have
the right to know, delete, correct, and limit use of sensitive personal
information.

**For EU / UK / Switzerland residents**: as stated above and in the
Terms of Service Section 2, the Service is not offered to residents of
these jurisdictions at this time.

**For Japan residents (個人情報保護法 / APPI)**: the personal-information
handling business operator (個人情報取扱事業者) is <OPERATOR_LEGAL_NAME>,
<OPERATOR_ADDRESS>. You may request, with respect to your personal
information that we hold (保有個人データ), (i) disclosure of the
purpose-of-use, (ii) disclosure of the data itself, (iii) correction
of inaccurate data, (iv) suspension of use or erasure where the
data was acquired or used in violation of law, and (v) suspension
of provision to third parties under APPI Articles 32–35. To make
such a request, please email <CONTACT_EMAIL>. We will respond
without delay (and in any case within 30 days) after verifying your
identity. We may charge a reasonable fee for disclosure as permitted
by APPI Rule.

The complaint-handling contact for personal-information matters is
<CONTACT_EMAIL>. The competent supervisory authority is the
Personal Information Protection Commission (個人情報保護委員会,
<https://www.ppc.go.jp/>).

## 8. Children's privacy

The Service is not directed to children under the age of 16. We do not
knowingly collect personal information from children. If you believe we
have inadvertently collected such information, please contact us for
deletion.

## 9. Changes to this policy

We may update this policy from time to time. Material changes will be
announced by email to active customers at least 14 days before they take
effect. The current version is always posted at
https://migrate-bot.dev/legal/privacy.

## 10. Contact

Privacy inquiries: <CONTACT_EMAIL>
Mail: <OPERATOR_LEGAL_NAME>, <OPERATOR_ADDRESS>
