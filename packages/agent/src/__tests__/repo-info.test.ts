import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { enumeratePagesFiles, readPackageInfo } from '../analyze/repo-info';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, '../../test-fixtures/pages-router-minimal');

describe('readPackageInfo', () => {
  it('reads name and next version from fixture', async () => {
    const info = await readPackageInfo(FIXTURE);
    expect(info.name).toBe('pages-router-minimal');
    expect(info.nextVersion).toBe('13.5.6');
    expect(info.hasMonorepoMarkers).toBe(false);
  });
});

describe('enumeratePagesFiles', () => {
  it('lists all .tsx/.ts files under pages/ in posix style', async () => {
    const result = await enumeratePagesFiles(FIXTURE);
    expect(result.count).toBe(4);
    expect(result.all).toEqual([
      'pages/_app.tsx',
      'pages/api/hello.ts',
      'pages/index.tsx',
      'pages/posts/[slug].tsx',
    ]);
  });

  it('returns empty when pages/ is missing', async () => {
    const result = await enumeratePagesFiles('/path/that/does/not/exist/anywhere');
    expect(result.count).toBe(0);
    expect(result.all).toEqual([]);
  });
});
