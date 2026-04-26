import Anthropic from '@anthropic-ai/sdk';

let cached: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Provide it via environment or .env.local');
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

export function resetAnthropicClient(): void {
  cached = undefined;
}
