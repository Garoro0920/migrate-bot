// 開発・運用補助コマンド。本番 Worker (apps/api) の /admin/trigger 経由で
// 移行ジョブを起動する。Phase 4 ベータ顧客 (Stripe Live activation 前) を
// operator が手動で投入する用途を想定。
//
// 使用例:
//   MIGRATE_BOT_API_URL=https://migrate-bot-api-dev.example.workers.dev \
//   MIGRATE_BOT_API_TOKEN=<INTERNAL_API_TOKEN> \
//   pnpm cli admin-trigger 127730344 octocat/hello --plan small --json

interface ParsedAdminArgs {
  readonly installationId: string | undefined;
  readonly repo: string | undefined;
  readonly plan: 'small' | 'medium' | 'large' | 'enterprise';
  readonly json: boolean;
  readonly dryRun: boolean;
}

const PLANS = ['small', 'medium', 'large', 'enterprise'] as const;

function parseArgs(args: readonly string[]): ParsedAdminArgs {
  let installationId: string | undefined;
  let repo: string | undefined;
  let plan: ParsedAdminArgs['plan'] = 'small';
  let json = false;
  let dryRun = false;

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
    } else if (a === '--dry-run') {
      dryRun = true;
    } else if (!a?.startsWith('--')) {
      if (installationId === undefined) installationId = a;
      else if (repo === undefined) repo = a;
    }
  }
  return { installationId, repo, plan, json, dryRun };
}

interface TriggerResponse {
  readonly ok: boolean;
  readonly jobId: string;
  readonly traceId: string;
  readonly installationId: string;
  readonly installation?: { readonly created: boolean; readonly githubId: number };
}

export interface RunAdminTriggerDeps {
  readonly fetch?: typeof fetch;
  readonly env?: Record<string, string | undefined>;
}

export async function runAdminTrigger(
  args: readonly string[],
  deps: RunAdminTriggerDeps = {},
): Promise<number> {
  const fetchFn = deps.fetch ?? fetch;
  const env = deps.env ?? process.env;
  const parsed = parseArgs(args);
  if (!parsed.installationId || !parsed.repo) {
    process.stderr.write(
      'Usage: admin-trigger [--plan small|medium|large|enterprise] [--json] [--dry-run] <installationId> <owner/repo>\n',
    );
    process.stderr.write(
      '  --dry-run: 入力値の表示と検証のみ。/admin/trigger を呼ばず job 作成しない。\n',
    );
    process.stderr.write('  Required env: MIGRATE_BOT_API_URL, MIGRATE_BOT_API_TOKEN\n');
    return 1;
  }

  const apiUrl = env.MIGRATE_BOT_API_URL?.replace(/\/$/, '');
  const apiToken = env.MIGRATE_BOT_API_TOKEN;
  if (!apiUrl) {
    process.stderr.write('MIGRATE_BOT_API_URL env var is required\n');
    return 1;
  }
  if (!apiToken) {
    process.stderr.write('MIGRATE_BOT_API_TOKEN env var is required\n');
    return 1;
  }

  const installationId = Number.parseInt(parsed.installationId, 10);
  if (Number.isNaN(installationId)) {
    process.stderr.write(`installationId must be a number, got: ${parsed.installationId}\n`);
    return 1;
  }
  const slashIdx = parsed.repo.indexOf('/');
  if (slashIdx <= 0 || slashIdx === parsed.repo.length - 1) {
    process.stderr.write(`repo must be in 'owner/repo' format, got: ${parsed.repo}\n`);
    return 1;
  }
  const accountLogin = parsed.repo.slice(0, slashIdx);

  // --dry-run: ここまでの parse + validate に成功したら「もし送信したら何が起きるか」
  // を出力して終了。誤った installationId / repo / plan を本番投入する事故を防ぐ。
  if (parsed.dryRun) {
    const planSummary = {
      method: 'POST',
      url: `${apiUrl}/admin/trigger`,
      headers: {
        authorization: `Bearer ${apiToken.slice(0, 6)}…(truncated)`,
        'content-type': 'application/json',
      },
      body: {
        githubInstallationId: installationId,
        accountLogin,
        repoFullName: parsed.repo,
        plan: parsed.plan,
      },
    };
    if (parsed.json) {
      process.stdout.write(`${JSON.stringify({ dryRun: true, request: planSummary }, null, 2)}\n`);
    } else {
      process.stdout.write(
        [
          '[migrate-bot] admin-trigger --dry-run (no request sent)',
          `  POST ${planSummary.url}`,
          `  installationId: ${installationId}`,
          `  accountLogin:   ${accountLogin}`,
          `  repo:           ${parsed.repo}`,
          `  plan:           ${parsed.plan}`,
          '  body (JSON):',
          `    ${JSON.stringify(planSummary.body)}`,
          '',
          '  To actually trigger, re-run without --dry-run.',
          '',
        ].join('\n'),
      );
    }
    return 0;
  }

  let response: Response;
  try {
    response = await fetchFn(`${apiUrl}/admin/trigger`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        githubInstallationId: installationId,
        accountLogin,
        repoFullName: parsed.repo,
        plan: parsed.plan,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`network error calling ${apiUrl}/admin/trigger: ${msg}\n`);
    return 2;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    process.stderr.write(`admin/trigger returned ${response.status}: ${body.slice(0, 500)}\n`);
    return response.status === 401 ? 1 : 2;
  }

  const result = (await response.json()) as TriggerResponse;
  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    const lines = [
      '[migrate-bot] admin-trigger',
      `  jobId:          ${result.jobId}`,
      `  traceId:        ${result.traceId}`,
      `  installationId: ${result.installationId}`,
      `  repo:           ${parsed.repo}`,
      `  plan:           ${parsed.plan}`,
      `  state:          queued (now in Cloudflare Queue, runner will pick up)`,
      '',
    ];
    process.stdout.write(lines.join('\n'));
  }
  return 0;
}
