import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface CloneOptions {
  readonly url: string;
  readonly ref?: string;
  readonly depth?: number;
}

export interface ClonedRepo {
  readonly localPath: string;
  readonly cleanup: () => Promise<void>;
}

export async function cloneRepo(options: CloneOptions): Promise<ClonedRepo> {
  const baseDir = await mkdtemp(join(tmpdir(), 'migrate-bot-'));
  const args = ['clone', '--depth', String(options.depth ?? 1)];
  if (options.ref !== undefined) {
    args.push('--branch', options.ref);
  }
  args.push(options.url, baseDir);

  try {
    await execFileAsync('git', args);
  } catch (err) {
    await rm(baseDir, { recursive: true, force: true });
    throw err;
  }

  return {
    localPath: baseDir,
    cleanup: async () => {
      await rm(baseDir, { recursive: true, force: true });
    },
  };
}
