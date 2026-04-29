import { renderLayout } from '../components/layout';

// migrate-bot Landing page。Hero / 価格表 / 仕組み / FAQ / 信頼セクション。
// Tailwind CDN 前提。Phase 4 MVP として最小機能で動かす。

export interface LandingOptions {
  readonly installUrl: string;
  readonly contactEmail: string;
  readonly brandName: string;
  readonly publicApiUrl: string;
}

export function renderLanding(opts: LandingOptions): string {
  const content = [
    renderHero(opts),
    renderTrustBar(),
    renderHowItWorks(),
    renderEstimator(opts),
    renderPricing(opts),
    renderFaq(opts),
    renderCta(opts),
  ].join('\n');

  return renderLayout({
    title: `${opts.brandName} — Pages Router → App Router migration as a draft PR`,
    description: `Install the GitHub App, pay once, and review the draft PR. Full refund if our verify (typecheck + next build) does not pass within 14 days.`,
    brandName: opts.brandName,
    contactEmail: opts.contactEmail,
    content,
  });
}

function renderHero(opts: LandingOptions): string {
  return `
    <section class="px-6 pt-20 pb-16 max-w-6xl mx-auto text-center">
      <p class="text-indigo-400 text-sm font-medium tracking-wide uppercase">For Next.js teams</p>
      <h1 class="mt-4 text-5xl md:text-6xl font-bold tracking-tight">
        Pages Router → App Router,<br />
        <span class="text-indigo-400">in a single draft PR.</span>
      </h1>
      <p class="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
        Install the GitHub App, pay per repository, and review the draft pull request.
        Type checks and <code class="bg-slate-800 px-1.5 py-0.5 rounded">next build</code> are run for you before the PR is opened.
      </p>
      <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="${opts.installUrl}"
          class="rounded-md bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 font-semibold"
        >
          Install on GitHub →
        </a>
        <a
          href="#pricing"
          class="rounded-md border border-slate-700 hover:border-slate-500 text-slate-100 px-6 py-3 font-medium"
        >
          See pricing
        </a>
      </div>
      <p class="mt-6 text-sm text-slate-500">Full refund if CI does not pass within 14 days.</p>
    </section>
  `;
}

function renderTrustBar(): string {
  return `
    <section class="px-6 py-8 border-y border-slate-800 bg-slate-900/40">
      <div class="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-slate-400 text-center">
        <div>
          <div class="font-semibold text-slate-100 text-base">14-day refund</div>
          <p class="mt-1">Full refund if verify does not pass.</p>
        </div>
        <div>
          <div class="font-semibold text-slate-100 text-base">No code retention</div>
          <p class="mt-1">Your repo is deleted with the VM after the job.</p>
        </div>
        <div>
          <div class="font-semibold text-slate-100 text-base">No training-data use</div>
          <p class="mt-1">Anthropic API contractually does not train on inputs.</p>
        </div>
        <div>
          <div class="font-semibold text-slate-100 text-base">Draft, not auto-merge</div>
          <p class="mt-1">You stay in control. Review and merge yourself.</p>
        </div>
      </div>
    </section>
  `;
}

function renderHowItWorks(): string {
  return `
    <section id="how-it-works" class="px-6 py-20 max-w-6xl mx-auto">
      <h2 class="text-3xl md:text-4xl font-bold text-center">How it works</h2>
      <p class="mt-3 text-center text-slate-400 max-w-2xl mx-auto">
        Three steps from install to draft PR. Most jobs finish in 5–15 minutes.
      </p>
      <div class="mt-12 grid md:grid-cols-3 gap-6">
        <div class="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div class="w-10 h-10 flex items-center justify-center rounded-md bg-indigo-500/15 text-indigo-300 font-semibold">1</div>
          <h3 class="mt-4 text-lg font-semibold">Install the GitHub App</h3>
          <p class="mt-2 text-sm text-slate-400">
            Grant access to the single repository you want to migrate. Permissions are read/write on contents and pull requests only.
          </p>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div class="w-10 h-10 flex items-center justify-center rounded-md bg-indigo-500/15 text-indigo-300 font-semibold">2</div>
          <h3 class="mt-4 text-lg font-semibold">Pay for the right plan</h3>
          <p class="mt-2 text-sm text-slate-400">
            Plan is determined by file count under <code class="bg-slate-800 px-1 rounded">pages/</code> and <code class="bg-slate-800 px-1 rounded">components/</code>. One-time charge via Stripe, no subscription.
          </p>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div class="w-10 h-10 flex items-center justify-center rounded-md bg-indigo-500/15 text-indigo-300 font-semibold">3</div>
          <h3 class="mt-4 text-lg font-semibold">Review the draft PR</h3>
          <p class="mt-2 text-sm text-slate-400">
            We open a draft PR after typecheck and <code class="bg-slate-800 px-1 rounded">next build</code> pass. You review, run your own tests, and merge.
          </p>
        </div>
      </div>
    </section>
  `;
}

