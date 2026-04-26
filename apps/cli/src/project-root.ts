import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT_MARKERS = ['pnpm-workspace.yaml', 'turbo.json'] as const;

export function findProjectRoot(startDir: string = process.cwd()): string {
  let dir = resolve(startDir);
  while (true) {
    for (const marker of ROOT_MARKERS) {
      if (existsSync(resolve(dir, marker))) return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return resolve(startDir);
    dir = parent;
  }
}
