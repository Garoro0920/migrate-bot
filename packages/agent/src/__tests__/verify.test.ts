import { describe, expect, it } from 'vitest';
import { type CommandRunner, verify } from '../verify';

const repo = { localPath: '/tmp/anywhere', source: 'fixture' };

function makeRunner(outcomes: Record<string, 'ok' | 'fail'>): {
  runner: CommandRunner;
  calls: string[];
} {
  const calls: string[] = [];
  const runner: CommandRunner = async (cmd, args) => {
    const key = `${cmd} ${args.join(' ')}`;
    calls.push(key);
    if (outcomes[key] === 'fail') {
      throw new Error(`stub fail: ${key}`);
    }
    return { stdout: '', stderr: '' };
  };
  return { runner, calls };
}

describe('verify', () => {
  it('returns all-pass when install/typecheck/build succeed', async () => {
    const { runner } = makeRunner({});
    const result = await verify(repo, {}, runner);
    expect(result.typecheckPassed).toBe(true);
    expect(result.buildPassed).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('records typecheck failure but continues to build', async () => {
    const { runner, calls } = makeRunner({ 'pnpm exec tsc --noEmit': 'fail' });
    const result = await verify(repo, {}, runner);
    expect(result.typecheckPassed).toBe(false);
    expect(result.buildPassed).toBe(true);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatch(/typecheck/);
    expect(calls).toContain('pnpm exec next build');
  });

  it('records build failure', async () => {
    const { runner } = makeRunner({ 'pnpm exec next build': 'fail' });
    const result = await verify(repo, {}, runner);
    expect(result.typecheckPassed).toBe(true);
    expect(result.buildPassed).toBe(false);
    expect(result.failures.some((f) => f.startsWith('build:'))).toBe(true);
  });

  it('records install failure but continues to typecheck/build', async () => {
    const { runner, calls } = makeRunner({ 'pnpm install': 'fail' });
    const result = await verify(repo, {}, runner);
    expect(result.failures.some((f) => f.startsWith('install:'))).toBe(true);
    // typecheck and build still attempted
    expect(calls).toContain('pnpm exec tsc --noEmit');
    expect(calls).toContain('pnpm exec next build');
  });

  it('skipInstall avoids the install step', async () => {
    const { runner, calls } = makeRunner({});
    await verify(repo, { skipInstall: true }, runner);
    expect(calls).not.toContain('pnpm install');
    expect(calls).toContain('pnpm exec tsc --noEmit');
  });

  it('skipBuild avoids the build step', async () => {
    const { runner, calls } = makeRunner({});
    const result = await verify(repo, { skipBuild: true }, runner);
    expect(calls).not.toContain('pnpm exec next build');
    expect(result.buildPassed).toBe(false);
  });

  it('testsPassed is null in Phase 1 (test step not implemented)', async () => {
    const { runner } = makeRunner({});
    const result = await verify(repo, {}, runner);
    expect(result.testsPassed).toBeNull();
  });

  it('uses the default runner without throwing for the type signature', () => {
    // Sanity: verify is callable without an explicit runner
    expect(typeof verify).toBe('function');
  });

  it('passes timeoutMs through to the runner for each subprocess (R3)', async () => {
    const seen: Array<{ key: string; timeoutMs: number | undefined }> = [];
    const runner: CommandRunner = async (cmd, args, _cwd, opts) => {
      seen.push({ key: `${cmd} ${args.join(' ')}`, timeoutMs: opts?.timeoutMs });
      return { stdout: '', stderr: '' };
    };
    await verify(
      repo,
      { installTimeoutMs: 1000, typecheckTimeoutMs: 2000, buildTimeoutMs: 3000 },
      runner,
    );
    const byKey = (k: string) => seen.find((s) => s.key === k)?.timeoutMs;
    expect(byKey('pnpm install')).toBe(1000);
    expect(byKey('pnpm exec tsc --noEmit')).toBe(2000);
    expect(byKey('pnpm exec next build')).toBe(3000);
  });

  it('uses default timeouts when not specified', async () => {
    const seen: Array<{ key: string; timeoutMs: number | undefined }> = [];
    const runner: CommandRunner = async (cmd, args, _cwd, opts) => {
      seen.push({ key: `${cmd} ${args.join(' ')}`, timeoutMs: opts?.timeoutMs });
      return { stdout: '', stderr: '' };
    };
    await verify(repo, {}, runner);
    // 既定値: install 5min, typecheck 5min, build 10min
    expect(seen.find((s) => s.key === 'pnpm install')?.timeoutMs).toBe(5 * 60 * 1000);
    expect(seen.find((s) => s.key === 'pnpm exec tsc --noEmit')?.timeoutMs).toBe(5 * 60 * 1000);
    expect(seen.find((s) => s.key === 'pnpm exec next build')?.timeoutMs).toBe(10 * 60 * 1000);
  });
});
