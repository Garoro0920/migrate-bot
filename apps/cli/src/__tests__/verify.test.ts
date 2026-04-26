import { describe, expect, it, vi } from 'vitest';
import { runVerify } from '../commands/verify';

describe('cli verify command', () => {
  it('returns exit code 1 when no path is given', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runVerify([]);
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('runs against a non-existent path with all checks skipped (smoke)', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runVerify([
      '--skip-install',
      '--skip-typecheck',
      '--skip-build',
      '/path/that/does/not/exist',
    ]);
    expect(code).toBe(0);
    stdout.mockRestore();
  });
});
