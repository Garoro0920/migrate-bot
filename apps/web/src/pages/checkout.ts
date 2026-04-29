import { renderLayout } from '../components/layout';

// Stripe Checkout の success / cancel リダイレクト先。
// apps/api の wrangler.toml の [vars] にある CHECKOUT_SUCCESS_URL /
// CHECKOUT_CANCEL_URL がここを指す (dev は workers.dev 経由、prod は custom
// domain)。

export interface CheckoutPageOptions {
  readonly contactEmail: string;
  readonly brandName: string;
  readonly installUrl: string;
}

export function renderCheckoutSuccess(opts: CheckoutPageOptions): string {
  const content = `
    <main class="max-w-2xl mx-auto px-6 py-24 text-center">
      <div class="text-5xl mb-6" aria-hidden="true">✓</div>
      <p class="text-emerald-400 text-sm font-semibold tracking-wide uppercase">Payment received</p>
      <h1 class="mt-3 text-4xl md:text-5xl font-bold">Thanks — we are on it.</h1>
      <p class="mt-6 text-slate-300 text-lg">
        Your migration job has started. We will email you the moment the draft pull
        request is ready (typically within 5–15 minutes).
      </p>
      <div class="mt-10 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left">
        <h2 class="text-lg font-semibold mb-3">What happens next</h2>
        <ol class="list-decimal list-inside space-y-2 text-sm text-slate-300">
          <li>Our agent clones your repository to an isolated VM.</li>
          <li>It analyzes the Pages Router structure and plans the migration.</li>
          <li>It rewrites each file and runs <code class="bg-slate-800 px-1 rounded">tsc --noEmit</code> + <code class="bg-slate-800 px-1 rounded">next build</code>.</li>
          <li>If both pass, a draft PR is opened on your repository.</li>
          <li>You receive a "PR ready" email with the link.</li>
        </ol>
      </div>
      <p class="mt-8 text-sm text-slate-400">
        Did not receive the confirmation email within a few minutes? Check spam,
        then reach out to
        <a href="mailto:${opts.contactEmail}" class="text-indigo-400 hover:text-indigo-300 underline">${opts.contactEmail}</a>.
      </p>
      <div class="mt-10">
        <a
          href="/"
          class="rounded-md border border-slate-700 hover:border-slate-500 text-slate-100 px-5 py-2.5 font-medium"
        >Back to home</a>
      </div>
    </main>
  `;
  return renderLayout({
    title: `Payment received — ${opts.brandName}`,
    description: 'Your migration job has started. We will email you when the PR is ready.',
    brandName: opts.brandName,
    contactEmail: opts.contactEmail,
    content,
  });
}

export function renderCheckoutCancel(opts: CheckoutPageOptions): string {
  const content = `
    <main class="max-w-2xl mx-auto px-6 py-24 text-center">
      <p class="text-amber-400 text-sm font-semibold tracking-wide uppercase">Checkout cancelled</p>
      <h1 class="mt-3 text-4xl md:text-5xl font-bold">No charge made.</h1>
      <p class="mt-6 text-slate-300 text-lg">
        You backed out of the Stripe Checkout. Nothing was charged. You can come
        back any time — the GitHub App is still installed.
      </p>
      <div class="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="${opts.installUrl}"
          class="rounded-md bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 font-semibold"
        >Restart from GitHub App</a>
        <a
          href="/"
          class="rounded-md border border-slate-700 hover:border-slate-500 text-slate-100 px-5 py-2.5 font-medium"
        >Home</a>
      </div>
      <p class="mt-10 text-sm text-slate-400">
        Questions about pricing or what's included? Email
        <a href="mailto:${opts.contactEmail}" class="text-indigo-400 hover:text-indigo-300 underline">${opts.contactEmail}</a>.
      </p>
    </main>
  `;
  return renderLayout({
    title: `Checkout cancelled — ${opts.brandName}`,
    description: 'You cancelled the Stripe Checkout flow. No charge was made.',
    brandName: opts.brandName,
    contactEmail: opts.contactEmail,
    content,
  });
}
