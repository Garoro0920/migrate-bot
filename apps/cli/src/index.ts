import { runAnalyze } from './commands/analyze';
import { runMigrate } from './commands/migrate';
import { runStats } from './commands/stats';

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
      '  stats                                      Show cumulative API usage and ADR-0002 kill criteria',
      '  migrate <repo-url>                         Run the migration pipeline (skeleton)',
      '  help                                       Show this help',
      '',
      'Examples:',
      '  pnpm --filter @migrate-bot/cli exec tsx src/index.ts analyze --no-llm <repo-path>',
      '  ANTHROPIC_API_KEY=sk-... pnpm --filter @migrate-bot/cli exec tsx src/index.ts analyze <repo-path>',
      '  pnpm --filter @migrate-bot/cli exec tsx src/index.ts stats',
      '',
    ].join('\n'),
  );
}

async function main(): Promise<number> {
  const { command, args } = parseCli(process.argv);

  switch (command) {
    case 'analyze':
      return runAnalyze(args);
    case 'stats':
      return runStats(args);
    case 'migrate':
      return runMigrate(args);
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
