export type Plan = 'small' | 'medium' | 'large' | 'enterprise';

export interface RepoLocation {
  readonly localPath: string;
  readonly source: string;
}

export type BlockerType =
  | 'custom-server'
  | 'monorepo'
  | 'size-overflow'
  | 'mixed-app-router'
  | 'broken-lockfile'
  | 'unsupported-dep';

export interface Blocker {
  readonly type: BlockerType;
  readonly evidence: string;
}

export type FileKind =
  | 'static-page'
  | 'ssr-page'
  | 'ssg-page'
  | 'api-route'
  | 'app'
  | 'document'
  | 'error'
  | 'unknown';

export interface FileClassification {
  readonly path: string;
  readonly kind: FileKind;
}

export interface AnalyzeUsage {
  readonly costUsd: number;
  readonly callCount: number;
  readonly tokensInput: number;
  readonly tokensOutput: number;
}

export interface AnalyzeResult {
  readonly nextVersion: string;
  readonly pagesFiles: readonly string[];
  readonly fileCount: number;
  readonly recommendedPlan: Plan;
  readonly blockers: readonly Blocker[];
  readonly classifications: readonly FileClassification[];
  readonly usage: AnalyzeUsage;
}

export type TaskKind = 'codemod' | 'agent' | 'hybrid';

export interface MigrationTask {
  readonly id: string;
  readonly kind: TaskKind;
  readonly fileKind: FileKind;
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly description: string;
  readonly dependsOn: readonly string[];
}

export interface MigrationPlan {
  readonly tasks: readonly MigrationTask[];
}

export type FileChangeKind = 'add' | 'modify' | 'delete';

export interface FileChange {
  readonly path: string;
  readonly kind: FileChangeKind;
}

export interface MigrateUsage {
  readonly costUsd: number;
  readonly callCount: number;
  readonly tokensInput: number;
  readonly tokensOutput: number;
}

export interface MigrateResult {
  readonly changes: readonly FileChange[];
  // LLM が abort を返した、または primary + retry の両方で例外が出た task。
  // pipeline は失敗として扱い、ジョブ全体を refund に進める。
  readonly failedTaskIds: readonly string[];
  // 計画段階で別タスクと同じ targetPath を共有していたため意図的にスキップした
  // task (例: _document.tsx は _app.tsx と同じ app/layout.tsx を target にする
  // 設計のため、後発を skip)。pipeline は失敗として扱わない。
  readonly skippedTaskIds: readonly string[];
  readonly usage: MigrateUsage;
}

export interface VerifyResult {
  readonly typecheckPassed: boolean;
  readonly buildPassed: boolean;
  readonly testsPassed: boolean | null;
  readonly failures: readonly string[];
}
