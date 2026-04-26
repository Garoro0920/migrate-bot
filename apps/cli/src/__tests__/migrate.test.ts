import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { runMigrate } from '../commands/migrate';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, '../../../../packages/agent/test-fixtures/pages-router-minimal');

describe('cli migrate command', () => {
  it('returns exit code 1 when no path is given', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runMigrate([]);
    expect(code).toBe(1);
    stderr.mockRestore();
  });

  it('runs the pipeline with --no-llm without making API calls', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runMigrate(['--no-llm', FIXTURE]);
    expect(code).toBe(0);
    stdout.mockRestore();
  });
});
