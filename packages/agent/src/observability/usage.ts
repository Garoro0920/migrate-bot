import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { calculateCostUsd, type TokenUsage } from './pricing';

export const DEFAULT_LOG_PATH = '.migrate-bot/usage.jsonl';

export interface UsageRecord {
  readonly timestamp: string;
  readonly model: string;
  readonly stage: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly costUsd: number;
}

export interface RecordUsageInput {
  readonly model: string;
  readonly stage: string;
  readonly usage: TokenUsage;
  readonly logPath?: string;
  readonly now?: () => Date;
}

export async function recordUsage(input: RecordUsageInput): Promise<UsageRecord> {
  const now = input.now ?? (() => new Date());
  const record: UsageRecord = {
    timestamp: now().toISOString(),
    model: input.model,
    stage: input.stage,
    inputTokens: input.usage.inputTokens,
    outputTokens: input.usage.outputTokens,
    cacheCreationInputTokens: input.usage.cacheCreationInputTokens,
    cacheReadInputTokens: input.usage.cacheReadInputTokens,
    costUsd: calculateCostUsd(input.model, input.usage),
  };
  const logPath = input.logPath ?? DEFAULT_LOG_PATH;
  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(record)}\n`, 'utf-8');
  return record;
}

export async function loadUsageHistory(
  logPath: string = DEFAULT_LOG_PATH,
): Promise<readonly UsageRecord[]> {
  let text: string;
  try {
    text = await readFile(logPath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
  const records: UsageRecord[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    records.push(JSON.parse(trimmed) as UsageRecord);
  }
  return records;
}

export interface ModelBreakdown {
  readonly calls: number;
  readonly costUsd: number;
}

export interface UsageSummary {
  readonly totalCostUsd: number;
  readonly totalCalls: number;
  readonly byModel: Readonly<Record<string, ModelBreakdown>>;
  readonly firstAt: string | null;
  readonly lastAt: string | null;
}

export function summarize(records: readonly UsageRecord[]): UsageSummary {
  const byModel: Record<string, ModelBreakdown> = {};
  let totalCost = 0;
  let firstAt: string | null = null;
  let lastAt: string | null = null;
  for (const r of records) {
    totalCost += r.costUsd;
    const cur = byModel[r.model] ?? { calls: 0, costUsd: 0 };
    byModel[r.model] = { calls: cur.calls + 1, costUsd: cur.costUsd + r.costUsd };
    if (firstAt === null || r.timestamp < firstAt) firstAt = r.timestamp;
    if (lastAt === null || r.timestamp > lastAt) lastAt = r.timestamp;
  }
  return {
    totalCostUsd: totalCost,
    totalCalls: records.length,
    byModel,
    firstAt,
    lastAt,
  };
}

// ADR-0002 §1.1 のしきい値
export const KILL_CRITERIA = {
  evaluationUsd: 30,
  hardStopUsd: 80,
} as const;

export interface KillCriteriaStatus {
  readonly evaluationReached: boolean;
  readonly hardStopReached: boolean;
  readonly evaluationProgressPct: number;
  readonly hardStopProgressPct: number;
}

export function killCriteriaStatus(totalCostUsd: number): KillCriteriaStatus {
  return {
    evaluationReached: totalCostUsd >= KILL_CRITERIA.evaluationUsd,
    hardStopReached: totalCostUsd >= KILL_CRITERIA.hardStopUsd,
    evaluationProgressPct: (totalCostUsd / KILL_CRITERIA.evaluationUsd) * 100,
    hardStopProgressPct: (totalCostUsd / KILL_CRITERIA.hardStopUsd) * 100,
  };
}
