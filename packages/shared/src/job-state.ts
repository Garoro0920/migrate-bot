// ジョブ状態機械 (docs/architecture.md §6)。
// 全遷移は本ファイルの関数を経由する。不正遷移はランタイムエラー (Sentry 通知想定)。

export type JobState =
  | 'queued'
  | 'analyzing'
  | 'planning'
  | 'migrating'
  | 'verifying'
  | 'pr_ready'
  | 'failed_ci'
  | 'aborted_blocker'
  | 'cost_exceeded'
  | 'installation_revoked'
  | 'refunding'
  | 'refunded'
  | 'cancelled';

export const JOB_STATES = [
  'queued',
  'analyzing',
  'planning',
  'migrating',
  'verifying',
  'pr_ready',
  'failed_ci',
  'aborted_blocker',
  'cost_exceeded',
  'installation_revoked',
  'refunding',
  'refunded',
  'cancelled',
] as const satisfies readonly JobState[];

// 各状態から遷移可能な次状態。
// 注: cost_exceeded / installation_revoked は実行中の状態 (analyzing/planning/
// migrating/verifying) から発生しうる中断遷移。
const TRANSITIONS: Readonly<Record<JobState, readonly JobState[]>> = {
  queued: ['analyzing', 'cancelled'],
  analyzing: ['planning', 'aborted_blocker', 'cost_exceeded', 'installation_revoked'],
  planning: ['migrating', 'cost_exceeded', 'installation_revoked'],
  migrating: ['verifying', 'cost_exceeded', 'installation_revoked'],
  verifying: ['pr_ready', 'failed_ci', 'cost_exceeded', 'installation_revoked'],
  pr_ready: [],
  failed_ci: ['refunding'],
  aborted_blocker: ['refunding'],
  cost_exceeded: ['refunding'],
  installation_revoked: ['refunding'],
  refunding: ['refunded'],
  refunded: [],
  cancelled: [],
};

export function canTransition(from: JobState, to: JobState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(state: JobState): boolean {
  return TRANSITIONS[state].length === 0;
}

export class InvalidTransitionError extends Error {
  readonly from: JobState;
  readonly to: JobState;
  constructor(from: JobState, to: JobState) {
    super(`invalid job state transition: ${from} -> ${to}`);
    this.from = from;
    this.to = to;
    this.name = 'InvalidTransitionError';
  }
}

export function assertTransition(from: JobState, to: JobState): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

// 各状態の SLA (ms)。SLA 超過したら自動失敗状態に遷移する想定。
// architecture.md §6.2 の値を反映:
//   queued: 24h, analyzing: 30m, planning: 30m, migrating: 2h, verifying: 24h
export const STATE_SLA_MS: Readonly<Record<JobState, number | null>> = {
  queued: 24 * 60 * 60 * 1000,
  analyzing: 30 * 60 * 1000,
  planning: 30 * 60 * 1000,
  migrating: 2 * 60 * 60 * 1000,
  verifying: 24 * 60 * 60 * 1000,
  pr_ready: null,
  failed_ci: null,
  aborted_blocker: null,
  cost_exceeded: null,
  installation_revoked: null,
  refunding: null,
  refunded: null,
  cancelled: null,
};

export function nextStatesOf(state: JobState): readonly JobState[] {
  return TRANSITIONS[state];
}
