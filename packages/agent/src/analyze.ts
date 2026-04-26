import { detectStaticBlockers, hasAppDir } from './analyze/blockers';
import {
  CLASSIFY_BATCH_LIMIT,
  type ClassifyInput,
  classifyPagesFiles,
  readExcerpt,
} from './analyze/classify';
import { enumeratePagesFiles, readPackageInfo } from './analyze/repo-info';
import { recommendPlan } from './analyze/sizing';
import type { AnalyzeResult, FileClassification, RepoLocation } from './types';

export interface AnalyzeOptions {
  readonly skipLlm?: boolean;
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

  const classifications = await runClassification(
    repo.localPath,
    pages.all,
    blockers.length > 0,
    options.skipLlm === true,
  );

  return {
    nextVersion: pkg.nextVersion,
    pagesFiles: pages.all,
    fileCount: pages.count,
    recommendedPlan,
    blockers,
    classifications,
  };
}

async function runClassification(
  repoPath: string,
  pagesFiles: readonly string[],
  hasBlockers: boolean,
  skipLlm: boolean,
): Promise<readonly FileClassification[]> {
  if (skipLlm || hasBlockers || pagesFiles.length === 0) return [];

  const batch = pagesFiles.slice(0, CLASSIFY_BATCH_LIMIT);
  const inputs: ClassifyInput[] = await Promise.all(
    batch.map(async (path) => ({
      path,
      excerpt: await readExcerpt(repoPath, path),
    })),
  );
  return classifyPagesFiles(inputs);
}
