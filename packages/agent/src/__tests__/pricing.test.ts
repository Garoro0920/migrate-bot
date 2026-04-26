import { describe, expect, it } from 'vitest';
import {
  CACHE_READ_MULTIPLIER,
  CACHE_WRITE_MULTIPLIER,
  calculateCostUsd,
  MODEL_PRICING,
} from '../observability/pricing';

describe('calculateCostUsd', () => {
  it('computes cost from input + output tokens for Haiku', () => {
    const cost = calculateCostUsd('claude-haiku-4-5-20251001', {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    });
    const expected =
      MODEL_PRICING['claude-haiku-4-5-20251001'].inputPerMTok +
      MODEL_PRICING['claude-haiku-4-5-20251001'].outputPerMTok;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it('applies cache write multiplier of 1.25x to cache_creation tokens', () => {
    const cost = calculateCostUsd('claude-sonnet-4-6', {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 1_000_000,
      cacheReadInputTokens: 0,
    });
    const expected = MODEL_PRICING['claude-sonnet-4-6'].inputPerMTok * CACHE_WRITE_MULTIPLIER;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it('applies cache read multiplier of 0.1x to cache_read tokens', () => {
    const cost = calculateCostUsd('claude-sonnet-4-6', {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 1_000_000,
    });
    const expected = MODEL_PRICING['claude-sonnet-4-6'].inputPerMTok * CACHE_READ_MULTIPLIER;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it('throws for unknown model', () => {
    expect(() =>
      calculateCostUsd('claude-fictional-9-9', {
        inputTokens: 100,
        outputTokens: 100,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      }),
    ).toThrow(/Unknown model pricing/);
  });

  it('returns 0 for zero usage', () => {
    expect(
      calculateCostUsd('claude-haiku-4-5-20251001', {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      }),
    ).toBe(0);
  });
});