function renderEstimator(opts: LandingOptions): string {
  return `
    <section id="estimator" class="px-6 py-20 max-w-3xl mx-auto">
      <h2 class="text-3xl md:text-4xl font-bold text-center">Estimate your repo</h2>
      <p class="mt-3 text-center text-slate-400">
        Public GitHub repos only. We count files under <code class="bg-slate-800 px-1 rounded">pages/</code> and <code class="bg-slate-800 px-1 rounded">components/</code> to predict your plan.
      </p>
      <form id="estimator-form" class="mt-8 flex flex-col sm:flex-row gap-3">
        <input
          id="estimator-input"
          type="text"
          required
          placeholder="vercel/next.js or owner/repo"
          pattern="[A-Za-z0-9._-]+/[A-Za-z0-9._-]+"
          class="flex-1 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
        />
        <button
          type="submit"
          class="rounded-md bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 font-semibold whitespace-nowrap"
        >Estimate</button>
      </form>
      <div id="estimator-result" class="mt-6 min-h-[60px]"></div>
      <script>
        (() => {
          const form = document.getElementById('estimator-form');
          const input = document.getElementById('estimator-input');
          const out = document.getElementById('estimator-result');
          const apiBase = ${JSON.stringify(opts.publicApiUrl)};
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const repo = input.value.trim();
            if (!repo) return;
            out.innerHTML = '<p class="text-slate-400 text-sm">Estimating…</p>';
            try {
              const res = await fetch(apiBase + '/pricing/estimate?repo=' + encodeURIComponent(repo));
              const body = await res.json();
              if (!res.ok) {
                out.innerHTML = '<p class="text-amber-400 text-sm">' + (body.error || 'Error') + '</p>';
                return;
              }
              const planBadge = {
                small: 'bg-emerald-500/15 text-emerald-300',
                medium: 'bg-indigo-500/15 text-indigo-300',
                large: 'bg-violet-500/15 text-violet-300',
                enterprise: 'bg-amber-500/15 text-amber-300',
              }[body.plan] || 'bg-slate-700 text-slate-200';
              const priceText = body.plan === 'enterprise'
                ? '<span class="text-sm text-slate-400">Custom quote</span>'
                : '<span class="text-2xl font-bold">$' + body.priceUsd + '</span>';
              const truncatedNote = body.truncated
                ? '<p class="mt-2 text-xs text-amber-400">Note: GitHub truncated the file tree; count is a lower bound.</p>'
                : '';
              out.innerHTML =
                '<div class="rounded-xl border border-slate-800 bg-slate-900/50 p-6">' +
                  '<div class="flex flex-wrap items-center gap-3">' +
                    '<span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ' + planBadge + '">' + body.plan + '</span>' +
                    '<span class="text-slate-300">' + body.fileCount + ' files in pages/ + components/</span>' +
                  '</div>' +
                  '<div class="mt-4">' + priceText + '</div>' +
                  truncatedNote +
                '</div>';
            } catch (err) {
              out.innerHTML = '<p class="text-amber-400 text-sm">Network error: ' + err.message + '</p>';
            }
          });
        })();
      </script>
    </section>
  `;
}

