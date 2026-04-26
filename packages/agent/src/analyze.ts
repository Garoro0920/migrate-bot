import type { AnalyzeResult, RepoLocation } from './types';

export async function analyze(_repo: RepoLocation): Promise<AnalyzeResult> {
  throw new Error('analyze: not implemented (Phase 1 skeleton)');
}
