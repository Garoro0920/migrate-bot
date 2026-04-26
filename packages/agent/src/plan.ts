import type {
  AnalyzeResult,
  FileClassification,
  FileKind,
  MigrationPlan,
  MigrationTask,
  TaskKind,
} from './types';

// Phase 1 PoC では LLM を使わない deterministic 実装。
// FileKind から TaskKind / description / 優先度を決定。
// 将来的に複雑な変換パターンが必要になったら LLM 補強を追加検討する。

interface KindMapping {
  readonly task: TaskKind;
  readonly priority: number;
  readonly describe: (path: string) => string;
}

const KIND_MAPPINGS = {
  app: {
    task: 'hybrid',
    priority: 0,
    describe: (p) => `Convert ${p} to app/layout.tsx (root layout)`,
  },
  document: {
    task: 'hybrid',
    priority: 1,
    describe: (p) => `Merge ${p} <html><body> structure into app/layout.tsx`,
  },
  error: {
    task: 'hybrid',
    priority: 2,
    describe: (p) => `Convert ${p} to app/error.tsx or app/not-found.tsx`,
  },
  'api-route': {
    task: 'hybrid',
    priority: 3,
    describe: (p) => `Convert ${p} to app/api/.../route.ts (split by HTTP method)`,
  },
  'static-page': {
    task: 'hybrid',
    priority: 3,
    describe: (p) => `Convert ${p} to app/.../page.tsx (static)`,
  },
  'ssr-page': {
    task: 'agent',
    priority: 3,
    describe: (p) => `Convert ${p}: getServerSideProps → async Server Component`,
  },
  'ssg-page': {
    task: 'agent',
    priority: 3,
    describe: (p) => `Convert ${p}: getStaticProps/Paths → generateStaticParams + Server Component`,
  },
  unknown: {
    task: 'agent',
    priority: 4,
    describe: (p) => `Manually review ${p}: classification was inconclusive`,
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
    tasks.push({
      id,
      kind: mapping.task,
      targetPath: c.path,
      description: mapping.describe(c.path),
      dependsOn,
    });
    if (c.kind === 'app') appTaskId = id;
    else if (c.kind === 'document') documentTaskId = id;
  }

  return { tasks };
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
