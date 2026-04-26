import {
  DEFAULT_LOG_PATH,
  KILL_CRITERIA,
  killCriteriaStatus,
  loadUsageHistory,
  summarize,
} from '@migrate-bot/agent';

export async function runStats(_args: readonly string[]): Promise<number> {
  const records = await loadUsageHistory(DEFAULT_LOG_PATH);
  const summary = summarize(records);
  const status = killCriteriaStatus(summary.totalCostUsd);

  const lines: string[] = [];
  lines.push('[migrate-bot] usage stats');
  lines.push(`  log: ${DEFAULT_LOG_PATH}`);
  lines.push(`  total calls: ${summary.totalCalls}`);
  lines.push(`  total cost: $${summary.totalCostUsd.toFixed(4)}`);
  lines.push(`  first call: ${summary.firstAt ?? '(none)'}`);
  lines.push(`  last call: ${summary.lastAt ?? '(none)'}`);
  if (summary.totalCalls > 0) {
    lines.push('  by model:');
    for (const [model, m] of Object.entries(summary.byModel)) {
      lines.push(`    ${model}: ${m.calls} calls, $${m.costUsd.toFixed(4)}`);
    }
  }
  lines.push('');
  lines.push('  ADR-0002 §1.1 kill criteria:');
  lines.push(
    `    evaluation ($${KILL_CRITERIA.evaluationUsd}): ${formatProgress(status.evaluationProgressPct, status.evaluationReached)}`,
  );
  lines.push(
    `    hard stop  ($${KILL_CRITERIA.hardStopUsd}): ${formatProgress(status.hardStopProgressPct, status.hardStopReached)}`,
  );
  lines.push('');

  process.stdout.write(lines.join('\n'));

  if (status.hardStopReached) {
    process.stderr.write(
      'warning: hard-stop threshold reached. Halt new API calls and review (ADR-0002 §1.1).\n',
    );
    return 2;
  }
  if (status.evaluationReached) {
    process.stderr.write(
      'warning: evaluation threshold reached. Pause for kill-criteria review (ADR-0002 §1.1).\n',
    );
    return 1;
  }
  return 0;
}

function formatProgress(pct: number, reached: boolean): string {
  const clamped = Math.max(0, pct);
  const label = reached ? 'REACHED' : `${clamped.toFixed(1)}% used`;
  return label;
}
