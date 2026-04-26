import type { MigrateResult, MigrationPlan, RepoLocation } from './types';

export async function migrate(_repo: RepoLocation, _plan: MigrationPlan): Promise<MigrateResult> {
  throw new Error('migrate: not implemented (Phase 1 skeleton)');
}
