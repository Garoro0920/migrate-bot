import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findProjectRoot } from '../project-root';

describe('findProjectRoot', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'root-test-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns the directory containing pnpm-workspace.yaml', async () => {
    await writeFile(join(dir, 'pnpm-workspace.yaml'), '');
    expect(findProjectRoot(dir)).toBe(resolve(dir));
  });

  it('walks up directories to find pnpm-workspace.yaml', async () => {
    await writeFile(join(dir, 'pnpm-workspace.yaml'), '');
    const nested = join(dir, 'apps', 'cli');
    await mkdir(nested, { recursive: true });
    expect(findProjectRoot(nested)).toBe(resolve(dir));
  });

  it('also accepts turbo.json as a marker', async () => {
    await writeFile(join(dir, 'turbo.json'), '{}');
    expect(findProjectRoot(dir)).toBe(resolve(dir));
  });

  it('returns startDir when no marker is found anywhere', async () => {
    expect(findProjectRoot(dir)).toBe(resolve(dir));
  });
});
