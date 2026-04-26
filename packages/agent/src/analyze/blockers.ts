import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Blocker } from '../types';

export interface StaticBlockerInput {
  readonly repoPath: string;
  readonly pageCount: number;
  readonly hasMonorepoMarkers: boolean;
  readonly hasAppDir: boolean;
}

export const SIZE_OVERFLOW_THRESHOLD = 2000;

export async function detectStaticBlockers(input: StaticBlockerInput): Promise<Blocker[]> {
  const blockers: Blocker[] = [];

  if (await fileExists(join(input.repoPath, 'server.js'))) {
    blockers.push({
      type: 'custom-server',
      evidence: 'server.js exists at repository root',
    });
  }

  if (input.hasMonorepoMarkers) {
    blockers.push({
      type: 'monorepo',
      evidence: 'package.json contains a "workspaces" field',
    });
  }

  if (input.pageCount > SIZE_OVERFLOW_THRESHOLD) {
    blockers.push({
      type: 'size-overflow',
      evidence: `pages/ contains ${input.pageCount} files (limit ${SIZE_OVERFLOW_THRESHOLD})`,
    });
  }

  if (input.hasAppDir) {
    blockers.push({
      type: 'mixed-app-router',
      evidence: 'app/ directory already exists alongside pages/',
    });
  }

  return blockers;
}

export async function hasAppDir(repoPath: string): Promise<boolean> {
  const direct = await dirExists(join(repoPath, 'app'));
  if (direct) return true;
  const inSrc = await dirExists(join(repoPath, 'src', 'app'));
  return inSrc;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}
