import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { RepoLocation, VerifyResult } from './types';

const execFileAsync = promisify(execFile);

export interface VerifyOptions {
  readonly skipInstall?: boolean;
  readonly skipBuild?: boolean;
  readonly skipTypecheck?: boolean;
}

export interface CommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export type CommandRunner = (
  cmd: string,
  args: readonly string[],
  cwd: string,
) => Promise<CommandResult>;

let pnpmDirectAvailable: boolean | undefined;

async function detectPnpmDirect(): Promise<boolean> {
  if (pnpmDirectAvailable !== undefined) return pnpmDirectAvailable;
  try {
    await execFileAsync('pnpm', ['--version'], { shell: true });
    pnpmDirectAvailable = true;
  } catch {
    pnpmDirectAvailable = false;
  }
  return pnpmDirectAvailable;
}

const defaultRunner: CommandRunner = async (cmd, args, cwd) => {
  let actualCmd = cmd;
  let actualArgs: string[] = [...args];

  // `pnpm` が PATH にない環境 (Windows + corepack のみセットアップ等) では
  // corepack 経由でフォールバック実行する。
  if (cmd === 'pnpm' && !(await detectPnpmDirect())) {
    actualCmd = 'corepack';
    actualArgs = ['pnpm', ...args];
  }

  // shell: true は Windows での corepack.cmd / pnpm.cmd の解決のために必要。
  // 引数は固定文字列のみ (cwd は exec の cwd 引数で渡し interpolate しない) なので
  // shell injection リスクはない。
  const { stdout, stderr } = await execFileAsync(actualCmd, actualArgs, {
    cwd,
    maxBuffer: 1024 * 1024 * 16,
    shell: true,
  });
  return { stdout, stderr };
};

export async function verify(
  repo: RepoLocation,
  options: VerifyOptions = {},
  runner: CommandRunner = defaultRunner,
): Promise<VerifyResult> {
  const failures: string[] = [];
  let typecheckPassed = false;
  let buildPassed = false;

  if (options.skipInstall !== true) {
    try {
      await runner('pnpm', ['install'], repo.localPath);
    } catch (err) {
      failures.push(`install: ${describeError(err)}`);
    }
  }

  if (options.skipTypecheck !== true) {
    try {
      await runner('pnpm', ['exec', 'tsc', '--noEmit'], repo.localPath);
      typecheckPassed = true;
    } catch (err) {
      failures.push(`typecheck: ${describeError(err)}`);
    }
  }

  if (options.skipBuild !== true) {
    try {
      await runner('pnpm', ['exec', 'next', 'build'], repo.localPath);
      buildPassed = true;
    } catch (err) {
      failures.push(`build: ${describeError(err)}`);
    }
  }

  return {
    typecheckPassed,
    buildPassed,
    testsPassed: null,
    failures,
  };
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    const stderr = (err as Error & { stderr?: string }).stderr;
    if (typeof stderr === 'string' && stderr.length > 0) {
      return `${err.message}\n  stderr: ${stderr.slice(0, 1000)}`;
    }
    return err.message;
  }
  return String(err);
}
