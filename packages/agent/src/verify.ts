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

const defaultRunner: CommandRunner = async (cmd, args, cwd) => {
  const { stdout, stderr } = await execFileAsync(cmd, [...args], {
    cwd,
    maxBuffer: 1024 * 1024 * 16,
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
