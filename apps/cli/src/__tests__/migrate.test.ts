import { describe, expect, it, vi } from 'vitest';
import { runMigrate } from '../commands/migrate';

describe('cli migrate command', () => {
  it('returns exit code 1 when no repo url is given', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runMigrate([]);
    expect(code).toBe(1);
    stderrSpy.mockRestore();
  });

  it('returns exit code 0 when a repo url is provided (skeleton)', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runMigrate(['https://github.com/vercel/next.js']);
    expect(code).toBe(0);
    stdoutSpy.mockRestore();
  });
});
