import type {
  AnalyzeResult,
  ClonedRepo,
  MigrateResult,
  MigrationPlan,
  VerifyResult,
} from '@migrate-bot/agent';
import { describe, expect, it, vi } from 'vitest';
import type { InstallationOctokitFactory, OctokitLike } from '../github';
import type { RemoteJob } from '../internal-api';
import { createRealPipeline, type RealPipelineDeps } from '../pipeline';

function buildAnalysis(overrides: Partial<AnalyzeResult> = {}): AnalyzeResult {
  return {
    nextVersion: '13.5.6',
    pagesFiles: ['pages/index.tsx'],
    fileCount: 1,
    recommendedPlan: 'small',
    blockers: [],
    classifications: [{ path: 'pages/index.tsx', kind: 'static-page' }],
    usage: { costUsd: 0.001, callCount: 1, tokensInput: 100, tokensOutput: 50 },
    ...overrides,
  };
}

function buildMigrate(overrides: Partial<MigrateResult> = {}): MigrateResult {
  return {
    changes: [{ path: 'app/page.tsx', kind: 'add' }],
    failedTaskIds: [],
    skippedTaskIds: [],
    usage: { costUsd: 0.02, callCount: 2, tokensInput: 1000, tokensOutput: 500 },
    ...overrides,
  };
}

function buildPlan(): MigrationPlan {
  return {
    tasks: [
      {
        id: 't1',
        kind: 'agent',
        fileKind: 'static-page',
        sourcePath: 'pages/index.tsx',
        targetPath: 'app/page.tsx',
        description: 'migrate index',
        dependsOn: [],
      },
    ],
  };
}

function buildVerify(overrides: Partial<VerifyResult> = {}): VerifyResult {
  return {
    typecheckPassed: true,
    buildPassed: true,
    testsPassed: null,
    failures: [],
    ...overrides,
  };
}

function makeFactory(octokit?: OctokitLike): InstallationOctokitFactory {
  return {
    forInstallation: async () =>
      octokit ?? {
        rest: {
          pulls: {
            create: vi.fn().mockResolvedValue({
              data: { number: 1, html_url: 'https://github.com/o/r/pull/1', state: 'open' },
            }),
          },
        },
      },
    getInstallationToken: async () => 'gha-token-stub',
  };
}

