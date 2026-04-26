import { resolve } from 'node:path';
import { type VerifyOptions, verify } from '@migrate-bot/agent';

interface ParsedVerifyArgs {
  readonly repoPath: string | undefined;
  readonly skipInstall: boolean;
  readonly skipTypecheck: boolean;
  readonly skipBuild: boolean;
  readonly json: boolean;
}

function parseVerifyArgs(args: readonly string[]): ParsedVerifyArgs {
  let repoPath: string | undefined;
  let skipInstall = false;
  let skipTypecheck = false;
  let skipBuild = false;
  let json = false;
  for (const arg of args) {
    if (arg === '--skip-install') skipInstall = true;
    else if (arg === '--skip-typecheck') skipTypecheck = true;
    else if (arg === '--skip-build') skipBuild = true;
    else if (arg === '--json') json = true;
    else if (!arg.startsWith('--')) repoPath = arg;
  }
  return { repoPath, skipInstall, skipTypecheck, skipBuild, json };
}

export async function runVerify(args: readonly string[]): Promise<number> {
  const parsed = parseVerifyArgs(args);
  if (!parsed.repoPath) {
    process.stderr.write(
      'Usage: verify [--skip-install] [--skip-typecheck] [--skip-build] [--json] <repo-path>\n',
    );
    return 1;
  }

  const localPath = resolve(parsed.repoPath);
  const options: VerifyOptions = {
    ...(parsed.skipInstall ? { skipInstall: true } : {}),
    ...(parsed.skipTypecheck ? { skipTypecheck: true } : {}),
    ...(parsed.skipBuild ? { skipBuild: true } : {}),
  };

  const result = await verify({ localPath, source: localPath }, options);

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.failures.length > 0 ? 1 : 0;
  }

  const lines: string[] = [];
  lines.push(`[migrate-bot] verify ${localPath}`);
  lines.push(
    `  typecheck: ${parsed.skipTypecheck ? 'skipped' : statusLabel(result.typecheckPassed)}`,
  );
  lines.push(`  build: ${parsed.skipBuild ? 'skipped' : statusLabel(result.buildPassed)}`);
  lines.push('  tests: skipped (not implemented in Phase 1)');
  lines.push(`  failures: ${result.failures.length}`);
  for (const f of result.failures) {
    lines.push(`    - ${f.split('\n').join('\n      ')}`);
  }
  lines.push('');
  process.stdout.write(lines.join('\n'));
  return result.failures.length > 0 ? 1 : 0;
}

function statusLabel(passed: boolean): string {
  return passed ? 'pass' : 'fail';
}
