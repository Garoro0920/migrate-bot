import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export interface PackageInfo {
  readonly name: string;
  readonly nextVersion: string;
  readonly hasMonorepoMarkers: boolean;
}

interface RawPackageJson {
  name?: string;
  workspaces?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function readPackageInfo(repoPath: string): Promise<PackageInfo> {
  const text = await readFile(join(repoPath, 'package.json'), 'utf-8');
  const pkg = JSON.parse(text) as RawPackageJson;
  const name = pkg.name ?? 'unknown';
  const nextVersion = pkg.dependencies?.['next'] ?? pkg.devDependencies?.['next'] ?? '';
  const hasMonorepoMarkers = pkg.workspaces !== undefined;
  return { name, nextVersion, hasMonorepoMarkers };
}

export interface PagesEnumeration {
  readonly all: readonly string[];
  readonly count: number;
}

const PAGES_EXT_RE = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;

export async function enumeratePagesFiles(repoPath: string): Promise<PagesEnumeration> {
  const pagesDir = join(repoPath, 'pages');
  let files: string[];
  try {
    files = await walkFiles(pagesDir, pagesDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { all: [], count: 0 };
    }
    throw err;
  }
  const filtered = files
    .filter((f) => PAGES_EXT_RE.test(f))
    .map(toPosix)
    .sort();
  return { all: filtered, count: filtered.length };
}

async function walkFiles(root: string, dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(root, full)));
    } else if (entry.isFile()) {
      out.push(`pages/${relative(root, full)}`);
    }
  }
  return out;
}

function toPosix(path: string): string {
  return path.replaceAll('\\', '/');
}
