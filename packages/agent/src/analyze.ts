import { detectStaticBlockers, hasAppDir } from './analyze/blockers';
import {
  CLASSIFY_BATCH_LIMIT,
  type ClassifyInput,
  type ClassifyOutcome,
  classifyPagesFiles,
  readExcerpt,
} from './analyze/classify';
import { enumeratePagesFiles, readPackageInfo } from './analyze/repo-info';
import { recommendPlan } from './analyze/sizing';
import type { AnalyzeResult, AnalyzeUsage, RepoLocation } from './types';

export interface AnalyzeOptions {
  readonly skipLlm?: boolean;
  readonly logPath?: string;
}

export async function analyze(
  repo: RepoLocation,
  options: AnalyzeOptions = {},
): Promise<AnalyzeResult> {
  const pkg = await readPackageInfo(repo.localPath);
  const pages = await enumeratePagesFiles(repo.localPath);
  const appDirPresent = await hasAppDir(repo.localPath);

  const blockers = await detectStaticBlockers({
    repoPath: repo.localPath,
    pageCount: pages.count,
    hasMonorepoMarkers: pkg.hasMonorepoMarkers,
    hasAppDir: appDirPresent,
  });

  const recommendedPlan = recommendPlan(pages.count);

  const classifyOutcome = await runClassification(
    repo.localPath,
    pages.all,
    blockers.length > 0,
    options.skipLlm === true,
    options.logPath,
  );

  const usage: AnalyzeUsage = {
    costUsd: classifyOutcome.usage?.costUsd ?? 0,
    callCount: classifyOutcome.usage ? 1 : 0,
  };

  return {
    nextVersion: pkg.nextVersion,
    pagesFiles: pages.all,
    fileCount: pages.count,
    recommendedPlan,
    blockers,
    classifications: classifyOutcome.classifications,
    usage,
  };
}

async function runClassification(
  repoPath: string,
  pagesFiles: readonly string[],
  hasBlockers: boolean,
  skipLlm: boolean,
  logPath: string | undefined,
): Promise<ClassifyOutcome> {
  if (skipLlm || hasBlockers || pagesFiles.length === 0) {
    return { classifications: [], usage: null };
  }

  const batch = pagesFiles.slice(0, CLASSIFY_BATCH_LIMIT);
  const inputs: ClassifyInput[] = await Promise.all(
    batch.map(async (path) => ({
      path,
      excerpt: await readExcerpt(repoPath, path),
    })),
  );
  return classifyPagesFiles(inputs, logPath !== undefined ? { logPath } : {});
}
