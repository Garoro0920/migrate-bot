export interface ModelPricing {
  readonly inputPerMTok: number;
  readonly outputPerMTok: number;
}

export const CACHE_WRITE_MULTIPLIER = 1.25;
export const CACHE_READ_MULTIPLIER = 0.1;

// 暫定価格表 (USD per 1M tokens)。実装時の最新値を https://www.anthropic.com/pricing で確認すること
// (憲章 §4.2)。値が古いと ADR-0002 §1.1 のコスト監視が不正確になる。
export const MODEL_PRICING = {
  'claude-haiku-4-5-20251001': { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  'claude-sonnet-4-6': { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'claude-opus-4-7': { inputPerMTok: 15.0, outputPerMTok: 75.0 },
} as const satisfies Record<string, ModelPricing>;

export type KnownModel = keyof typeof MODEL_PRICING;

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
}

export function calculateCostUsd(model: string, usage: TokenUsage): number {
  const pricing: ModelPricing | undefined = (MODEL_PRICING as Record<string, ModelPricing>)[model];
  if (!pricing) {
    throw new Error(
      `Unknown model pricing: ${model}. Add an entry to MODEL_PRICING in src/observability/pricing.ts.`,
    );
  }
  const million = 1_000_000;
  const inputCost = (usage.inputTokens / million) * pricing.inputPerMTok;
  const cacheWriteCost =
    (usage.cacheCreationInputTokens / million) * pricing.inputPerMTok * CACHE_WRITE_MULTIPLIER;
  const cacheReadCost =
    (usage.cacheReadInputTokens / million) * pricing.inputPerMTok * CACHE_READ_MULTIPLIER;
  const outputCost = (usage.outputTokens / million) * pricing.outputPerMTok;
  return inputCost + cacheWriteCost + cacheReadCost + outputCost;
}
