import type { AnalyzeResult, MigrationPlan } from './types';

export async function plan(_analysis: AnalyzeResult): Promise<MigrationPlan> {
  throw new Error('plan: not implemented (Phase 1 skeleton)');
}
