import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MigrationPlan, MigrationTask } from '../types';

const createMessages = vi.fn();

vi.mock('../clients/anthropic', () => ({
  getAnthropicClient: () => ({
    messages: { create: createMessages },
  }),
  resetAnthropicClient: () => {},
}));

import { migrate } from '../migrate';

const USAGE = {
  input_tokens: 1000,
  output_tokens: 200,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

function task(
  id: string,
  sourcePath: string,
  targetPath: string,
  dependsOn: readonly string[] = [],
): MigrationTask {
  return {
    id,
    kind: 'hybrid',
    fileKind: 'static-page',
    sourcePath,
    targetPath,
    description: `convert ${sourcePath}`,
    dependsOn,
  };
}

describe('migrate orchestration', () => {
  let workDir: string;
  let logDir: string;

  beforeEach(async () => {
    createMessages.mockReset();
    workDir = await mkdtemp(join(tmpdir(), 'migrate-orch-'));
    logDir = await mkdtemp(join(tmpdir(), 'migrate-log-'));
  });

  afterEach(async () => {
    createMessages.mockReset();
    await rm(workDir, { recursive: true, force: true });
    await rm(logDir, { recursive: true, force: true });
  });

  it('writes transformed files for successful tasks', async () => {
    await mkdir(join(workDir, 'pages'), { recursive: true });
    await writeFile(
      join(workDir, 'pages', 'index.tsx'),
      'export default function Home(){return null}',
    );

    createMessages.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          id: 't',
          name: 'write_transformed_file',
          input: { content: 'export default function Page(){return null}' },
        },
      ],
      usage: USAGE,
    });

    const plan: MigrationPlan = {
      tasks: [task('t1', 'pages/index.tsx', 'app/page.tsx')],
    };

    const result = await migrate({ localPath: workDir, source: workDir }, plan, {
      logPath: join(logDir, 'usage.jsonl'),
    });

    expect(result.changes).toHaveLength(1);
    expect(result.failedTaskIds).toEqual([]);
    expect(result.usage.callCount).toBe(1);
    const written = await readFile(join(workDir, 'app', 'page.tsx'), 'utf-8');
    expect(written).toContain('Page');
  });

  it('records aborted tasks as failed and skips writing', async () => {
    await mkdir(join(workDir, 'pages'), { recursive: true });
    await writeFile(join(workDir, 'pages', 'weird.tsx'), '// custom');

    createMessages.mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 't', name: 'abort', input: { reason: 'too complex' } }],
      usage: USAGE,
    });

    const plan: MigrationPlan = {
      tasks: [task('t1', 'pages/weird.tsx', 'app/weird/page.tsx')],
    };

    const result = await migrate({ localPath: workDir, source: workDir }, plan, {
      logPath: join(logDir, 'usage.jsonl'),
    });

    expect(result.changes).toEqual([]);
    expect(result.failedTaskIds).toEqual(['t1']);
    expect(result.usage.callCount).toBe(1);
  });

  it('retries with the configured retry model when the first call throws', async () => {
    await mkdir(join(workDir, 'pages'), { recursive: true });
    await writeFile(join(workDir, 'pages', 'index.tsx'), 'src');

    createMessages.mockRejectedValueOnce(new Error('rate limit')).mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          id: 't',
          name: 'write_transformed_file',
          input: { content: 'retry-success' },
        },
      ],
      usage: USAGE,
    });

    const plan: MigrationPlan = {
      tasks: [task('t1', 'pages/index.tsx', 'app/page.tsx')],
    };

    const result = await migrate({ localPath: workDir, source: workDir }, plan, {
      logPath: join(logDir, 'usage.jsonl'),
      retryWith: 'claude-opus-4-7',
    });

    expect(result.changes).toHaveLength(1);
    expect(result.failedTaskIds).toEqual([]);
    expect(createMessages).toHaveBeenCalledTimes(2);
  });

  it('marks task failed when both primary and retry throw', async () => {
    await mkdir(join(workDir, 'pages'), { recursive: true });
    await writeFile(join(workDir, 'pages', 'index.tsx'), 'src');

    createMessages.mockRejectedValue(new Error('boom'));

    const plan: MigrationPlan = {
      tasks: [task('t1', 'pages/index.tsx', 'app/page.tsx')],
    };

    const result = await migrate({ localPath: workDir, source: workDir }, plan, {
      logPath: join(logDir, 'usage.jsonl'),
    });

    expect(result.changes).toEqual([]);
    expect(result.failedTaskIds).toEqual(['t1']);
  });

  it('skipLlm produces an empty result without API calls', async () => {
    const plan: MigrationPlan = {
      tasks: [task('t1', 'pages/index.tsx', 'app/page.tsx')],
    };

    const result = await migrate({ localPath: workDir, source: workDir }, plan, {
      skipLlm: true,
      logPath: join(logDir, 'usage.jsonl'),
    });

    expect(result.changes).toEqual([]);
    expect(result.failedTaskIds).toEqual([]);
    expect(result.usage.callCount).toBe(0);
    expect(createMessages).not.toHaveBeenCalled();
  });
});
