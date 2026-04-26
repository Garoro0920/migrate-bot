import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { runAnalyze } from '../commands/analyze';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, '../../../../packages/agent/test-fixtures/pages-router-minimal');

describe('cli analyze command', () => {
  it('returns exit code 1 when no path is given', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runAnalyze([]);
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('analyzes the minimal fixture successfully with --no-llm', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runAnalyze(['--no-llm', FIXTURE]);
    expect(code).toBe(0);
    expect(stdout).toHaveBeenCalled();
    stdout.mockRestore();
  });

  it('emits JSON output with --json --no-llm', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runAnalyze(['--json', '--no-llm', FIXTURE]);
    expect(code).toBe(0);
    const written = stdout.mock.calls
      .map((call) => {
        const first = call[0];
        if (typeof first === 'string') return first;
        if (first instanceof Uint8Array) return Buffer.from(first).toString('utf-8');
        return '';
      })
      .join('');
    const parsed = JSON.parse(written) as { fileCount: number };
    expect(parsed.fileCount).toBe(4);
    stdout.mockRestore();
  });
});