function renderPricing(opts: LandingOptions): string {
  const plans = [
    {
      name: 'Small',
      price: '$99',
      blurb: 'Up to 100 files in pages/ and components/',
      features: [
        'Single repository',
        'Typecheck + next build verified',
        '14-day full refund guarantee',
        'Email support',
      ],
      cta: { label: 'Install on GitHub', href: opts.installUrl },
      featured: false,
    },
    {
      name: 'Medium',
      price: '$249',
      blurb: 'Up to 500 files',
      features: [
        'Everything in Small',
        'Larger repos with cross-file dependencies',
        'Priority email support',
      ],
      cta: { label: 'Install on GitHub', href: opts.installUrl },
      featured: true,
    },
    {
      name: 'Large',
      price: '$499',
      blurb: 'Up to 2,000 files',
      features: [
        'Everything in Medium',
        'Complex codebases with custom routing',
        '2-business-day SLA on questions',
      ],
      cta: { label: 'Install on GitHub', href: opts.installUrl },
      featured: false,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      blurb: '2,000+ files or monorepo',
      features: [
        'Custom quote',
        'Monorepo support',
        'Direct Slack channel',
        'Optional pre-migration review call',
      ],
      cta: { label: 'Email us', href: `mailto:${opts.contactEmail}` },
      featured: false,
    },
  ];
  const cardsHtml = plans
    .map((plan) => {
      const cardClass = plan.featured
        ? 'border-indigo-400/60 bg-gradient-to-b from-indigo-950/40 to-slate-900/50 ring-1 ring-indigo-400/40'
        : 'border-slate-800 bg-slate-900/50';
      const ctaClass = plan.featured
        ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
        : 'border border-slate-700 hover:border-slate-500 text-slate-100';
      const featuresHtml = plan.features
        .map(
          (f) => `
            <li class="flex items-start gap-2">
              <span aria-hidden="true" class="text-indigo-400">✓</span>
              <span>${f}</span>
            </li>`,
        )
        .join('');
      const badge = plan.featured
        ? `<div class="absolute -top-3 left-6 text-xs font-semibold tracking-wide bg-indigo-500 text-white px-2 py-0.5 rounded">Most popular</div>`
        : '';
      return `
        <div class="relative rounded-xl border ${cardClass} p-6 flex flex-col">
          ${badge}
          <h3 class="text-lg font-semibold">${plan.name}</h3>
          <p class="mt-1 text-sm text-slate-400">${plan.blurb}</p>
          <div class="mt-4 text-4xl font-bold">${plan.price}</div>
          <ul class="mt-6 space-y-2 text-sm text-slate-300">${featuresHtml}</ul>
          <a
            href="${plan.cta.href}"
            class="mt-6 rounded-md ${ctaClass} px-4 py-2 text-sm font-medium text-center"
          >${plan.cta.label}</a>
        </div>
      `;
    })
    .join('');
  return `
    <section id="pricing" class="px-6 py-20 max-w-6xl mx-auto">
      <h2 class="text-3xl md:text-4xl font-bold text-center">One-time pricing</h2>
      <p class="mt-3 text-center text-slate-400 max-w-2xl mx-auto">
        Pay per repository. Plan is set by the file count of <code class="bg-slate-800 px-1 rounded">pages/</code> and <code class="bg-slate-800 px-1 rounded">components/</code> directories.
      </p>
      <div class="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">${cardsHtml}</div>
      <p class="mt-8 text-center text-sm text-slate-500">
        All prices in USD. <a href="/legal/refunds" class="underline hover:text-slate-300">Full refund</a> if our verify (typecheck + <code class="bg-slate-800 px-1 rounded">next build</code>) does not pass within 14 days for reasons attributable to the service.
      </p>
    </section>
  `;
}

