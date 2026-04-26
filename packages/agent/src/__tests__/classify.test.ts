import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createMessages = vi.fn();

vi.mock('../clients/anthropic', () => ({
  getAnthropicClient: () => ({
    messages: { create: createMessages },
  }),
  resetAnthropicClient: () => {},
}));

import { classifyPagesFiles } from '../analyze/classify';

describe('classifyPagesFiles', () => {
  beforeEach(() => {
    createMessages.mockReset();
  });

  afterEach(() => {
    createMessages.mockReset();
  });

  it('returns empty for empty input without calling the API', async () => {
    const result = await classifyPagesFiles([]);
    expect(result).toEqual([]);
    expect(createMessages).not.toHaveBeenCalled();
  });

  it('parses a well-formed JSON response from Haiku', async () => {
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
    });

    const result = await classifyPagesFiles([
      { path: 'pages/index.tsx', excerpt: 'export default function Home(){}' },
      { path: 'pages/api/hello.ts', excerpt: 'export default function handler(){}' },
    ]);

    expect(result).toEqual([
      { path: 'pages/index.tsx', kind: 'static-page' },
      { path: 'pages/api/hello.ts', kind: 'api-route' },
    ]);
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
    });

    const result = await classifyPagesFiles([
      { path: 'pages/_app.tsx', excerpt: 'export default function App(){}' },
    ]);
    expect(result).toEqual([{ path: 'pages/_app.tsx', kind: 'app' }]);
  });

  it('throws when the response has no text block', async () => {
    createMessages.mockResolvedValueOnce({ content: [] });
    await expect(classifyPagesFiles([{ path: 'pages/x.tsx', excerpt: '' }])).rejects.toThrow(
      /no text block/,
    );
  });
});
