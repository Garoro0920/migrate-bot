import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { runPlan } from '../commands/plan';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, '../../../../packages/agent/test-fixtures/pages-router-minimal');

describe('cli plan command', () => {
  it('returns exit code 1 when no path is given', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runPlan([]);
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('runs analyze + plan with --no-llm against the fixture', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runPlan(['--no-llm', FIXTURE]);
    expect(code).toBe(0);
    expect(stdout).toHaveBeenCalled();
    stdout.mockRestore();
  });

  it('emits combined JSON output with --json --no-llm', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runPlan(['--json', '--no-llm', FIXTURE]);
    expect(code).toBe(0);
    const written = stdout.mock.calls
      .map((call) => {
        const first = call[0];
        if (typeof first === 'string') return first;
        if (first instanceof Uint8Array) return Buffer.from(first).toString('utf-8');
        return '';
      })
      .join('');
    const parsed = JSON.parse(written) as {
      analysis: { fileCount: number };
      plan: { tasks: unknown[] };
    };
    expect(parsed.analysis.fileCount).toBe(4);
    // skipLlm 時は classifications が空 → tasks も空
    expect(parsed.plan.tasks).toEqual([]);
    stdout.mockRestore();
  });
});