function renderFaq(opts: LandingOptions): string {
  const items = [
    {
      q: 'What does the migration actually change?',
      a: `The agent moves files under <code class="bg-slate-800 px-1 rounded">pages/</code> to the equivalent App Router locations under <code class="bg-slate-800 px-1 rounded">app/</code>: <code class="bg-slate-800 px-1 rounded">getStaticProps</code> / <code class="bg-slate-800 px-1 rounded">getServerSideProps</code> become async Server Components, <code class="bg-slate-800 px-1 rounded">getStaticPaths</code> becomes <code class="bg-slate-800 px-1 rounded">generateStaticParams</code>, <code class="bg-slate-800 px-1 rounded">next/router</code> usages move to <code class="bg-slate-800 px-1 rounded">next/navigation</code>, and <code class="bg-slate-800 px-1 rounded">next/head</code> is replaced with the Metadata API. The PR description lists each file's transformation.`,
    },
    {
      q: 'What if the verify step fails?',
      a: `If our automated typecheck or <code class="bg-slate-800 px-1 rounded">next build</code> cannot pass within 14 days for reasons attributable to the service, you receive a full refund automatically. See our <a href="/legal/refunds">refund policy</a> for the exclusions (most importantly, failures caused by your own custom tests added after the run).`,
    },
    {
      q: 'Is my code used to train any AI models?',
      a: `No. Repository contents are processed only on a temporary virtual machine that is destroyed at job end. Anthropic's API terms (our LLM provider) state that data sent to the Claude API is not used for model training.`,
    },
    {
      q: 'Do you support monorepos?',
      a: `Not yet — monorepos fall under our Enterprise tier and require a custom quote. Email <a href="mailto:${opts.contactEmail}">${opts.contactEmail}</a> with details and we will respond within two business days.`,
    },
    {
      q: 'What permissions does the GitHub App ask for?',
      a: `The minimum needed: <strong>contents: write</strong> (to create the branch and push commits), <strong>pull_requests: write</strong> (to open the draft PR), and <strong>metadata: read</strong>. The App does not request access to actions, secrets, or organization administration.`,
    },
    {
      q: 'How long does a migration take?',
      a: `Typical Small jobs finish in 5–10 minutes. Medium runs about 10–20 minutes. Large can take 30–60 minutes. The job runs entirely on our infrastructure; you can close the page after payment and we will email you when the PR is ready.`,
    },
    {
      q: 'Can I migrate just part of a repository?',
      a: `Phase 4 launch covers single-repository migrations of the entire <code class="bg-slate-800 px-1 rounded">pages/</code> directory. Partial migrations are on the roadmap; reach out if you have specific needs.`,
    },
    {
      q: 'Will the resulting PR break my CI?',
      a: `The PR is opened in <em>draft</em> precisely so your CI can run before you decide to merge. Our verify step runs typecheck and a production build internally, but it does not run your custom test suite — that is part of why the PR is a draft and not auto-merged.`,
    },
  ];
  const html = items
    .map(
      (item) => `
      <details class="rounded-lg border border-slate-800 bg-slate-900/50 p-5 group">
        <summary class="cursor-pointer text-base font-semibold flex items-center justify-between gap-4">
          <span>${item.q}</span>
          <span aria-hidden="true" class="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div class="mt-3 text-sm text-slate-300 leading-relaxed">${item.a}</div>
      </details>
    `,
    )
    .join('');
  return `
    <section id="faq" class="px-6 py-20 max-w-3xl mx-auto">
      <h2 class="text-3xl md:text-4xl font-bold text-center">FAQ</h2>
      <div class="mt-10 space-y-3">${html}</div>
    </section>
  `;
}

function renderCta(opts: LandingOptions): string {
  return `
    <section class="px-6 py-20 max-w-3xl mx-auto text-center">
      <h2 class="text-3xl md:text-4xl font-bold">Ready to migrate?</h2>
      <p class="mt-4 text-slate-400">
        Install the GitHub App and we will guide you to checkout from there.
      </p>
      <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="${opts.installUrl}"
          class="rounded-md bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 font-semibold"
        >
          Install on GitHub →
        </a>
        <a
          href="mailto:${opts.contactEmail}"
          class="rounded-md border border-slate-700 hover:border-slate-500 text-slate-100 px-6 py-3 font-medium"
        >
          Email us first
        </a>
      </div>
    </section>
  `;
}
