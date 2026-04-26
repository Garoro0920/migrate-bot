import { describe, expect, it } from 'vitest';
import { plan } from '../plan';
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
    expect(result.tasks[0]?.targetPath).toBe('pages/_app.tsx');
    expect(result.tasks[1]?.targetPath).toBe('pages/_document.tsx');
    expect(result.tasks[2]?.targetPath).toBe('pages/index.tsx');
  });

  it('makes _document depend on _app', async () => {
    const result = await plan(
      buildAnalysis([
        { path: 'pages/_app.tsx', kind: 'app' },
        { path: 'pages/_document.tsx', kind: 'document' },
      ]),
    );
    const appTask = result.tasks.find((t) => t.targetPath === 'pages/_app.tsx');
    const docTask = result.tasks.find((t) => t.targetPath === 'pages/_document.tsx');
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
    const appTask = result.tasks.find((t) => t.targetPath === 'pages/_app.tsx');
    const docTask = result.tasks.find((t) => t.targetPath === 'pages/_document.tsx');
    const indexTask = result.tasks.find((t) => t.targetPath === 'pages/index.tsx');
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
    const a = result.tasks.find((t) => t.targetPath === 'pages/api/a.ts');
    const b = result.tasks.find((t) => t.targetPath === 'pages/api/b.ts');
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
    const byPath = new Map(result.tasks.map((t) => [t.targetPath, t]));
    expect(byPath.get('pages/_app.tsx')?.kind).toBe('hybrid');
    expect(byPath.get('pages/api/hello.ts')?.kind).toBe('hybrid');
    expect(byPath.get('pages/index.tsx')?.kind).toBe('hybrid');
    expect(byPath.get('pages/profile.tsx')?.kind).toBe('agent');
    expect(byPath.get('pages/posts/[slug].tsx')?.kind).toBe('agent');
    expect(byPath.get('pages/_error.tsx')?.kind).toBe('hybrid');
    expect(byPath.get('pages/weird.tsx')?.kind).toBe('agent');
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