function makeJob(overrides: Partial<RemoteJob> = {}): RemoteJob {
  return {
    id: 'job-1',
    installationId: 'inst-uuid',
    githubInstallationId: 42,
    customerId: null,
    repoFullName: 'octocat/hello',
    plan: 'small',
    state: 'queued',
    traceId: 'trace-1',
    tokensInput: 0,
    tokensOutput: 0,
    costUsd: 0,
    prUrl: null,
    errorCode: null,
    errorDetail: null,
    createdAt: 1,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

interface BuildDepsOptions {
  readonly clonedPath?: string;
  readonly analysis?: AnalyzeResult;
  readonly migrateResult?: MigrateResult;
  readonly verifyResult?: VerifyResult;
  readonly hasDiff?: boolean;
  readonly octokit?: OctokitLike;
  readonly cleanup?: () => Promise<void>;
}

interface BuiltDeps {
  readonly deps: RealPipelineDeps;
  readonly execCalls: Array<{ args: readonly string[] }>;
  readonly cleanup: ReturnType<typeof vi.fn>;
}

function buildDeps(options: BuildDepsOptions = {}): BuiltDeps {
  const execCalls: Array<{ args: readonly string[] }> = [];
  const cleanup = vi.fn(options.cleanup ?? (async () => {}));
  const cloned: ClonedRepo = {
    localPath: options.clonedPath ?? '/tmp/repo',
    cleanup,
  };

  const exec = vi.fn(async (_cmd: string, args: readonly string[]) => {
    execCalls.push({ args });
    if (
      options.hasDiff === true &&
      args.length >= 2 &&
      args[0] === 'diff' &&
      args[1] === '--quiet'
    ) {
      // git diff --quiet exits non-zero when there is a diff → execFile throws
      throw Object.assign(new Error('diff exists'), { code: 1 });
    }
    return { stdout: '', stderr: '' };
  });

  const factory = makeFactory(options.octokit);
  const deps = {
    installationId: 42,
    factory,
    exec,
    clone: vi.fn(async () => cloned),
    runAnalyze: vi.fn(async () => options.analysis ?? buildAnalysis()),
    runPlan: vi.fn(async () => buildPlan()),
    runMigrate: vi.fn(async () => options.migrateResult ?? buildMigrate()),
    runVerify: vi.fn(async () => options.verifyResult ?? buildVerify()),
  } as unknown as RealPipelineDeps;
  return { deps, execCalls, cleanup };
}

describe('createRealPipeline.analyze', () => {
  it('clones with installation token and returns usage', async () => {
    const { deps } = buildDeps();
    const pipeline = createRealPipeline(deps);
    const result = await pipeline.analyze('octocat/hello');
    expect(result.usage).toEqual({ costUsd: 0.001, tokensInput: 100, tokensOutput: 50 });
    expect(deps.clone).toHaveBeenCalledWith({
      url: 'https://x-access-token:gha-token-stub@github.com/octocat/hello.git',
    });
  });

  it('throws when analyze returns blockers', async () => {
    const { deps } = buildDeps({
      analysis: buildAnalysis({
        blockers: [{ type: 'custom-server', evidence: 'server.js detected' }],
      }),
    });
    const pipeline = createRealPipeline(deps);
    await expect(pipeline.analyze('octocat/hello')).rejects.toThrow(/blockers detected/);
  });
});

describe('createRealPipeline.plan + migrate', () => {
  it('plan throws if analyze did not run', async () => {
    const { deps } = buildDeps();
    const pipeline = createRealPipeline(deps);
    await expect(pipeline.plan()).rejects.toThrow(/analyze must run first/);
  });

  it('migrate throws if plan did not run', async () => {
    const { deps } = buildDeps();
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await expect(pipeline.migrate()).rejects.toThrow(/plan must run first/);
  });

  it('migrate throws if any task failed', async () => {
    const { deps } = buildDeps({
      migrateResult: buildMigrate({ failedTaskIds: ['t1'] }),
    });
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await pipeline.plan();
    await expect(pipeline.migrate()).rejects.toThrow(/1 failed task/);
  });

  // 2026-05-13 prod 実カード E2E (Garoro0920/migrate-bot-prod-test) で発覚した
  // launch blocker の regression test。MigrateResult.skippedTaskIds (= 計画段階で
  // 意図された衝突スキップ、例: _document.tsx は _app.tsx と同じ app/layout.tsx
  // を target にする) が non-empty でも、failedTaskIds が empty なら pipeline は
  // fail しないことを保証する。修正前は migrate.ts が skip を failedTaskIds に
  // 積んでいたため、_document.tsx を持つ全リポジトリで pipeline が中断していた。
  it('migrate does NOT throw when skippedTaskIds is non-empty but failedTaskIds is empty', async () => {
    const { deps } = buildDeps({
      migrateResult: buildMigrate({
        skippedTaskIds: ['task-002-pages-document-tsx'],
        failedTaskIds: [],
      }),
    });
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await pipeline.plan();
    const result = await pipeline.migrate();
    expect(result.usage).toBeDefined();
  });

  it('migrate returns aggregated usage on success', async () => {
    const { deps } = buildDeps();
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await pipeline.plan();
    const result = await pipeline.migrate();
    expect(result.usage).toEqual({ costUsd: 0.02, tokensInput: 1000, tokensOutput: 500 });
  });
});

describe('createRealPipeline.verify', () => {
  it('throws when typecheck fails', async () => {
    const { deps } = buildDeps({
      verifyResult: buildVerify({ typecheckPassed: false, failures: ['ts(2304)'] }),
    });
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await expect(pipeline.verify()).rejects.toThrow(/typecheck failed/);
  });

  it('throws when build fails', async () => {
    const { deps } = buildDeps({
      verifyResult: buildVerify({ buildPassed: false, failures: ['next build error'] }),
    });
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await expect(pipeline.verify()).rejects.toThrow(/build failed/);
  });

  it('verify success path passes through', async () => {
    const { deps } = buildDeps();
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await expect(pipeline.verify()).resolves.toBeUndefined();
  });
});

describe('createRealPipeline.createPR', () => {
  it('skips commit when there is no diff and pushes branch + creates draft PR', async () => {
    const create = vi.fn().mockResolvedValue({
      data: { number: 7, html_url: 'https://github.com/octocat/hello/pull/7', state: 'open' },
    });
    const { deps, execCalls, cleanup } = buildDeps({
      hasDiff: false,
      octokit: { rest: { pulls: { create } } },
    });
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    const out = await pipeline.createPR(makeJob());
    expect(out.prUrl).toBe('https://github.com/octocat/hello/pull/7');

    const argsList = execCalls.map((c) => c.args.join(' '));
    expect(argsList.some((a) => a.startsWith('config user.email'))).toBe(true);
    expect(argsList.some((a) => a.startsWith('config user.name'))).toBe(true);
    expect(argsList.some((a) => a === 'diff --quiet')).toBe(true);
    expect(argsList.some((a) => a === 'add -A')).toBe(false);
    expect(argsList.some((a) => a.startsWith('commit'))).toBe(false);
    expect(argsList.some((a) => a.startsWith('checkout -b migrate-bot/app-router-'))).toBe(true);
    expect(argsList.some((a) => a.startsWith('push '))).toBe(true);

    expect(create).toHaveBeenCalledTimes(1);
    const callArg = create.mock.calls[0]?.[0] as { draft?: boolean; owner?: string; repo?: string };
    expect(callArg.draft).toBe(true);
    expect(callArg.owner).toBe('octocat');
    expect(callArg.repo).toBe('hello');

    // R4: createPR 内では cleanup を呼ばない。runJob の finally で pipeline.cleanup
    // 経由で発火するので、ここでは未発火を確認する。
    expect(cleanup).not.toHaveBeenCalled();
    await pipeline.cleanup();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('commits when there is a diff', async () => {
    const create = vi.fn().mockResolvedValue({
      data: { number: 8, html_url: 'https://github.com/octocat/hello/pull/8', state: 'open' },
    });
    const { deps, execCalls } = buildDeps({
      hasDiff: true,
      octokit: { rest: { pulls: { create } } },
    });
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await pipeline.createPR(makeJob());

    const argsList = execCalls.map((c) => c.args.join(' '));
    expect(argsList.some((a) => a === 'add -A')).toBe(true);
    expect(argsList.some((a) => a.startsWith('commit -m'))).toBe(true);
  });

  it('throws on invalid repoFullName', async () => {
    const { deps } = buildDeps();
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await expect(pipeline.createPR(makeJob({ repoFullName: 'no-slash' }))).rejects.toThrow(
      /invalid repoFullName/,
    );
  });

  it('throws if createPR runs before analyze (no clone)', async () => {
    const { deps } = buildDeps();
    const pipeline = createRealPipeline(deps);
    await expect(pipeline.createPR(makeJob())).rejects.toThrow(/workDir not ready/);
  });
});

describe('createRealPipeline.cleanup (R4)', () => {
  it('removes the cloned workdir on first call', async () => {
    const { deps, cleanup } = buildDeps();
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await pipeline.cleanup();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — repeated calls are no-ops', async () => {
    const { deps, cleanup } = buildDeps();
    const pipeline = createRealPipeline(deps);
    await pipeline.analyze('octocat/hello');
    await pipeline.cleanup();
    await pipeline.cleanup();
    await pipeline.cleanup();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when analyze never ran', async () => {
    const { deps, cleanup } = buildDeps();
    const pipeline = createRealPipeline(deps);
    await pipeline.cleanup();
    expect(cleanup).not.toHaveBeenCalled();
  });
});
