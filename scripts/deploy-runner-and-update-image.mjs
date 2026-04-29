#!/usr/bin/env node
//
// scripts/deploy-runner-and-update-image.mjs
//
// flyctl deploy → image tag を capture → apps/api/wrangler.toml の
// RUNNER_IMAGE を更新 → optional で wrangler deploy をトリガ。
//
// dev 環境で何度も発生した "flyctl deploy → 出力からタグ目視コピー →
// wrangler.toml 編集 → wrangler deploy" の手作業を 1 コマンドに統合。
//
// 使用例:
//   node scripts/deploy-runner-and-update-image.mjs            # dev
//   node scripts/deploy-runner-and-update-image.mjs --env=prod # prod
//   node scripts/deploy-runner-and-update-image.mjs --no-redeploy  # wrangler deploy を skip
//   node scripts/deploy-runner-and-update-image.mjs --skip-fly     # 既に flyctl deploy 済の場合に image tag だけ更新
//
// 動作:
//   1. flyctl deploy --app <FLY_APP_NAME> を実行
//   2. 出力から `image: registry.fly.io/<APP>:deployment-<TAG>` を抽出
//   3. apps/api/wrangler.toml の RUNNER_IMAGE 行を sed-like に書換
//   4. (default) cd apps/api && wrangler deploy --env=<ENV>
//
// 失敗時:
//   - flyctl deploy 失敗 → 終了 (wrangler.toml 変更なし)
//   - tag parsing 失敗 → 終了 (operator が手動で flyctl image show で確認)
//   - wrangler.toml 書換失敗 → 終了 (この時点で flyctl deploy は完了済、
//     operator が手動更新)

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

// ─── arg parse ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const env = args.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'dev';
const noRedeploy = args.includes('--no-redeploy');
const skipFly = args.includes('--skip-fly');

if (env !== 'dev' && env !== 'prod') {
  console.error(`Invalid --env: ${env}. Must be "dev" or "prod".`);
  process.exit(1);
}

const flyApp = env === 'prod' ? 'migrate-bot-runner-prod' : 'migrate-bot-runner-dev';

// ─── color helpers ─────────────────────────────────────────────────────

const log = {
  step: (n, msg) => console.log(`\n\x1b[1m[${n}/4] ${msg}\x1b[0m`),
  ok: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  fail: (msg) => console.log(`\x1b[31m✗\x1b[0m ${msg}`),
  info: (msg) => console.log(`  ${msg}`),
};

console.log(`\x1b[1mDeploying runner to ${env} (app: ${flyApp})\x1b[0m`);

// ─── 1. flyctl deploy ───────────────────────────────────────────────────

let imageTag;

