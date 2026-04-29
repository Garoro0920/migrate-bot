#!/usr/bin/env node
//
// scripts/preflight-prod.mjs
//
// Phase 4 prod デプロイ前の readiness チェック。以下を順に検査して、すべて
// 通ったら "Ready to deploy" を出力。1 つでも fail なら exit 1。
//
// 実行: `node scripts/preflight-prod.mjs` (monorepo root から)
//        または `pnpm preflight:prod` (root package.json で wire)
//
// 検査項目:
//   1. docs/templates/legal/*.md に <PLACEHOLDER> が残っていないか
//      (operator が legal review 後に埋めたかの確認)
//   2. apps/api/wrangler.toml の [env.prod.*] セクションに <PLACEHOLDER>
//      (<PROD_D1_DATABASE_ID>, <DEPLOYMENT_TAG>) が残っていないか
//   3. apps/web/wrangler.toml の [env.prod.*] に placeholder が残っていないか
//   4. typecheck (turbo run typecheck) が通る
//   5. test (turbo run test) が通る
//   6. apps/web 用 legal-content.gen.ts が最新の MD と整合
//
// 検査外 (operator が手動確認):
//   - wrangler/flyctl secrets が prod に設定済か (CLI auth が必要なため)
//   - GitHub App (prod) / Cloudflare D1 prod / Fly app prod が作成済か
//   - Stripe Live activation 承認済か
//   - Domain custom binding が完了済か

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

let failures = 0;
const log = {
  ok: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  fail: (msg) => {
    console.log(`\x1b[31m✗\x1b[0m ${msg}`);
    failures++;
  },
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
  info: (msg) => console.log(`  ${msg}`),
  section: (msg) => console.log(`\n\x1b[1m${msg}\x1b[0m`),
};

// ─── 1. Legal docs placeholder 検査 ─────────────────────────────────────

log.section('[1/6] Legal docs placeholder check');

const legalDir = resolve(repoRoot, 'docs/templates/legal');
const legalFiles = readdirSync(legalDir).filter((f) => f.endsWith('.md') && f !== 'README.md');

const REQUIRED_PLACEHOLDERS = [
  '<OPERATOR_LEGAL_NAME>',
  '<OPERATOR_ADDRESS>',
  '<CONTACT_EMAIL>',
  '<EFFECTIVE_DATE>',
  '<GOVERNING_LAW>',
  '<CONTACT_PHONE>',
];

for (const file of legalFiles) {
  const path = resolve(legalDir, file);
  const content = readFileSync(path, 'utf-8');
  // body 部 (DRAFT meta block を除く) を抽出
  // DRAFT block は冒頭の `> **Status: ` で始まるブロック
  const body = content.replace(/^> \*\*Status[\s\S]*?(?=^\*\*(?:Effective date|最終更新))/m, '');
  const remaining = REQUIRED_PLACEHOLDERS.filter((p) => body.includes(p));
  if (remaining.length === 0) {
    log.ok(`${file}`);
  } else {
    log.fail(`${file} — unfilled placeholders: ${remaining.join(', ')}`);
  }
}

// ─── 2. apps/api wrangler.toml prod placeholder 検査 ────────────────────

log.section('[2/6] apps/api wrangler.toml prod placeholder check');

const apiToml = readFileSync(resolve(repoRoot, 'apps/api/wrangler.toml'), 'utf-8');
const apiProdSection = apiToml.match(/\[env\.prod\][\s\S]*$/)?.[0] ?? '';
// コメント行は除外して検査
const apiProdSectionUncommented = apiProdSection
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

const API_PROD_REQUIRED = ['<PROD_D1_DATABASE_ID>', '<DEPLOYMENT_TAG>'];
const apiUnfilled = API_PROD_REQUIRED.filter((p) => apiProdSectionUncommented.includes(p));
if (apiUnfilled.length === 0) {
  log.ok('apps/api/wrangler.toml [env.prod] is fully configured');
} else {
  log.fail(`apps/api/wrangler.toml [env.prod] — unfilled placeholders: ${apiUnfilled.join(', ')}`);
  log.info('  (operator must run `wrangler d1 create migrate-bot-prod` and update database_id)');
  log.info('  (RUNNER_IMAGE tag is updated automatically by scripts/deploy-runner-and-update-image.mjs)');
}

// d1_databases / queues セクションがコメントアウトされたままでないか
if (/^\s*#\s*\[\[env\.prod\.d1_databases\]\]/m.test(apiProdSection)) {
  log.fail('apps/api/wrangler.toml: [[env.prod.d1_databases]] is still commented out');
  log.info('  (uncomment after wrangler d1 create completes)');
}
if (/^\s*#\s*\[\[env\.prod\.queues\.producers\]\]/m.test(apiProdSection)) {
  log.fail('apps/api/wrangler.toml: [[env.prod.queues.producers]] is still commented out');
}

