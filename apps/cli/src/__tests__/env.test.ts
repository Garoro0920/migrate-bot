import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadDotenv } from '../env';

const TEST_KEY = 'MIGRATE_BOT_DOTENV_TEST_KEY';
const TEST_KEY2 = 'MIGRATE_BOT_DOTENV_TEST_KEY2';

describe('loadDotenv', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'env-test-'));
  });

  afterEach(async () => {
    delete process.env[TEST_KEY];
    delete process.env[TEST_KEY2];
    await rm(dir, { recursive: true, force: true });
  });

  it('loads keys from .env.local', async () => {
    const path = join(dir, '.env.local');
    await writeFile(path, `${TEST_KEY}=hello\n`);
    loadDotenv(path);
    expect(process.env[TEST_KEY]).toBe('hello');
  });

  it('skips comments and blank lines', async () => {
    const path = join(dir, '.env.local');
    await writeFile(path, `# comment\n\n${TEST_KEY}=value\n`);
    loadDotenv(path);
    expect(process.env[TEST_KEY]).toBe('value');
  });

  it('strips surrounding quotes', async () => {
    const path = join(dir, '.env.local');
    await writeFile(path, `${TEST_KEY}="quoted"\n${TEST_KEY2}='single'\n`);
    loadDotenv(path);
    expect(process.env[TEST_KEY]).toBe('quoted');
    expect(process.env[TEST_KEY2]).toBe('single');
  });

  it('does not override existing env vars', async () => {
    process.env[TEST_KEY] = 'preset';
    const path = join(dir, '.env.local');
    await writeFile(path, `${TEST_KEY}=fromfile\n`);
    loadDotenv(path);
    expect(process.env[TEST_KEY]).toBe('preset');
  });

  it('silently does nothing when file does not exist', () => {
    loadDotenv(join(dir, 'does-not-exist.env'));
    expect(process.env[TEST_KEY]).toBeUndefined();
  });
});