if (skipFly) {
  log.step(1, `flyctl deploy [SKIPPED via --skip-fly]`);
  // 既存の image を取得
  log.info(`fetching latest image from "flyctl image show --app ${flyApp}"...`);
  try {
    const out = execSync(`flyctl image show --app ${flyApp}`, { encoding: 'utf-8' });
    const m = out.match(/deployment-[A-Z0-9]+/);
    if (m) {
      imageTag = m[0];
      log.ok(`existing image tag: ${imageTag}`);
    } else {
      log.fail(`could not parse image tag from flyctl image show output`);
      process.exit(1);
    }
  } catch (err) {
    log.fail(`flyctl image show failed: ${err.message}`);
    process.exit(1);
  }
} else {
  log.step(1, `flyctl deploy --app ${flyApp} --no-public-ips`);
  log.info('this typically takes 1-3 minutes...');
  // flyctl deploy は出力が長く、子プロセスとして spawn してリアルタイム表示
  // しつつ stdout を buffer に貯める
  const result = spawnSync('flyctl', ['deploy', '--app', flyApp, '--no-public-ips'], {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  if (result.status !== 0) {
    log.fail(`flyctl deploy exited with code ${result.status}`);
    process.exit(1);
  }
  process.stdout.write(result.stdout);
  // 出力から image: registry.fly.io/<app>:deployment-<TAG> を抽出
  const m = result.stdout.match(/image:\s*registry\.fly\.io\/[^:]+:(deployment-[A-Z0-9]+)/);
  if (!m) {
    log.fail('could not find "image: registry.fly.io/...:deployment-XXX" in flyctl output');
    log.info('  manually run: flyctl image show --app ' + flyApp);
    log.info('  then re-run with --skip-fly');
    process.exit(1);
  }
  imageTag = m[1];
  log.ok(`captured image tag: ${imageTag}`);
}

// ─── 2. wrangler.toml の RUNNER_IMAGE を更新 ────────────────────────────

log.step(2, `update apps/api/wrangler.toml RUNNER_IMAGE`);

const tomlPath = resolve(repoRoot, 'apps/api/wrangler.toml');
const original = readFileSync(tomlPath, 'utf-8');

// dev 環境: [vars] section の RUNNER_IMAGE を更新
// prod 環境: [env.prod.vars] section の RUNNER_IMAGE を更新
//
// 単純な regex で行を置換。app 名 (migrate-bot-runner-dev / -prod) が一致
// する行のみマッチ。

const newImageLine = `RUNNER_IMAGE = "registry.fly.io/${flyApp}:${imageTag}"`;
const matchPattern = new RegExp(
  `RUNNER_IMAGE\\s*=\\s*"registry\\.fly\\.io/${flyApp}:[^"]*"`,
  'g',
);

if (!matchPattern.test(original)) {
  log.fail(`could not find RUNNER_IMAGE line for ${flyApp} in apps/api/wrangler.toml`);
  log.info(`  expected pattern: RUNNER_IMAGE = "registry.fly.io/${flyApp}:..."`);
  log.info(`  manual fix: edit apps/api/wrangler.toml and set RUNNER_IMAGE = "registry.fly.io/${flyApp}:${imageTag}"`);
  process.exit(1);
}

const updated = original.replace(matchPattern, newImageLine);
if (updated === original) {
  log.ok(`RUNNER_IMAGE already at ${imageTag} (no change)`);
} else {
  writeFileSync(tomlPath, updated, 'utf-8');
  log.ok(`apps/api/wrangler.toml updated`);
  log.info(`  ${newImageLine}`);
}

// ─── 3. wrangler deploy ────────────────────────────────────────────────

if (noRedeploy) {
  log.step(3, `wrangler deploy [SKIPPED via --no-redeploy]`);
} else {
  log.step(3, `cd apps/api && wrangler deploy${env === 'prod' ? ' --env=prod' : ' --env=""'}`);
  const wranglerArgs = ['exec', 'wrangler', 'deploy'];
  if (env === 'prod') {
    wranglerArgs.push('--env=prod');
  } else {
    wranglerArgs.push('--env=""');
  }
  const result = spawnSync('corepack', ['pnpm', ...wranglerArgs], {
    cwd: resolve(repoRoot, 'apps/api'),
    encoding: 'utf-8',
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    log.fail(`wrangler deploy exited with code ${result.status}`);
    process.exit(1);
  }
  log.ok('wrangler deploy completed');
}

// ─── 4. machine cleanup reminder ───────────────────────────────────────

log.step(4, 'standby machine cleanup (manual)');

log.info('flyctl deploy auto-launches standby app machines. Destroy them so');
log.info('the consumer Worker spawns fresh per-job machines:');
console.log('');
console.log(`  flyctl machines list --app ${flyApp}`);
console.log(`  flyctl machines destroy <id1> --force --app ${flyApp}`);
console.log(`  flyctl machines destroy <id2> --force --app ${flyApp}`);
console.log('');
log.info('this step is not automated because Fly may rotate machine IDs');
log.info('between sessions. operator runs the above 3 commands.');

console.log('');
console.log('\x1b[1m\x1b[32mDone.\x1b[0m');
