import {
  InMemoryQueue,
  type JobQueueMessage,
  type JobState,
  newJobId,
  newTraceId,
  type QueueProducer,
} from '@migrate-bot/shared';

// 開発・運用補助コマンド。本番デプロイ後は wrangler/fly の Web ダッシュボード
// から jobId をデバッグするのに使う想定。
//
// 現状 (Phase 2b): InMemoryQueue を使い、構造を確認するだけの dry-run。
// Phase 2 後半で D1 への INSERT + Cloudflare Queues 投入に置き換える。

interface ParsedAdminArgs {
  readonly installationId: string | undefined;
  readonly repo: string | undefined;
  readonly plan: 'small' | 'medium' | 'large' | 'enterprise';
  readonly json: boolean;
}

const PLANS = ['small', 'medium', 'large', 'enterprise'] as const;

function parseArgs(args: readonly string[]): ParsedAnswer {
  let installationId: string | undefined;
  let repo: string | undefined;
  let plan: ParsedAdminArgs['plan'] = 'small';
  let json = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--plan') {
      const next = args[i + 1];
      if (next && (PLANS as readonly string[]).includes(next)) {
        plan = next as ParsedAdminArgs['plan'];
      }
      i += 1;
    } else if (a === '--json') {
      json = true;
    } else if (!a?.startsWith('--')) {
      if (installationId === undefined) installationId = a;
      else if (repo === undefined) repo = a;
    }
  }
  return { installationId, repo, plan, json };
}

type ParsedAnswer = ParsedAdminArgs;

export interface RunAdminTriggerDeps {
  readonly queue: QueueProducer<JobQueueMessage>;
}

export async function runAdminTrigger(
  args: readonly string[],
  deps: RunAdminTriggerDeps = { queue: new InMemoryQueue<JobQueueMessage>() },
): Promise<number> {
  const parsed = parseArgs(args);
  if (!parsed.installationId || !parsed.repo) {
    process.stderr.write(
      'Usage: admin-trigger [--plan small|medium|large|enterprise] [--json] <installationId> <owner/repo>\n',
    );
    return 1;
  }

  const installationId = Number.parseInt(parsed.installationId, 10);
  if (Number.isNaN(installationId)) {
    process.stderr.write(`installationId must be a number, got: ${parsed.installationId}\n`);
    return 1;
  }

  const jobId = newJobId();
  const traceId = newTraceId();

  await deps.queue.send({
    jobId,
    installationId,
    traceId,
  });

  const result = {
    jobId,
    traceId,
    installationId,
    repo: parsed.repo,
    plan: parsed.plan,
    state: 'queued' satisfies JobState,
    note: 'Phase 2b: in-memory queue only. Production wiring (D1 + Cloudflare Queues) is Phase 2 後半.',
  };

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    const lines = [
      '[migrate-bot] admin-trigger (dry-run)',
      `  jobId:          ${result.jobId}`,
      `  traceId:        ${result.traceId}`,
      `  installationId: ${result.installationId}`,
      `  repo:           ${result.repo}`,
      `  plan:           ${result.plan}`,
      `  state:          ${result.state}`,
      `  note: ${result.note}`,
      '',
    ];
    process.stdout.write(lines.join('\n'));
  }
  return 0;
}
