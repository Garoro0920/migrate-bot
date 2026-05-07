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
  readonly timeoutMs?: number;
}

// R3: 大規模リポジトリ + 弱い回線でも 5 分で諦める。Fly Machine の SLA から逆算。
const DEFAULT_CLONE_TIMEOUT_MS = 5 * 60 * 1000;

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
    await execFileAsync('git', args, {
      timeout: options.timeoutMs ?? DEFAULT_CLONE_TIMEOUT_MS,
      killSignal: 'SIGKILL',
    });
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
