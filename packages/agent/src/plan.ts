import type {
  AnalyzeResult,
  FileClassification,
  FileKind,
  MigrationPlan,
  MigrationTask,
  TaskKind,
} from './types';

// Phase 1 PoC では LLM を使わない deterministic 実装。
// FileKind から TaskKind / description / 優先度 / target path を決定。
// 将来的に複雑な変換パターンが必要になったら LLM 補強を追加検討する。

interface KindMapping {
  readonly task: TaskKind;
  readonly priority: number;
  readonly describe: (sourcePath: string, targetPath: string) => string;
}

const KIND_MAPPINGS = {
  app: {
    task: 'hybrid',
    priority: 0,
    describe: (s, t) => `Convert ${s} to ${t} (root layout)`,
  },
  document: {
    task: 'hybrid',
    priority: 1,
    describe: (s, t) => `Merge ${s} <html><body> structure into ${t}`,
  },
  error: {
    task: 'hybrid',
    priority: 2,
    describe: (s, t) => `Convert ${s} to ${t}`,
  },
  'api-route': {
    task: 'hybrid',
    priority: 3,
    describe: (s, t) => `Convert ${s} to ${t} (split by HTTP method)`,
  },
  'static-page': {
    task: 'hybrid',
    priority: 3,
    describe: (s, t) => `Convert ${s} to ${t} (static page)`,
  },
  'ssr-page': {
    task: 'agent',
    priority: 3,
    describe: (s, t) => `Convert ${s} to ${t} (getServerSideProps → async Server Component)`,
  },
  'ssg-page': {
    task: 'agent',
    priority: 3,
    describe: (s, t) =>
      `Convert ${s} to ${t} (getStaticProps/Paths → generateStaticParams + Server Component)`,
  },
  unknown: {
    task: 'agent',
    priority: 4,
    describe: (s, t) => `Manually review ${s} → ${t}: classification was inconclusive`,
  },
} as const satisfies Record<FileKind, KindMapping>;

export async function plan(analysis: AnalyzeResult): Promise<MigrationPlan> {
  if (analysis.classifications.length === 0) {
    return { tasks: [] };
  }

  const sorted = [...analysis.classifications].sort(
    (a, b) => KIND_MAPPINGS[a.kind].priority - KIND_MAPPINGS[b.kind].priority,
  );

  const tasks: MigrationTask[] = [];
  let appTaskId: string | undefined;
  let documentTaskId: string | undefined;

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    if (!c) continue;
    const id = makeTaskId(i + 1, c);
    const dependsOn = computeDependencies(c.kind, appTaskId, documentTaskId);
    const mapping = KIND_MAPPINGS[c.kind];
    const targetPath = computeTargetPath(c.path, c.kind);
    tasks.push({
      id,
      kind: mapping.task,
      fileKind: c.kind,
      sourcePath: c.path,
      targetPath,
      description: mapping.describe(c.path, targetPath),
      dependsOn,
    });
    if (c.kind === 'app') appTaskId = id;
    else if (c.kind === 'document') documentTaskId = id;
  }

  return { tasks };
}

export function computeTargetPath(sourcePath: string, kind: FileKind): string {
  // Pages Router は POSIX `/` 前提 (analyze/repo-info.ts で正規化済)
  const ext = sourcePath.match(/\.(tsx|jsx|ts|js)$/)?.[1] ?? 'tsx';

  if (kind === 'app' || kind === 'document') {
    // _app.tsx と _document.tsx は両方 app/layout.tsx に集約 (merge は migrate 段階で実施)
    return `app/layout.${ext === 'js' || ext === 'ts' ? 'tsx' : ext}`;
  }

  if (kind === 'error') {
    if (/(?:^|\/)404\.[jt]sx?$/.test(sourcePath)) return `app/not-found.${ext}`;
    // _error.tsx, 500.tsx → app/error.tsx (Next.js App Router の error boundary)
    return `app/error.${ext}`;
  }

  // pages/ プレフィックスを除去
  const rel = sourcePath.replace(/^pages\//, '');
  const noExt = rel.replace(/\.(tsx|jsx|ts|js)$/, '');

  if (kind === 'api-route') {
    // pages/api/hello.ts → app/api/hello/route.ts
    // pages/api/users/[id].ts → app/api/users/[id]/route.ts
    return `app/${noExt}/route.${ext}`;
  }

  // pages/index.tsx → app/page.tsx
  // pages/about.tsx → app/about/page.tsx
  // pages/posts/[slug].tsx → app/posts/[slug]/page.tsx
  // pages/posts/index.tsx → app/posts/page.tsx
  if (noExt === 'index') return `app/page.${ext}`;
  if (noExt.endsWith('/index')) {
    return `app/${noExt.slice(0, -'/index'.length)}/page.${ext}`;
  }
  return `app/${noExt}/page.${ext}`;
}

function makeTaskId(index: number, c: FileClassification): string {
  const slug = c.path
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `task-${index.toString().padStart(3, '0')}-${slug}`;
}

function computeDependencies(
  kind: FileKind,
  appTaskId: string | undefined,
  documentTaskId: string | undefined,
): readonly string[] {
  if (kind === 'app') return [];
  if (kind === 'document') return appTaskId ? [appTaskId] : [];
  const deps: string[] = [];
  if (appTaskId) deps.push(appTaskId);
  if (documentTaskId) deps.push(documentTaskId);
  return deps;
}
