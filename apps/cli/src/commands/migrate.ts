import { cp, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  type AnalyzeOptions,
  analyze,
  type MigrateOptions,
  migrate,
  plan,
} from '@migrate-bot/agent';
import { getUsageLogPath } from '../paths';

interface ParsedMigrateArgs {
  readonly repoPath: string | undefined;
  readonly skipLlm: boolean;
  readonly json: boolean;
}

function parseMigrateArgs(args: readonly string[]): ParsedMigrateArgs {
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

export async function runMigrate(args: readonly string[]): Promise<number> {
  const { repoPath, skipLlm, json } = parseMigrateArgs(args);
  if (!repoPath) {
    process.stderr.write('Usage: migrate [--no-llm] [--json] <repo-path>\n');
    return 1;
  }

  const sourcePath = resolve(repoPath);
  const workingDir = await mkdtemp(join(tmpdir(), 'migrate-bot-work-'));
  await cp(sourcePath, workingDir, { recursive: true });

  const logPath = getUsageLogPath();
  const analyzeOptions: AnalyzeOptions = {
    ...(skipLlm ? { skipLlm: true } : {}),
    logPath,
  };
  const migrateOptions: MigrateOptions = {
    ...(skipLlm ? { skipLlm: true } : {}),
    logPath,
  };

  const analysis = await analyze({ localPath: workingDir, source: sourcePath }, analyzeOptions);
  const migrationPlan = await plan(analysis);
  const result = await migrate(
    { localPath: workingDir, source: sourcePath },
    migrationPlan,
    migrateOptions,
  );

  if (json) {
    process.stdout.write(
      `${JSON.stringify({ workingDir, analysis, plan: migrationPlan, result }, null, 2)}\n`,
    );
    return result.failedTaskIds.length > 0 ? 1 : 0;
  }

  const lines: string[] = [];
  lines.push(`[migrate-bot] migrate ${sourcePath}`);
  lines.push(`  working dir: ${workingDir}`);
  lines.push(`  next: ${analysis.nextVersion || '(not detected)'}`);
  lines.push(`  pages files: ${analysis.fileCount}`);
  lines.push(`  blockers: ${analysis.blockers.length}`);
  for (const b of analysis.blockers) {
    lines.push(`    - ${b.type}: ${b.evidence}`);
  }
  lines.push(`  tasks planned: ${migrationPlan.tasks.length}`);
  lines.push(`  files written: ${result.changes.length}`);
  for (const c of result.changes) {
    lines.push(`    [${c.kind}] ${c.path}`);
  }
  lines.push(`  failed tasks: ${result.failedTaskIds.length}`);
  for (const id of result.failedTaskIds) {
    lines.push(`    - ${id}`);
  }
  const analyzeCost = analysis.usage.costUsd;
  const migrateCost = result.usage.costUsd;
  lines.push(
    `  cost: analyze $${analyzeCost.toFixed(4)} + migrate $${migrateCost.toFixed(4)} = $${(
      analyzeCost + migrateCost
    ).toFixed(4)}`,
  );
  lines.push(`  next: review the migrated files at ${workingDir} and diff against the source`);
  lines.push('');
  process.stdout.write(lines.join('\n'));
  return result.failedTaskIds.length > 0 ? 1 : 0;
}
