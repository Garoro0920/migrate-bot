import { resolve } from 'node:path';
import { type AnalyzeOptions, analyze } from '@migrate-bot/agent';

interface ParsedAnalyzeArgs {
  readonly repoPath: string | undefined;
  readonly skipLlm: boolean;
  readonly json: boolean;
}

function parseAnalyzeArgs(args: readonly string[]): ParsedAnalyzeArgs {
  let repoPath: string | undefined;
  let skipLlm = false;
  let json = false;
  for (const arg of args) {
    if (arg === '--no-llm') {
      skipLlm = true;
    } else if (arg === '--json') {
      json = true;
    } else if (!arg.startsWith('--')) {
      repoPath = arg;
    }
  }
  return { repoPath, skipLlm, json };
}

export async function runAnalyze(args: readonly string[]): Promise<number> {
  const { repoPath, skipLlm, json } = parseAnalyzeArgs(args);
  if (!repoPath) {
    process.stderr.write('Usage: analyze [--no-llm] [--json] <repo-path>\n');
    return 1;
  }

  const localPath = resolve(repoPath);
  const options: AnalyzeOptions = skipLlm ? { skipLlm: true } : {};
  const result = await analyze({ localPath, source: localPath }, options);

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }

  const lines: string[] = [];
  lines.push(`[migrate-bot] analyze ${localPath}`);
  lines.push(`  next: ${result.nextVersion || '(not detected)'}`);
  lines.push(`  pages files: ${result.fileCount}`);
  lines.push(`  recommended plan: ${result.recommendedPlan}`);
  lines.push(`  blockers: ${result.blockers.length}`);
  for (const b of result.blockers) {
    lines.push(`    - ${b.type}: ${b.evidence}`);
  }
  if (skipLlm) {
    lines.push('  classifications: skipped (--no-llm)');
  } else {
    lines.push(`  classifications: ${result.classifications.length}`);
    for (const c of result.classifications) {
      lines.push(`    - ${c.path}: ${c.kind}`);
    }
  }
  lines.push(
    `  cost (this run): $${result.usage.costUsd.toFixed(4)} (${result.usage.callCount} call${result.usage.callCount === 1 ? '' : 's'})`,
  );
  lines.push('');
  process.stdout.write(lines.join('\n'));
  return 0;
}
