import { resolve } from 'node:path';
import { type AnalyzeOptions, analyze, plan } from '@migrate-bot/agent';
import { getUsageLogPath } from '../paths';

interface ParsedPlanArgs {
  readonly repoPath: string | undefined;
  readonly skipLlm: boolean;
  readonly json: boolean;
}

function parsePlanArgs(args: readonly string[]): ParsedPlanArgs {
  let repoPath: string | undefined;
  let skipLlm = false;
  let json = false;
  for (const arg of args) {
    if (arg === '--no-llm') skipLlm = true;
    else if (arg === '--json') json = true;
    else if (!arg.startsWith('--')) repoPath = arg;
  }
  return { repoPath, skipLlm, json };
}

export async function runPlan(args: readonly string[]): Promise<number> {
  const { repoPath, skipLlm, json } = parsePlanArgs(args);
  if (!repoPath) {
    process.stderr.write('Usage: plan [--no-llm] [--json] <repo-path>\n');
    return 1;
  }

  const localPath = resolve(repoPath);
  const analyzeOptions: AnalyzeOptions = {
    ...(skipLlm ? { skipLlm: true } : {}),
    logPath: getUsageLogPath(),
  };
  const analysis = await analyze({ localPath, source: localPath }, analyzeOptions);
  const migrationPlan = await plan(analysis);

  if (json) {
    process.stdout.write(`${JSON.stringify({ analysis, plan: migrationPlan }, null, 2)}\n`);
    return 0;
  }

  const lines: string[] = [];
  lines.push(`[migrate-bot] plan ${localPath}`);
  lines.push(`  next: ${analysis.nextVersion || '(not detected)'}`);
  lines.push(`  pages files: ${analysis.fileCount}`);
  lines.push(`  recommended plan: ${analysis.recommendedPlan}`);
  lines.push(`  blockers: ${analysis.blockers.length}`);
  for (const b of analysis.blockers) {
    lines.push(`    - ${b.type}: ${b.evidence}`);
  }
  lines.push(`  tasks: ${migrationPlan.tasks.length}`);
  for (const t of migrationPlan.tasks) {
    const deps = t.dependsOn.length > 0 ? ` ← ${t.dependsOn.join(', ')}` : '';
    lines.push(`    [${t.kind}] ${t.id}${deps}`);
    lines.push(`           ${t.description}`);
  }
  lines.push(
    `  cost (this run): $${analysis.usage.costUsd.toFixed(4)} (${analysis.usage.callCount} call${analysis.usage.callCount === 1 ? '' : 's'})`,
  );
  lines.push('');
  process.stdout.write(lines.join('\n'));
  return 0;
}
