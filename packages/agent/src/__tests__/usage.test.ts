import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  KILL_CRITERIA,
  killCriteriaStatus,
  loadUsageHistory,
  recordUsage,
  summarize,
  type UsageRecord,
} from '../observability/usage';

describe('recordUsage + loadUsageHistory roundtrip', () => {
  let logDir: string;
  let logPath: string;

  beforeEach(async () => {
    logDir = await mkdtemp(join(tmpdir(), 'usage-test-'));
    logPath = join(logDir, 'usage.jsonl');
  });

  afterEach(async () => {
    await rm(logDir, { recursive: true, force: true });
  });

  it('appends a record and reads it back', async () => {
    await recordUsage({
      model: 'claude-haiku-4-5-20251001',
      stage: 'analyze.classify',
      usage: {
        inputTokens: 1000,
        outputTokens: 200,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      logPath,
      now: () => new Date('2026-04-26T00:00:00.000Z'),
    });

    const history = await loadUsageHistory(logPath);
    expect(history).toHaveLength(1);
    expect(history[0]?.model).toBe('claude-haiku-4-5-20251001');
    expect(history[0]?.inputTokens).toBe(1000);
    expect(history[0]?.costUsd).toBeGreaterThan(0);
    expect(history[0]?.timestamp).toBe('2026-04-26T00:00:00.000Z');
  });

  it('appends multiple records in order', async () => {
    for (let i = 0; i < 3; i++) {
      await recordUsage({
        model: 'claude-haiku-4-5-20251001',
        stage: 'analyze.classify',
        usage: {
          inputTokens: 100 * (i + 1),
          outputTokens: 50,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
        },
        logPath,
      });
    }
    const history = await loadUsageHistory(logPath);
    expect(history).toHaveLength(3);
    expect(history.map((r) => r.inputTokens)).toEqual([100, 200, 300]);
  });

  it('returns empty array when log file does not exist', async () => {
    const history = await loadUsageHistory(join(logDir, 'nonexistent.jsonl'));
    expect(history).toEqual([]);
  });
});

describe('summarize', () => {
  it('aggregates totals and per-model breakdown', () => {
    const records: UsageRecord[] = [
      {
        timestamp: '2026-04-26T00:00:00.000Z',
        model: 'claude-haiku-4-5-20251001',
        stage: 'analyze.classify',
        inputTokens: 1000,
        outputTokens: 100,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        costUsd: 0.0015,
      },
      {
        timestamp: '2026-04-27T00:00:00.000Z',
        model: 'claude-sonnet-4-6',
        stage: 'migrate',
        inputTokens: 5000,
        outputTokens: 800,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        costUsd: 0.027,
      },
      {
        timestamp: '2026-04-28T00:00:00.000Z',
        model: 'claude-haiku-4-5-20251001',
        stage: 'analyze.classify',
        inputTokens: 2000,
        outputTokens: 200,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        costUsd: 0.003,
      },
    ];

    const summary = summarize(records);
    expect(summary.totalCalls).toBe(3);
    expect(summary.totalCostUsd).toBeCloseTo(0.0015 + 0.027 + 0.003, 6);
    expect(summary.byModel['claude-haiku-4-5-20251001']?.calls).toBe(2);
    expect(summary.byModel['claude-sonnet-4-6']?.calls).toBe(1);
    expect(summary.firstAt).toBe('2026-04-26T00:00:00.000Z');
    expect(summary.lastAt).toBe('2026-04-28T00:00:00.000Z');
  });

  it('returns zeros for empty input', () => {
    const summary = summarize([]);
    expect(summary.totalCalls).toBe(0);
    expect(summary.totalCostUsd).toBe(0);
    expect(summary.firstAt).toBeNull();
    expect(summary.lastAt).toBeNull();
  });
});

describe('killCriteriaStatus', () => {
  it('reports both thresholds unmet at $0', () => {
    const s = killCriteriaStatus(0);
    expect(s.evaluationReached).toBe(false);
    expect(s.hardStopReached).toBe(false);
    expect(s.evaluationProgressPct).toBe(0);
    expect(s.hardStopProgressPct).toBe(0);
  });

  it('reports evaluation threshold at $30 exactly', () => {
    const s = killCriteriaStatus(KILL_CRITERIA.evaluationUsd);
    expect(s.evaluationReached).toBe(true);
    expect(s.hardStopReached).toBe(false);
    expect(s.evaluationProgressPct).toBe(100);
  });

  it('reports hard stop at $80 exactly', () => {
    const s = killCriteriaStatus(KILL_CRITERIA.hardStopUsd);
    expect(s.evaluationReached).toBe(true);
    expect(s.hardStopReached).toBe(true);
    expect(s.hardStopProgressPct).toBe(100);
  });

  it('reports proportional progress for partial spend', () => {
    const s = killCriteriaStatus(15);
    expect(s.evaluationReached).toBe(false);
    expect(s.evaluationProgressPct).toBe(50);
  });
});
