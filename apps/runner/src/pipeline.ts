import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  type AnalyzeResult,
  analyze,
  type ClonedRepo,
  cloneRepo,
  type MigrateResult,
  type MigrationPlan,
  migrate,
  plan,
  verify,
} from '@migrate-bot/agent';
import { newJobId } from '@migrate-bot/shared';
import { createDraftPR, type InstallationOctokitFactory } from './github';
import type { PipelineRunner, PipelineUsage } from './runner';

const execFileAsync = promisify(execFile);

// R3: git サブプロセスのタイムアウト。
// config / diff / add / commit / checkout は本来一瞬だが、ファイルシステム障害や
// hang 検出の保険として 90 秒で強制終了。
// push はネットワーク + サーバ side hook で長くなりうるので 5 分。
const GIT_LOCAL_TIMEOUT_MS = 90 * 1000;
const GIT_PUSH_TIMEOUT_MS = 5 * 60 * 1000;

// 本番 PipelineRunner 実装。Phase 1 で作った @migrate-bot/agent を呼び、
// git push + Octokit createDraftPR で draft PR まで仕上げる。
//
// stage 間の状態 (workDir / analyze 結果 / plan 等) を closure で持つ。
// runJob 1 回 = 1 インスタンス前提 (再利用しない)。

export interface RealPipelineDeps {
  readonly installationId: number;
  readonly factory: InstallationOctokitFactory;
  readonly defaultBranch?: string;
  readonly commitAuthorName?: string;
  readonly commitAuthorEmail?: string;
  readonly exec?: typeof execFileAsync;
  readonly clone?: typeof cloneRepo;
  readonly runAnalyze?: typeof analyze;
  readonly runPlan?: typeof plan;
  readonly runMigrate?: typeof migrate;
  readonly runVerify?: typeof verify;
}

export function createRealPipeline(deps: RealPipelineDeps): PipelineRunner {
  const exec = deps.exec ?? execFileAsync;
  const cloneFn = deps.clone ?? cloneRepo;
  const analyzeFn = deps.runAnalyze ?? analyze;
  const planFn = deps.runPlan ?? plan;
  const migrateFn = deps.runMigrate ?? migrate;
  const verifyFn = deps.runVerify ?? verify;
  const authorName = deps.commitAuthorName ?? 'migrate-bot';
  const authorEmail = deps.commitAuthorEmail ?? 'migrate-bot@users.noreply.github.com';
  const baseBranch = deps.defaultBranch ?? 'main';
  const branchName = `migrate-bot/app-router-${newJobId().slice(0, 8)}`;

  let cloned: ClonedRepo | null = null;
  let analysis: AnalyzeResult | null = null;
  let migrationPlan: MigrationPlan | null = null;
  let migrateOutcome: MigrateResult | null = null;
  let repoFullName = '';

  return {
    async analyze(rfn) {
      repoFullName = rfn;
      const token = await deps.factory.getInstallationToken(deps.installationId);
      const url = `https://x-access-token:${token}@github.com/${rfn}.git`;
      cloned = await cloneFn({ url });
      analysis = await analyzeFn({ localPath: cloned.localPath, source: rfn });
      if (analysis.blockers.length > 0) {
        const reasons = analysis.blockers.map((b) => `${b.type}: ${b.evidence}`).join('; ');
        throw new Error(`blockers detected: ${reasons}`);
      }
      return { usage: toPipelineUsage(analysis.usage) };
    },

    async plan() {
      if (!analysis) throw new Error('plan: analyze must run first');
      migrationPlan = await planFn(analysis);
    },

    async migrate() {
      if (!cloned || !migrationPlan) throw new Error('migrate: plan must run first');
      migrateOutcome = await migrateFn(
        { localPath: cloned.localPath, source: repoFullName },
        migrationPlan,
      );
      if (migrateOutcome.failedTaskIds.length > 0) {
        throw new Error(
          `migrate had ${migrateOutcome.failedTaskIds.length} failed task(s): ${migrateOutcome.failedTaskIds.join(', ')}`,
        );
      }
      return { usage: toPipelineUsage(migrateOutcome.usage) };
    },

    async verify() {
      if (!cloned) throw new Error('verify: workDir not ready');
      const result = await verifyFn({ localPath: cloned.localPath, source: repoFullName });
      if (!result.typecheckPassed) {
        throw new Error(`typecheck failed: ${result.failures.join('; ')}`);
      }
      if (!result.buildPassed) {
        throw new Error(`build failed: ${result.failures.join('; ')}`);
      }
    },

    async createPR(job) {
      if (!cloned) throw new Error('createPR: workDir not ready');
      const cwd = cloned.localPath;
      const { owner, repo } = splitRepoFullName(job.repoFullName);

      // shell: true は使わない。bash が引数を再 split して commit message が
      // pathspec 扱いされる事故が発生する (E2E で確認済)。Fly.io の Linux 環境では
      // git は PATH 上にあるので execFile から直接呼べる。

      // git config (per-repo only — global を汚さない)
      const localOpts = { cwd, timeout: GIT_LOCAL_TIMEOUT_MS, killSignal: 'SIGKILL' as const };
      await exec('git', ['config', 'user.email', authorEmail], localOpts);
      await exec('git', ['config', 'user.name', authorName], localOpts);

      // 変更があるかチェック (diff があれば commit、無ければ skip)
      try {
        await exec('git', ['diff', '--quiet'], localOpts);
        // diff なし
      } catch {
        // diff あり → add + commit
        await exec('git', ['add', '-A'], localOpts);
        await exec(
          'git',
          ['commit', '-m', '[migrate-bot] migrate Pages Router -> App Router'],
          localOpts,
        );
      }

      // branch 作成 + push
      await exec('git', ['checkout', '-b', branchName], localOpts);
      const token = await deps.factory.getInstallationToken(deps.installationId);
      const remoteUrl = `https://x-access-token:${token}@github.com/${job.repoFullName}.git`;
      await exec('git', ['push', remoteUrl, branchName], {
        cwd,
        timeout: GIT_PUSH_TIMEOUT_MS,
        killSignal: 'SIGKILL',
      });

      const pr = await createDraftPR({
        factory: deps.factory,
        installationId: deps.installationId,
        owner,
        repo,
        head: branchName,
        base: baseBranch,
        title: '[migrate-bot] Pages Router → App Router migration',
        body: buildPrBody(analysis, migrateOutcome, migrationPlan),
      });

      // R4: tmp dir の解放は runJob の finally から pipeline.cleanup() 経由で行う。
      // ここで明示的に呼ぶと finally と二重実行になるが、cleanup 側が idempotent
      // なので致命的ではない。あえて呼ばないことで「成功・例外いずれの経路でも
      // cleanup は finally のみ」というルールを単純化する。

      return { prUrl: pr.html_url };
    },

    async cleanup() {
      // R4: idempotent。複数回呼ばれても安全 (cloned.cleanup は rm -rf force)。
      // analyze 前に呼ばれた場合は cloned が null なので no-op。
      if (cloned) {
        const target = cloned;
        cloned = null;
        await target.cleanup();
      }
    },
  };
}

