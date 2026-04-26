import { describe, expect, it } from 'vitest';
import { computeTargetPath, plan } from '../plan';
import type { AnalyzeResult, FileClassification } from '../types';

function buildAnalysis(classifications: readonly FileClassification[]): AnalyzeResult {
  return {
    nextVersion: '13.5.6',
    pagesFiles: classifications.map((c) => c.path),
    fileCount: classifications.length,
    recommendedPlan: 'small',
    blockers: [],
    classifications,
    usage: { costUsd: 0, callCount: 0 },
  };
}

describe('plan', () => {
  it('returns an empty plan for empty classifications', async () => {
    const result = await plan(buildAnalysis([]));
    expect(result.tasks).toEqual([]);
  });

  it('emits one task per classification', async () => {
    const result = await plan(
      buildAnalysis([
        { path: 'pages/index.tsx', kind: 'static-page' },
        { path: 'pages/api/hello.ts', kind: 'api-route' },
      ]),
    );
    expect(result.tasks).toHaveLength(2);
  });

  it('orders the _app task before _document and other pages', async () => {
    const result = await plan(
      buildAnalysis([
        { path: 'pages/index.tsx', kind: 'static-page' },
        { path: 'pages/_document.tsx', kind: 'document' },
        { path: 'pages/_app.tsx', kind: 'app' },
      ]),
    );
    expect(result.tasks[0]?.sourcePath).toBe('pages/_app.tsx');
    expect(result.tasks[1]?.sourcePath).toBe('pages/_document.tsx');
    expect(result.tasks[2]?.sourcePath).toBe('pages/index.tsx');
  });

  it('makes _document depend on _app', async () => {
    const result = await plan(
      buildAnalysis([
        { path: 'pages/_app.tsx', kind: 'app' },
        { path: 'pages/_document.tsx', kind: 'document' },
      ]),
    );
    const appTask = result.tasks.find((t) => t.sourcePath === 'pages/_app.tsx');
    const docTask = result.tasks.find((t) => t.sourcePath === 'pages/_document.tsx');
    expect(docTask?.dependsOn).toEqual([appTask?.id]);
  });

  it('makes pages depend on both _app and _document when both exist', async () => {
    const result = await plan(
      buildAnalysis([
        { path: 'pages/_app.tsx', kind: 'app' },
        { path: 'pages/_document.tsx', kind: 'document' },
        { path: 'pages/index.tsx', kind: 'static-page' },
      ]),
    );
    const appTask = result.tasks.find((t) => t.sourcePath === 'pages/_app.tsx');
    const docTask = result.tasks.find((t) => t.sourcePath === 'pages/_document.tsx');
    const indexTask = result.tasks.find((t) => t.sourcePath === 'pages/index.tsx');
    expect(indexTask?.dependsOn).toContain(appTask?.id);
    expect(indexTask?.dependsOn).toContain(docTask?.id);
  });

  it('leaves api-route depending only on layout tasks (no inter-route deps)', async () => {
    const result = await plan(
      buildAnalysis([
        { path: 'pages/_app.tsx', kind: 'app' },
        { path: 'pages/api/a.ts', kind: 'api-route' },
        { path: 'pages/api/b.ts', kind: 'api-route' },
      ]),
    );
    const a = result.tasks.find((t) => t.sourcePath === 'pages/api/a.ts');
    const b = result.tasks.find((t) => t.sourcePath === 'pages/api/b.ts');
    expect(a?.dependsOn).toHaveLength(1);
    expect(b?.dependsOn).toHaveLength(1);
    expect(a?.dependsOn[0]).toBe(b?.dependsOn[0]);
  });

  it('assigns task kinds appropriate to each FileKind', async () => {
    const result = await plan(
      buildAnalysis([
        { path: 'pages/_app.tsx', kind: 'app' },
        { path: 'pages/api/hello.ts', kind: 'api-route' },
        { path: 'pages/index.tsx', kind: 'static-page' },
        { path: 'pages/profile.tsx', kind: 'ssr-page' },
        { path: 'pages/posts/[slug].tsx', kind: 'ssg-page' },
        { path: 'pages/_error.tsx', kind: 'error' },
        { path: 'pages/weird.tsx', kind: 'unknown' },
      ]),
    );
    const bySource = new Map(result.tasks.map((t) => [t.sourcePath, t]));
    expect(bySource.get('pages/_app.tsx')?.kind).toBe('hybrid');
    expect(bySource.get('pages/api/hello.ts')?.kind).toBe('hybrid');
    expect(bySource.get('pages/index.tsx')?.kind).toBe('hybrid');
    expect(bySource.get('pages/profile.tsx')?.kind).toBe('agent');
    expect(bySource.get('pages/posts/[slug].tsx')?.kind).toBe('agent');
    expect(bySource.get('pages/_error.tsx')?.kind).toBe('hybrid');
    expect(bySource.get('pages/weird.tsx')?.kind).toBe('agent');
  });

  it('produces unique task ids', async () => {
    const result = await plan(
      buildAnalysis([
        { path: 'pages/_app.tsx', kind: 'app' },
        { path: 'pages/index.tsx', kind: 'static-page' },
        { path: 'pages/about.tsx', kind: 'static-page' },
        { path: 'pages/api/hello.ts', kind: 'api-route' },
      ]),
    );
    const ids = result.tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('computeTargetPath', () => {
  it('maps _app.tsx and _document.tsx to app/layout.tsx', () => {
    expect(computeTargetPath('pages/_app.tsx', 'app')).toBe('app/layout.tsx');
    expect(computeTargetPath('pages/_document.tsx', 'document')).toBe('app/layout.tsx');
  });

  it('maps _error.tsx and 500.tsx to app/error.tsx', () => {
    expect(computeTargetPath('pages/_error.tsx', 'error')).toBe('app/error.tsx');
    expect(computeTargetPath('pages/500.tsx', 'error')).toBe('app/error.tsx');
  });

  it('maps 404.tsx to app/not-found.tsx', () => {
    expect(computeTargetPath('pages/404.tsx', 'error')).toBe('app/not-found.tsx');
  });

  it('maps pages/index.tsx to app/page.tsx', () => {
    expect(computeTargetPath('pages/index.tsx', 'static-page')).toBe('app/page.tsx');
  });

  it('maps pages/about.tsx to app/about/page.tsx', () => {
    expect(computeTargetPath('pages/about.tsx', 'static-page')).toBe('app/about/page.tsx');
  });

  it('maps pages/posts/[slug].tsx to app/posts/[slug]/page.tsx', () => {
    expect(computeTargetPath('pages/posts/[slug].tsx', 'ssg-page')).toBe(
      'app/posts/[slug]/page.tsx',
    );
  });

  it('maps pages/posts/index.tsx to app/posts/page.tsx', () => {
    expect(computeTargetPath('pages/posts/index.tsx', 'static-page')).toBe('app/posts/page.tsx');
  });

  it('maps API routes pages/api/hello.ts to app/api/hello/route.ts', () => {
    expect(computeTargetPath('pages/api/hello.ts', 'api-route')).toBe('app/api/hello/route.ts');
  });

  it('maps nested API routes pages/api/users/[id].ts to app/api/users/[id]/route.ts', () => {
    expect(computeTargetPath('pages/api/users/[id].ts', 'api-route')).toBe(
      'app/api/users/[id]/route.ts',
    );
  });

  it('drops index from API routes: pages/api/users/index.ts to app/api/users/route.ts', () => {
    expect(computeTargetPath('pages/api/users/index.ts', 'api-route')).toBe(
      'app/api/users/route.ts',
    );
  });
});
