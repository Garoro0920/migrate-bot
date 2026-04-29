import { html, raw } from 'hono/html';

// 全ページ共通の HTML レイアウト (header / footer / Tailwind CDN)。
// Phase 4 MVP では Tailwind を CDN から読み込む。production では静的 build に
// 切り替えるべきだが、まず動くものを優先。

export interface LayoutOptions {
  readonly title: string;
  readonly description?: string;
  readonly brandName: string;
  readonly contactEmail: string;
  readonly content: string; // 既に HTML 化された本文 (raw で埋め込む)
  readonly canonicalPath?: string;
}

export function renderLayout(opts: LayoutOptions): string {
  const description =
    opts.description ??
    `${opts.brandName}: Next.js Pages Router → App Router migration as a single draft pull request.`;
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${opts.title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <link
      rel="icon"
      href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🤖%3C/text%3E%3C/svg%3E"
    />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      .prose-legal h2 { @apply text-2xl font-semibold mt-10 mb-3 text-slate-100; }
      .prose-legal h3 { @apply text-xl font-semibold mt-6 mb-2 text-slate-100; }
      .prose-legal p { @apply my-3 leading-relaxed text-slate-300; }
      .prose-legal ul { @apply list-disc list-inside my-3 space-y-1 text-slate-300; }
      .prose-legal ol { @apply list-decimal list-inside my-3 space-y-1 text-slate-300; }
      .prose-legal table { @apply my-4 border border-slate-700 text-sm; }
      .prose-legal th, .prose-legal td { @apply border border-slate-700 px-3 py-2; }
      .prose-legal th { @apply bg-slate-800 text-slate-100; }
      .prose-legal td { @apply text-slate-300; }
      .prose-legal a { @apply text-indigo-400 hover:text-indigo-300 underline; }
      .prose-legal code { @apply bg-slate-800 px-1.5 py-0.5 rounded text-sm text-slate-200; }
      .prose-legal blockquote { @apply border-l-4 border-amber-500 pl-4 my-4 text-amber-200 bg-amber-500/5 py-2; }
    </style>
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col">
    ${raw(renderHeader(opts.brandName))} ${raw(opts.content)}
    ${raw(renderFooter(opts.brandName, opts.contactEmail))}
  </body>
</html>`.toString();
}

function renderHeader(brandName: string): string {
  return `
    <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
      <nav class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" class="text-lg font-semibold tracking-tight">
          <span aria-hidden="true">🤖</span> ${brandName}
        </a>
        <div class="flex items-center gap-6 text-sm">
          <a href="/#pricing" class="text-slate-300 hover:text-white">Pricing</a>
          <a href="/#how-it-works" class="text-slate-300 hover:text-white">How it works</a>
          <a href="/#faq" class="text-slate-300 hover:text-white">FAQ</a>
          <a
            href="/install"
            class="rounded-md bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 font-medium"
          >Install on GitHub</a>
        </div>
      </nav>
    </header>
  `;
}

function renderFooter(brandName: string, contactEmail: string): string {
  const year = new Date().getUTCFullYear();
  return `
    <footer class="mt-auto border-t border-slate-800 bg-slate-950">
      <div class="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div class="font-semibold text-slate-100 mb-3">${brandName}</div>
          <p class="text-slate-400">Pages Router → App Router migration, delivered as a single draft pull request.</p>
        </div>
        <div>
          <div class="font-semibold text-slate-100 mb-3">Product</div>
          <ul class="space-y-2 text-slate-400">
            <li><a href="/#pricing" class="hover:text-white">Pricing</a></li>
            <li><a href="/#how-it-works" class="hover:text-white">How it works</a></li>
            <li><a href="/#faq" class="hover:text-white">FAQ</a></li>
          </ul>
        </div>
        <div>
          <div class="font-semibold text-slate-100 mb-3">Legal</div>
          <ul class="space-y-2 text-slate-400">
            <li><a href="/legal/terms" class="hover:text-white">Terms of Service</a></li>
            <li><a href="/legal/privacy" class="hover:text-white">Privacy Policy</a></li>
            <li><a href="/legal/refunds" class="hover:text-white">Refund Policy</a></li>
            <li><a href="/legal/specified-commercial-transactions" class="hover:text-white">特定商取引法に基づく表記</a></li>
          </ul>
        </div>
        <div>
          <div class="font-semibold text-slate-100 mb-3">Contact</div>
          <ul class="space-y-2 text-slate-400">
            <li><a href="mailto:${contactEmail}" class="hover:text-white">${contactEmail}</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-slate-800 max-w-6xl mx-auto px-6 py-4 text-xs text-slate-500">
        © ${year} ${brandName}. All rights reserved.
      </div>
    </footer>
  `;
}