function toPipelineUsage(usage: {
  costUsd: number;
  tokensInput: number;
  tokensOutput: number;
}): PipelineUsage {
  return {
    costUsd: usage.costUsd,
    tokensInput: usage.tokensInput,
    tokensOutput: usage.tokensOutput,
  };
}

function splitRepoFullName(rfn: string): { owner: string; repo: string } {
  const idx = rfn.indexOf('/');
  if (idx <= 0 || idx === rfn.length - 1) {
    throw new Error(`invalid repoFullName: ${rfn}`);
  }
  return { owner: rfn.slice(0, idx), repo: rfn.slice(idx + 1) };
}

function buildPrBody(
  analysis: AnalyzeResult | null,
  migrateOutcome: MigrateResult | null,
  migrationPlan: MigrationPlan | null,
): string {
  const lines: string[] = [];
  lines.push('Auto-generated migration by migrate-bot.');
  lines.push('');
  if (analysis) {
    lines.push(`- pages files: ${analysis.fileCount}`);
    lines.push(`- recommended plan: ${analysis.recommendedPlan}`);
    lines.push(`- blockers: ${analysis.blockers.length}`);
  }
  if (migrateOutcome) {
    const adds = migrateOutcome.changes.filter((c) => c.kind === 'add').length;
    const dels = migrateOutcome.changes.filter((c) => c.kind === 'delete').length;
    lines.push(`- changes: ${adds} added, ${dels} deleted`);
    lines.push(`- failed tasks: ${migrateOutcome.failedTaskIds.length}`);
    lines.push(`- skipped tasks: ${migrateOutcome.skippedTaskIds.length}`);
  }

  // skippedTaskIds は「計画段階で別タスクと同じ targetPath を共有していたため
  // 意図的にスキップした task」(主に _document.tsx)。source は pages/ に残るので
  // customer が手動でマージできるよう、PR body で具体的に案内する。
  if (migrateOutcome && migrationPlan && migrateOutcome.skippedTaskIds.length > 0) {
    lines.push('');
    lines.push('### Manual merge needed');
    lines.push('');
    lines.push(
      'The following file(s) were intentionally not migrated because their target path',
    );
    lines.push(
      'was already produced from another source. The source file(s) remain in `pages/`',
    );
    lines.push('for you to manually merge:');
    lines.push('');
    for (const skippedId of migrateOutcome.skippedTaskIds) {
      const task = migrationPlan.tasks.find((t) => t.id === skippedId);
      if (task) {
        lines.push(
          `- \`${task.sourcePath}\` → merge into \`${task.targetPath}\` (already produced from another source)`,
        );
      }
    }
    lines.push('');
    lines.push(
      'Most commonly: `pages/_document.tsx` is preserved when `pages/_app.tsx` was the',
    );
    lines.push(
      'primary source for `app/layout.tsx`. Carry over `<Html>` attributes (e.g. `lang`)',
    );
    lines.push(
      'and any custom `<body>` className/style into the generated layout, then delete',
    );
    lines.push('`pages/_document.tsx`.');
  }

  lines.push('');
  lines.push('Please review and run CI before merging.');
  return lines.join('\n');
}
