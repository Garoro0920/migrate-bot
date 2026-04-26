import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectStaticBlockers, hasAppDir } from '../analyze/blockers';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, '../../test-fixtures/pages-router-minimal');

describe('detectStaticBlockers', () => {
  it('returns no blockers for the minimal fixture', async () => {
    const blockers = await detectStaticBlockers({
      repoPath: FIXTURE,
      pageCount: 4,
      hasMonorepoMarkers: false,
      hasAppDir: false,
    });
    expect(blockers).toEqual([]);
  });

  it('detects monorepo blocker when workspaces field is present', async () => {
    const blockers = await detectStaticBlockers({
      repoPath: FIXTURE,
      pageCount: 4,
      hasMonorepoMarkers: true,
      hasAppDir: false,
    });
    expect(blockers.map((b) => b.type)).toContain('monorepo');
  });

  it('detects size-overflow blocker when over the threshold', async () => {
    const blockers = await detectStaticBlockers({
      repoPath: FIXTURE,
      pageCount: 2500,
      hasMonorepoMarkers: false,
      hasAppDir: false,
    });
    expect(blockers.map((b) => b.type)).toContain('size-overflow');
  });

  it('detects mixed-app-router blocker when hasAppDir is true', async () => {
    const blockers = await detectStaticBlockers({
      repoPath: FIXTURE,
      pageCount: 4,
      hasMonorepoMarkers: false,
      hasAppDir: true,
    });
    expect(blockers.map((b) => b.type)).toContain('mixed-app-router');
  });
});

describe('hasAppDir', () => {
  it('returns false for the minimal fixture (only pages/)', async () => {
    expect(await hasAppDir(FIXTURE)).toBe(false);
  });
});
