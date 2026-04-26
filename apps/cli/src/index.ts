import { runMigrate } from './commands/migrate';

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
      'migrate-bot CLI (Phase 1 skeleton)',
      '',
      'Usage:',
      '  migrate <repo-url>     Run the migration pipeline against a Next.js repository',
      '  help                   Show this help',
      '',
      'Examples:',
      '  pnpm --filter @migrate-bot/cli migrate https://github.com/vercel/next.js',
      '',
    ].join('\n'),
  );
}

async function main(): Promise<number> {
  const { command, args } = parseCli(process.argv);

  switch (command) {
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
