import { marked } from 'marked';
import { renderLayout } from '../components/layout';
import { LEGAL_CONTENT, type LegalContentSlug } from './legal-content.gen';

export type LegalSlug = LegalContentSlug | 'not-found';

export interface LegalPageOptions {
  readonly slug: LegalSlug;
  readonly contactEmail: string;
  readonly brandName: string;
}

interface SlugMeta {
  readonly title: string;
  readonly description: string;
}

const SLUG_META: Record<LegalContentSlug, SlugMeta> = {
  terms: {
    title: 'Terms of Service',
    description: 'Terms of Service for migrate-bot.',
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'How migrate-bot collects, processes, and protects your data.',
  },
  refunds: {
    title: 'Refund Policy',
    description: '14-day full refund if our verify (typecheck + next build) does not pass.',
  },
  'specified-commercial-transactions': {
    title: '特定商取引法に基づく表記',
    description: '特定商取引法第 11 条に基づく表記。',
  },
};

// marked の renderer 設定: GFM 既定、テーブル・リスト・コードブロックを Tailwind の
// .prose-legal クラスでスタイルする (layout.ts に CSS あり)。
marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderLegalPage(opts: LegalPageOptions): string {
  if (opts.slug === 'not-found') {
    return renderNotFound(opts);
  }
  const meta = SLUG_META[opts.slug];
  const md = LEGAL_CONTENT[opts.slug];
  const bodyHtml = marked.parse(md, { async: false }) as string;
  const content = `
    <main class="max-w-3xl mx-auto px-6 py-12">
      <article class="prose-legal">${bodyHtml}</article>
      <hr class="border-slate-800 my-12" />
      <p class="text-sm text-slate-500">
        Questions? Email
        <a href="mailto:${opts.contactEmail}" class="text-indigo-400 hover:text-indigo-300 underline">${opts.contactEmail}</a>.
      </p>
    </main>
  `;
  return renderLayout({
    title: `${meta.title} — ${opts.brandName}`,
    description: meta.description,
    brandName: opts.brandName,
    contactEmail: opts.contactEmail,
    content,
  });
}

function renderNotFound(opts: LegalPageOptions): string {
  const content = `
    <main class="max-w-2xl mx-auto px-6 py-24 text-center">
      <p class="text-indigo-400 text-sm font-semibold tracking-wide uppercase">404</p>
      <h1 class="mt-3 text-4xl md:text-5xl font-bold">Page not found</h1>
      <p class="mt-4 text-slate-400">
        The page you were looking for doesn't exist. Try the home page or contact us if you think this is a bug.
      </p>
      <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/"
          class="rounded-md bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 font-semibold"
        >Home</a>
        <a
          href="mailto:${opts.contactEmail}"
          class="rounded-md border border-slate-700 hover:border-slate-500 text-slate-100 px-5 py-2.5 font-medium"
        >Contact</a>
      </div>
    </main>
  `;
  return renderLayout({
    title: `Page not found — ${opts.brandName}`,
    description: 'The page you were looking for could not be found.',
    brandName: opts.brandName,
    contactEmail: opts.contactEmail,
    content,
  });
}
