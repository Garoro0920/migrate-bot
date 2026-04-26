import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runStats } from '../commands/stats';

describe('cli stats command', () => {
  let cwdDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    cwdDir = await mkdtemp(join(tmpdir(), 'stats-test-'));
    originalCwd = process.cwd();
    process.chdir(cwdDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(cwdDir, { recursive: true, force: true });
  });

  it('returns 0 with empty log (no .migrate-bot/usage.jsonl)', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const code = await runStats([]);
    expect(code).toBe(0);
    expect(stdout).toHaveBeenCalled();
    stdout.mockRestore();
  });

  it('returns 1 when evaluation threshold is reached', async () => {
    const fs = await import('node:fs/promises');
    await fs.mkdir(join(cwdDir, '.migrate-bot'), { recursive: true });
    const record = {
      timestamp: '2026-04-26T00:00:00.000Z',
      model: 'claude-sonnet-4-6',
      stage: 'migrate',
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      costUsd: 35,
    };
    await fs.writeFile(
      join(cwdDir, '.migrate-bot', 'usage.jsonl'),
      `${JSON.stringify(record)}\n`,
      'utf-8',
    );
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runStats([]);
    expect(code).toBe(1);
    stdout.mockRestore();
    stderr.mockRestore();
  });

  it('returns 2 when hard stop threshold is reached', async () => {
    const fs = await import('node:fs/promises');
    await fs.mkdir(join(cwdDir, '.migrate-bot'), { recursive: true });
    const record = {
      timestamp: '2026-04-26T00:00:00.000Z',
      model: 'claude-opus-4-7',
      stage: 'migrate',
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      costUsd: 90,
    };
    await fs.writeFile(
      join(cwdDir, '.migrate-bot', 'usage.jsonl'),
      `${JSON.stringify(record)}\n`,
      'utf-8',
    );
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const code = await runStats([]);
    expect(code).toBe(2);
    stdout.mockRestore();
    stderr.mockRestore();
  });
});
