import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MigrationTask } from '../types';

const createMessages = vi.fn();

vi.mock('../clients/anthropic', () => ({
  getAnthropicClient: () => ({
    messages: { create: createMessages },
  }),
  resetAnthropicClient: () => {},
}));

import { transformFile } from '../migrate/transform';

const STUB_USAGE = {
  input_tokens: 2500,
  output_tokens: 600,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

const SAMPLE_TASK: MigrationTask = {
  id: 'task-001-pages-index-tsx',
  kind: 'hybrid',
  fileKind: 'static-page',
  sourcePath: 'pages/index.tsx',
  targetPath: 'app/page.tsx',
  description: 'Convert pages/index.tsx to app/page.tsx',
  dependsOn: [],
};

describe('transformFile', () => {
  let logDir: string;

  beforeEach(async () => {
    createMessages.mockReset();
    logDir = await mkdtemp(join(tmpdir(), 'transform-test-'));
  });

  afterEach(async () => {
    createMessages.mockReset();
    await rm(logDir, { recursive: true, force: true });
  });

  it('returns transformed content when the model calls write_transformed_file', async () => {
    createMessages.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'write_transformed_file',
          input: { content: 'export default function Page() { return <div>x</div>; }' },
        },
      ],
      usage: STUB_USAGE,
    });

    const outcome = await transformFile({
      task: SAMPLE_TASK,
      sourceContent: 'export default function Home() { return <div>x</div>; }',
      logPath: join(logDir, 'usage.jsonl'),
    });
    expect(outcome.kind).toBe('transformed');
    if (outcome.kind === 'transformed') {
      expect(outcome.content).toContain('Page');
      expect(outcome.usage.costUsd).toBeGreaterThan(0);
    }
  });

  it('returns aborted when the model calls abort', async () => {
    createMessages.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          id: 'tool-2',
          name: 'abort',
          input: { reason: 'custom server detected' },
        },
      ],
      usage: STUB_USAGE,
    });

    const outcome = await transformFile({
      task: SAMPLE_TASK,
      sourceContent: '...',
      logPath: join(logDir, 'usage.jsonl'),
    });
    expect(outcome.kind).toBe('aborted');
    if (outcome.kind === 'aborted') {
      expect(outcome.reason).toMatch(/custom server/);
    }
  });

  it('throws when the response includes no tool_use block', async () => {
    createMessages.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'ignored' }],
      usage: STUB_USAGE,
    });
    await expect(
      transformFile({
        task: SAMPLE_TASK,
        sourceContent: '...',
        logPath: join(logDir, 'usage.jsonl'),
      }),
    ).rejects.toThrow(/tool_use block/);
  });

  it('throws on unexpected tool name', async () => {
    createMessages.mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 't', name: 'something_else', input: {} }],
      usage: STUB_USAGE,
    });
    await expect(
      transformFile({
        task: SAMPLE_TASK,
        sourceContent: '...',
        logPath: join(logDir, 'usage.jsonl'),
      }),
    ).rejects.toThrow(/unexpected tool name/);
  });
});
