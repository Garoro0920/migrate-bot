import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

  it('writes target file and deletes source on success', async () => {
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

    // 1 add (target) + 1 delete (source)
    expect(result.changes).toHaveLength(2);
    const adds = result.changes.filter((c) => c.kind === 'add');
    const deletes = result.changes.filter((c) => c.kind === 'delete');
    expect(adds).toEqual([{ path: 'app/page.tsx', kind: 'add' }]);
    expect(deletes).toEqual([{ path: 'pages/index.tsx', kind: 'delete' }]);
    expect(result.failedTaskIds).toEqual([]);

    const written = await readFile(join(workDir, 'app', 'page.tsx'), 'utf-8');
    expect(written).toContain('Page');
    // source must be gone
    await expect(access(join(workDir, 'pages', 'index.tsx'))).rejects.toThrow();
  });

  it('records aborted tasks as failed, leaves source intact', async () => {
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
    // source must still exist
    await expect(access(join(workDir, 'pages', 'weird.tsx'))).resolves.toBeUndefined();
  });

  it('skips a task when its targetPath was already written by an earlier task', async () => {
    await mkdir(join(workDir, 'pages'), { recursive: true });
    await writeFile(join(workDir, 'pages', '_app.tsx'), 'app source');
    await writeFile(join(workDir, 'pages', '_document.tsx'), 'document source');

    // First task succeeds, second collides on app/layout.tsx
    createMessages.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          id: 't',
          name: 'write_transformed_file',
          input: { content: '// merged layout from _app' },
        },
      ],
      usage: USAGE,
    });

    const plan: MigrationPlan = {
      tasks: [
        task('t1', 'pages/_app.tsx', 'app/layout.tsx'),
        task('t2', 'pages/_document.tsx', 'app/layout.tsx', ['t1']),
      ],
    };

    const result = await migrate({ localPath: workDir, source: workDir }, plan, {
      logPath: join(logDir, 'usage.jsonl'),
    });

    // task1 succeeds (add + delete), task2 is intentionally skipped (no transform call)
    // 設計上の意図的スキップなので failedTaskIds ではなく skippedTaskIds に入る。
    // pipeline.ts は failedTaskIds のみで fail 判定するので、これで _document.tsx を
    // 持つ全リポジトリの migration が中断されなくなる。
    expect(result.failedTaskIds).toEqual([]);
    expect(result.skippedTaskIds).toEqual(['t2']);
    expect(result.changes.some((c) => c.path === 'app/layout.tsx' && c.kind === 'add')).toBe(true);
    expect(result.changes.some((c) => c.path === 'pages/_app.tsx' && c.kind === 'delete')).toBe(
      true,
    );
    // pages/_document.tsx is preserved for manual merge
    await expect(access(join(workDir, 'pages', '_document.tsx'))).resolves.toBeUndefined();
    expect(createMessages).toHaveBeenCalledTimes(1);
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

    // 1 add + 1 delete
    expect(result.changes).toHaveLength(2);
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
