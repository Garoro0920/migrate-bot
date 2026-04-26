import { runAnalyze } from './commands/analyze';
import { runMigrate } from './commands/migrate';
import { runPlan } from './commands/plan';
import { runStats } from './commands/stats';
import { runVerify } from './commands/verify';
import { loadDotenv } from './env';
import { getDotenvPath } from './paths';

loadDotenv(getDotenvPath());

interface ParsedArgs {
  readonly command: string;
  readonly args: readonly string[];
}

function parseCli(argv: readonly string[]): ParsedArgs {
  const positionals = argv.slice(2);
  const command = positionals[0] ?? 'help';
  const args = positionals.slice(1);
  return { command, args };
}

function printHelp(): void {
  process.stdout.write(
    [
      'migrate-bot CLI (Phase 1)',
      '',
      'Commands:',
      '  analyze [--no-llm] [--json] <repo-path>   Run the Analyze stage on a local repo',
      '  plan [--no-llm] [--json] <repo-path>      Run Analyze + Plan and print the migration task list',
      '  migrate [--no-llm] [--json] <repo-path>   Run the full Analyze + Plan + Migrate pipeline',
      '  verify [--skip-*] [--json] <repo-path>    Run pnpm install + tsc --noEmit + next build',
      '  stats                                      Show cumulative API usage and ADR-0002 kill criteria',
      '  help                                       Show this help',
      '',
      'Notes:',
      '  - .env.local at the project root is auto-loaded; ANTHROPIC_API_KEY is read from there',
      '  - Usage log is written to <project-root>/.migrate-bot/usage.jsonl',
      '',
    ].join('\n'),
  );
}

async function main(): Promise<number> {
  const { command, args } = parseCli(process.argv);

  switch (command) {
    case 'analyze':
      return runAnalyze(args);
    case 'plan':
      return runPlan(args);
    case 'migrate':
      return runMigrate(args);
    case 'verify':
      return runVerify(args);
    case 'stats':
      return runStats(args);
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      return 0;
    default:
      process.stderr.write(`unknown command: ${command}\n`);
      printHelp();
      return 1;
  }
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    process.stderr.write(`${String(err)}\n`);
    process.exit(1);
  },
);
