import type { RepoLocation, VerifyResult } from './types';

export async function verify(_repo: RepoLocation): Promise<VerifyResult> {
  throw new Error('verify: not implemented (Phase 1 skeleton)');
}
