import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { RepoLocation, VerifyResult } from './types';

const execFileAsync = promisify(execFile);

export interface VerifyOptions {
  readonly skipInstall?: boolean;
  readonly skipBuild?: boolean;
  readonly skipTypecheck?: boolean;
  readonly installTimeoutMs?: number;
  readonly typecheckTimeoutMs?: number;
  readonly buildTimeoutMs?: number;
}

// R3: subprocess hang を防ぐためのタイムアウト既定値。
// pnpm install: lockfile 解決と node_modules 展開で大きなリポジトリは数分かかる。
// next build: SSG / type generation を含むので長め。
// killSignal は SIGKILL — Node の child_process は SIGTERM を無視するプロセスを
// 確実に殺せないため、強制終了する。
const DEFAULT_INSTALL_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_TYPECHECK_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_BUILD_TIMEOUT_MS = 10 * 60 * 1000;

export interface CommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export interface CommandRunOptions {
  readonly timeoutMs?: number;
}

export type CommandRunner = (
  cmd: string,
  args: readonly string[],
  cwd: string,
  opts?: CommandRunOptions,
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

const defaultRunner: CommandRunner = async (cmd, args, cwd, opts) => {
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
  // R3: timeout / killSignal で hang したプロセスを確実に殺す。
  const { stdout, stderr } = await execFileAsync(actualCmd, actualArgs, {
    cwd,
    maxBuffer: 1024 * 1024 * 16,
    shell: true,
    ...(opts?.timeoutMs !== undefined ? { timeout: opts.timeoutMs, killSignal: 'SIGKILL' } : {}),
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

  const installTimeoutMs = options.installTimeoutMs ?? DEFAULT_INSTALL_TIMEOUT_MS;
  const typecheckTimeoutMs = options.typecheckTimeoutMs ?? DEFAULT_TYPECHECK_TIMEOUT_MS;
  const buildTimeoutMs = options.buildTimeoutMs ?? DEFAULT_BUILD_TIMEOUT_MS;

  if (options.skipInstall !== true) {
    try {
      await runner('pnpm', ['install'], repo.localPath, { timeoutMs: installTimeoutMs });
    } catch (err) {
      failures.push(`install: ${describeError(err)}`);
    }
  }

  if (options.skipTypecheck !== true) {
    try {
      await runner('pnpm', ['exec', 'tsc', '--noEmit'], repo.localPath, {
        timeoutMs: typecheckTimeoutMs,
      });
      typecheckPassed = true;
    } catch (err) {
      failures.push(`typecheck: ${describeError(err)}`);
    }
  }

  if (options.skipBuild !== true) {
    try {
      await runner('pnpm', ['exec', 'next', 'build'], repo.localPath, {
        timeoutMs: buildTimeoutMs,
      });
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