// ─── 3. apps/web wrangler.toml prod placeholder 検査 ────────────────────

log.section('[3/6] apps/web wrangler.toml prod placeholder check');

const webToml = readFileSync(resolve(repoRoot, 'apps/web/wrangler.toml'), 'utf-8');
const webProdSection = webToml.match(/\[env\.prod\][\s\S]*$/)?.[0] ?? '';
const webProdUnfilled = ['<DOMAIN>'].filter((p) => webProdSection.includes(p));
if (webProdUnfilled.length === 0) {
  log.ok('apps/web/wrangler.toml [env.prod] is fully configured');
} else {
  log.fail(`apps/web/wrangler.toml [env.prod] — unfilled: ${webProdUnfilled.join(', ')}`);
}

// ─── 4. typecheck (全 packages) ─────────────────────────────────────────

log.section('[4/6] typecheck across all packages');

try {
  execSync('corepack pnpm typecheck', {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
  });
  log.ok('typecheck passes (7/7 packages)');
} catch (err) {
  log.fail('typecheck failed');
  log.info(`  see: corepack pnpm typecheck`);
}

// ─── 5. tests (全 packages) ─────────────────────────────────────────────

log.section('[5/6] tests across all packages');

try {
  execSync('corepack pnpm test', {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
  });
  log.ok('all tests pass');
} catch (err) {
  log.fail('tests failed');
  log.info(`  see: corepack pnpm test`);
}

// ─── 6. legal-content.gen.ts 整合確認 ────────────────────────────────────

log.section('[6/6] legal-content.gen.ts is up to date');

try {
  execSync('node apps/web/scripts/embed-legal.mjs', {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
  });
  // 生成して diff を見る
  const diff = execSync('git diff --stat apps/web/src/pages/legal-content.gen.ts', {
    cwd: repoRoot,
    encoding: 'utf-8',
  });
  if (diff.trim() === '') {
    log.ok('legal-content.gen.ts matches current MD sources');
  } else {
    log.fail('legal-content.gen.ts is out of date relative to MD sources');
    log.info('  run: cd apps/web && pnpm build:legal');
    log.info('  then commit the regenerated file');
  }
} catch (err) {
  log.fail(`legal-content regeneration failed: ${err.message}`);
}

// ─── operator 手動確認の reminder ───────────────────────────────────────

log.section('[Manual] operator pre-deploy checklist (cannot be automated)');

const manualChecks = [
  'wrangler secret list --env=prod : all 10 secrets present (apps/api)',
  '  GITHUB_WEBHOOK_SECRET, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY,',
  '  INTERNAL_API_TOKEN, FLY_API_TOKEN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,',
  '  RESEND_API_KEY, EMAIL_FROM_ADDRESS, SENTRY_DSN (optional)',
  '',
  'wrangler secret list --env=prod : SENTRY_DSN present (apps/web, optional)',
  '',
  'flyctl secrets list --app migrate-bot-runner-prod : 4-5 secrets present',
  '  ANTHROPIC_API_KEY, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, INTERNAL_API_TOKEN,',
  '  SENTRY_DSN (optional)',
  '',
  'GitHub App "migrate-bot" (prod) registered with webhook URL pointing to api.migrate-bot.dev',
  'Cloudflare Custom Domain bound: migrate-bot.dev → migrate-bot-web-prod',
  'Cloudflare Custom Domain bound: api.migrate-bot.dev → migrate-bot-api-prod',
  'Resend domain verification: migrate-bot.dev (DKIM/SPF/DMARC propagated)',
  'Stripe Live activation: approved + webhook endpoint registered',
];

for (const check of manualChecks) {
  if (check === '') {
    console.log('');
  } else {
    console.log(`  □ ${check}`);
  }
}

// ─── 終了 ────────────────────────────────────────────────────────────

console.log('');
if (failures === 0) {
  console.log('\x1b[1m\x1b[32m═══════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m\x1b[32m  Code-side preflight: READY\x1b[0m');
  console.log('\x1b[1m\x1b[32m═══════════════════════════════════════════════\x1b[0m');
  console.log('');
  console.log('  Next: complete the manual checklist above, then run:');
  console.log('    node scripts/deploy-runner-and-update-image.mjs --env=prod');
  console.log('    cd apps/api && corepack pnpm exec wrangler deploy --env=prod');
  console.log('    cd apps/web && corepack pnpm exec wrangler deploy --env=prod');
  process.exit(0);
} else {
  console.log('\x1b[1m\x1b[31m═══════════════════════════════════════════════\x1b[0m');
  console.log(`\x1b[1m\x1b[31m  Code-side preflight: ${failures} FAILURE(S)\x1b[0m`);
  console.log('\x1b[1m\x1b[31m═══════════════════════════════════════════════\x1b[0m');
  process.exit(1);
}
