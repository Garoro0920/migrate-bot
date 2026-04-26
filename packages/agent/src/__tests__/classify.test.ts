import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createMessages = vi.fn();

vi.mock('../clients/anthropic', () => ({
  getAnthropicClient: () => ({
    messages: { create: createMessages },
  }),
  resetAnthropicClient: () => {},
}));

import { classifyPagesFiles } from '../analyze/classify';

const STUB_USAGE = {
  input_tokens: 1234,
  output_tokens: 56,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

describe('classifyPagesFiles', () => {
  let logDir: string;

  beforeEach(async () => {
    createMessages.mockReset();
    logDir = await mkdtemp(join(tmpdir(), 'classify-test-'));
  });

  afterEach(async () => {
    createMessages.mockReset();
    await rm(logDir, { recursive: true, force: true });
  });

  it('returns empty for empty input without calling the API', async () => {
    const outcome = await classifyPagesFiles([]);
    expect(outcome.classifications).toEqual([]);
    expect(outcome.usage).toBeNull();
    expect(createMessages).not.toHaveBeenCalled();
  });

  it('parses a well-formed JSON response from Haiku and records usage', async () => {
    createMessages.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            classifications: [
              { path: 'pages/index.tsx', kind: 'static-page' },
              { path: 'pages/api/hello.ts', kind: 'api-route' },
            ],
          }),
        },
      ],
      usage: STUB_USAGE,
    });

    const outcome = await classifyPagesFiles(
      [
        { path: 'pages/index.tsx', excerpt: 'export default function Home(){}' },
        { path: 'pages/api/hello.ts', excerpt: 'export default function handler(){}' },
      ],
      { logPath: join(logDir, 'usage.jsonl') },
    );

    expect(outcome.classifications).toEqual([
      { path: 'pages/index.tsx', kind: 'static-page' },
      { path: 'pages/api/hello.ts', kind: 'api-route' },
    ]);
    expect(outcome.usage).not.toBeNull();
    expect(outcome.usage?.inputTokens).toBe(1234);
    expect(outcome.usage?.outputTokens).toBe(56);
    expect(outcome.usage?.costUsd).toBeGreaterThan(0);
    expect(createMessages).toHaveBeenCalledOnce();
  });

  it('strips code fences before parsing', async () => {
    createMessages.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: '```json\n{"classifications":[{"path":"pages/_app.tsx","kind":"app"}]}\n```',
        },
      ],
      usage: STUB_USAGE,
    });

    const outcome = await classifyPagesFiles(
      [{ path: 'pages/_app.tsx', excerpt: 'export default function App(){}' }],
      { logPath: join(logDir, 'usage.jsonl') },
    );
    expect(outcome.classifications).toEqual([{ path: 'pages/_app.tsx', kind: 'app' }]);
  });

  it('throws when the response has no text block', async () => {
    createMessages.mockResolvedValueOnce({ content: [], usage: STUB_USAGE });
    await expect(
      classifyPagesFiles([{ path: 'pages/x.tsx', excerpt: '' }], {
        logPath: join(logDir, 'usage.jsonl'),
      }),
    ).rejects.toThrow(/no text block/);
  });
});
