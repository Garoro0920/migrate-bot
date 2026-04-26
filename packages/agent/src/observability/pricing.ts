export interface ModelPricing {
  readonly inputPerMTok: number;
  readonly outputPerMTok: number;
}

export const CACHE_WRITE_MULTIPLIER = 1.25;
export const CACHE_READ_MULTIPLIER = 0.1;

// 価格表 (USD per 1M tokens)。
// 検証日: 2026-04-26
// 出典: https://platform.claude.com/docs/en/about-claude/pricing
//   (https://www.anthropic.com/pricing から redirect、claude.com/pricing も同じ)
// 注: 値は変更されうるため、kill criteria 監視 (ADR-0002 §1.1) を信頼するには
// 月次で本テーブルの再検証を推奨する。Opus 4.7 は新トークナイザーを採用しており
// 同じ文字列でも従来比で最大 35% 多くトークンを消費する点に留意。
export const MODEL_PRICING = {
  'claude-haiku-4-5-20251001': { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  'claude-sonnet-4-6': { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'claude-opus-4-7': { inputPerMTok: 5.0, outputPerMTok: 25.0 },
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
