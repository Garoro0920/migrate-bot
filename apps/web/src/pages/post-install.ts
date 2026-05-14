import { renderLayout } from '../components/layout';

// GitHub App の Setup URL からの redirect 先 (apps/api の checkout/create-session
// を呼び出す前段)。GET でフォーム表示、POST でサーバサイドに proxy して Stripe
// Checkout URL を返す。

export interface PostInstallOptions {
  readonly installationId: string;
  readonly contactEmail: string;
  readonly brandName: string;
  readonly errorMessage?: string;
  readonly defaultEmail?: string;
  readonly defaultRepo?: string;
  readonly defaultPlan?: string;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPostInstall(opts: PostInstallOptions): string {
  const installId = escapeHtmlAttr(opts.installationId);
  const defaultEmail = escapeHtmlAttr(opts.defaultEmail ?? '');
  const defaultRepo = escapeHtmlAttr(opts.defaultRepo ?? '');
  const planSmallChecked = opts.defaultPlan === 'small' ? 'checked' : '';
  const planMediumChecked = opts.defaultPlan === 'medium' ? 'checked' : '';
  const planLargeChecked = opts.defaultPlan === 'large' ? 'checked' : '';
  const hasInstallation = opts.installationId.length > 0;
  const errorHtml = opts.errorMessage
    ? `<div class="rounded-md border border-amber-500/40 bg-amber-950/30 text-amber-200 px-4 py-3 text-sm">${escapeHtmlAttr(
        opts.errorMessage,
      )}</div>`
    : '';
  const installationBanner = hasInstallation
    ? `
      <div class="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-300 text-sm flex items-start gap-3">
        <span aria-hidden="true">✓</span>
        <div>
          <p class="font-semibold">GitHub App installed</p>
          <p class="text-emerald-300/80 mt-1">Installation ID: <code class="text-xs">${installId}</code></p>
        </div>
      </div>
    `
    : `
      <div class="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-amber-300 text-sm">
        <p class="font-semibold">Installation ID missing</p>
        <p class="mt-1">
          Open this page from the link in the GitHub App install confirmation, or
          <a href="/install" class="underline">re-install the App</a>.
        </p>
      </div>
    `;

  const content = `
    <section class="px-6 py-16 max-w-2xl mx-auto">
      ${installationBanner}
      <h1 class="mt-8 text-3xl font-bold">Start your migration</h1>
      <p class="mt-3 text-slate-400">
        Confirm the repository, choose a plan, and we will take you to secure
        checkout via Stripe.
      </p>
      ${errorHtml}
      <form method="POST" action="/post-install" class="mt-8 space-y-6">
        <input type="hidden" name="installationId" value="${installId}" />
        <div>
          <label for="email" class="block text-sm font-medium text-slate-200">Your email</label>
          <p class="mt-1 text-xs text-slate-500">
            Order confirmation, PR-ready notification, and refund (if any) go here.
          </p>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxlength="254"
            value="${defaultEmail}"
            class="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label for="repo" class="block text-sm font-medium text-slate-200">Repository</label>
          <p class="mt-1 text-xs text-slate-500">
            Format: <code>owner/name</code>. Must match the repo you selected during install.
          </p>
          <input
            id="repo"
            name="repo"
            type="text"
            required
            pattern="[A-Za-z0-9._-]+/[A-Za-z0-9._-]+"
            maxlength="255"
            value="${defaultRepo}"
            class="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100"
            placeholder="acme/my-next-app"
          />
        </div>
        <div>
          <span class="block text-sm font-medium text-slate-200">Plan</span>
          <div class="mt-2 grid sm:grid-cols-3 gap-3">
            <label class="rounded-md border border-slate-700 px-4 py-3 cursor-pointer hover:border-indigo-500 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-950/30">
              <input type="radio" name="plan" value="small" required class="sr-only" ${planSmallChecked} />
              <div class="font-medium">Small $99</div>
              <p class="text-xs text-slate-400">≤100 files</p>
            </label>
            <label class="rounded-md border border-slate-700 px-4 py-3 cursor-pointer hover:border-indigo-500 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-950/30">
              <input type="radio" name="plan" value="medium" class="sr-only" ${planMediumChecked} />
              <div class="font-medium">Medium $249</div>
              <p class="text-xs text-slate-400">≤500 files</p>
            </label>
            <label class="rounded-md border border-slate-700 px-4 py-3 cursor-pointer hover:border-indigo-500 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-950/30">
              <input type="radio" name="plan" value="large" class="sr-only" ${planLargeChecked} />
              <div class="font-medium">Large $499</div>
              <p class="text-xs text-slate-400">≤2,000 files</p>
            </label>
          </div>
        </div>
        <button
          type="submit"
          ${hasInstallation ? '' : 'disabled'}
          class="w-full rounded-md bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 font-semibold"
        >
          Continue to checkout →
        </button>
      </form>
      <p class="mt-6 text-xs text-slate-500">
        By proceeding you agree to our
        <a href="/legal/terms" class="underline">Terms</a>,
        <a href="/legal/privacy" class="underline">Privacy Policy</a>, and
        <a href="/legal/refunds" class="underline">Refund Policy</a>.
      </p>
    </section>
  `;
  return renderLayout({
    title: `${opts.brandName} — Start your migration`,
    description:
      'Complete your migrate-bot order: choose plan, pay via Stripe, review the draft PR.',
    brandName: opts.brandName,
    contactEmail: opts.contactEmail,
    content,
  });
}
