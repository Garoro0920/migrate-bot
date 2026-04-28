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

      // git config (per-repo only — global を汚さない)
      await exec('git', ['config', 'user.email', authorEmail], { cwd, shell: true });
      await exec('git', ['config', 'user.name', authorName], { cwd, shell: true });

      // 変更があるかチェック (diff があれば commit、無ければ skip)
      try {
        await exec('git', ['diff', '--quiet'], { cwd, shell: true });
        // diff なし
      } catch {
        // diff あり → add + commit
        await exec('git', ['add', '-A'], { cwd, shell: true });
        await exec('git', ['commit', '-m', '[migrate-bot] migrate Pages Router → App Router'], {
          cwd,
          shell: true,
        });
      }

      // branch 作成 + push
      await exec('git', ['checkout', '-b', branchName], { cwd, shell: true });
      const token = await deps.factory.getInstallationToken(deps.installationId);
      const remoteUrl = `https://x-access-token:${token}@github.com/${job.repoFullName}.git`;
      await exec('git', ['push', remoteUrl, branchName], { cwd, shell: true });

      const pr = await createDraftPR({
        factory: deps.factory,
        installationId: deps.installationId,
        owner,
        repo,
        head: branchName,
        base: baseBranch,
        title: '[migrate-bot] Pages Router → App Router migration',
        body: buildPrBody(analysis, migrateOutcome),
      });

      // tmp dir cleanup (fire-and-forget で例外は無視)
      void cloned.cleanup().catch(() => {});

      return { prUrl: pr.html_url };
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

function buildPrBody(analysis: AnalyzeResult | null, migrateOutcome: MigrateResult | null): string {
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
  }
  lines.push('');
  lines.push('Please review and run CI before merging.');
  return lines.join('\n');
}
