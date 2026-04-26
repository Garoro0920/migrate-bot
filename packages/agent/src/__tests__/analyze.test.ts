import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyze } from '../analyze';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, '../../test-fixtures/pages-router-minimal');

describe('analyze (skipLlm)', () => {
  it('produces a valid AnalyzeResult against the minimal fixture', async () => {
    const result = await analyze({ localPath: FIXTURE, source: 'fixture' }, { skipLlm: true });

    expect(result.nextVersion).toBe('13.5.6');
    expect(result.fileCount).toBe(4);
    expect(result.recommendedPlan).toBe('small');
    expect(result.blockers).toEqual([]);
    expect(result.classifications).toEqual([]);
    expect(result.pagesFiles).toContain('pages/_app.tsx');
    expect(result.pagesFiles).toContain('pages/api/hello.ts');
    expect(result.usage.callCount).toBe(0);
    expect(result.usage.costUsd).toBe(0);
  });
});

describe('analyze (other stages still stub)', () => {
  it('plan throws not-implemented', async () => {
    const { plan } = await import('../plan');
    await expect(
      plan({
        nextVersion: '',
        pagesFiles: [],
        fileCount: 0,
        recommendedPlan: 'small',
        blockers: [],
        classifications: [],
        usage: { costUsd: 0, callCount: 0 },
      }),
    ).rejects.toThrow(/not implemented/);
  });
});
