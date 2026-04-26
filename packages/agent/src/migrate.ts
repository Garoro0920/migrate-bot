import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { topologicalSort } from './migrate/topological-sort';
import { type TransformOutcome, transformFile } from './migrate/transform';
import type { UsageRecord } from './observability/usage';
import type {
  FileChange,
  MigrateResult,
  MigrationPlan,
  MigrationTask,
  RepoLocation,
} from './types';

export interface MigrateOptions {
  readonly skipLlm?: boolean;
  readonly logPath?: string;
  readonly retryWith?: string;
}

const DEFAULT_RETRY_MODEL = 'claude-opus-4-7';

export async function migrate(
  repo: RepoLocation,
  plan: MigrationPlan,
  options: MigrateOptions = {},
): Promise<MigrateResult> {
  const orderedTasks = topologicalSort(plan.tasks);

  const changes: FileChange[] = [];
  const failedTaskIds: string[] = [];
  const usageRecords: UsageRecord[] = [];
  const writtenTargets = new Set<string>();

  for (const task of orderedTasks) {
    if (options.skipLlm === true) continue;

    // 衝突検知: 別タスクが既に同じ targetPath に書き込んでいる場合 (例: _app.tsx と _document.tsx
    // が両方 app/layout.tsx を target にする) は、後発タスクをスキップ。
    // source は手動マージ余地のため削除しない。
    if (writtenTargets.has(task.targetPath)) {
      failedTaskIds.push(task.id);
      continue;
    }

    const outcome = await runTaskWithRetry(repo, task, options);
    if (!outcome) {
      failedTaskIds.push(task.id);
      continue;
    }
    if (outcome.kind === 'aborted') {
      failedTaskIds.push(task.id);
      usageRecords.push(outcome.usage);
      continue;
    }

    const writeChange = await applyChange(repo, task, outcome.content);
    changes.push(writeChange);
    writtenTargets.add(task.targetPath);
    usageRecords.push(outcome.usage);

    // Pages Router → App Router 移行では source ファイルを残すと next build が
    // mixed-app-router エラーで落ちる。task が成功したら source は削除する。
    const deleteChange = await deleteSource(repo, task);
    if (deleteChange) changes.push(deleteChange);
  }

  const totalCost = usageRecords.reduce((sum, r) => sum + r.costUsd, 0);
  return {
    changes,
    failedTaskIds,
    usage: { costUsd: totalCost, callCount: usageRecords.length },
  };
}

async function runTaskWithRetry(
  repo: RepoLocation,
  task: MigrationTask,
  options: MigrateOptions,
): Promise<TransformOutcome | null> {
  const sourceFullPath = join(repo.localPath, task.sourcePath);
  let sourceContent: string;
  try {
    sourceContent = await readFile(sourceFullPath, 'utf-8');
  } catch {
    return null;
  }

  try {
    return await transformFile({
      task,
      sourceContent,
      ...(options.logPath !== undefined ? { logPath: options.logPath } : {}),
    });
  } catch {
    // Sonnet 失敗時は agent.md §1.5 に従って Opus でリトライを 1 回
    try {
      return await transformFile({
        task,
        sourceContent,
        model: options.retryWith ?? DEFAULT_RETRY_MODEL,
        ...(options.logPath !== undefined ? { logPath: options.logPath } : {}),
      });
    } catch {
      return null;
    }
  }
}

async function applyChange(
  repo: RepoLocation,
  task: MigrationTask,
  content: string,
): Promise<FileChange> {
  const targetFullPath = join(repo.localPath, task.targetPath);
  await mkdir(dirname(targetFullPath), { recursive: true });
  await writeFile(targetFullPath, content, 'utf-8');
  return { path: task.targetPath, kind: 'add' };
}

async function deleteSource(repo: RepoLocation, task: MigrationTask): Promise<FileChange | null> {
  const sourceFullPath = join(repo.localPath, task.sourcePath);
  try {
    await unlink(sourceFullPath);
    return { path: task.sourcePath, kind: 'delete' };
  } catch {
    return null;
  }
}
