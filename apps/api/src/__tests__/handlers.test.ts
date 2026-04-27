import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSqliteClient, installations, type SqliteClient } from '@migrate-bot/db';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleInstallationEvent, handlePushEvent } from '../webhooks/handlers';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(
  resolve(here, '../../../../packages/db/migrations/0000_initial.sql'),
  'utf-8',
);

describe('webhook handlers', () => {
  let sqlite: Database.Database;
  let db: SqliteClient;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(MIGRATION_SQL);
    db = createSqliteClient(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  describe('handleInstallationEvent', () => {
    it("inserts new installation on 'created' action", async () => {
      const outcome = await handleInstallationEvent(db, {
        action: 'created',
        installation: {
          id: 12345,
          account: { login: 'octocat', type: 'User' },
        },
      });
      expect(outcome.action).toBe('logged');
      expect(outcome.reason).toMatch(/installation created/);
      const rows = await db
        .select()
        .from(installations)
        .where(eq(installations.githubInstallationId, 12345));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.accountLogin).toBe('octocat');
      expect(rows[0]?.revokedAt).toBeNull();
    });

    it("updates existing installation on second 'created'", async () => {
      await handleInstallationEvent(db, {
        action: 'created',
        installation: { id: 1, account: { login: 'a', type: 'User' } },
      });
      const outcome = await handleInstallationEvent(db, {
        action: 'created',
        installation: { id: 1, account: { login: 'a', type: 'User' } },
      });
      expect(outcome.reason).toMatch(/db: updated/);
      const rows = await db.select().from(installations);
      expect(rows).toHaveLength(1);
    });

    it("marks installation revoked on 'deleted'", async () => {
      await handleInstallationEvent(db, {
        action: 'created',
        installation: { id: 1, account: { login: 'a', type: 'User' } },
      });
      const outcome = await handleInstallationEvent(db, {
        action: 'deleted',
        installation: { id: 1, account: { login: 'a', type: 'User' } },
      });
      expect(outcome.action).toBe('logged');
      expect(outcome.reason).toMatch(/marked revoked/);
      const rows = await db
        .select()
        .from(installations)
        .where(eq(installations.githubInstallationId, 1));
      expect(rows[0]?.revokedAt).not.toBeNull();
    });

    it("re-installation after 'deleted' clears revokedAt", async () => {
      await handleInstallationEvent(db, {
        action: 'created',
        installation: { id: 1, account: { login: 'a', type: 'User' } },
      });
      await handleInstallationEvent(db, {
        action: 'deleted',
        installation: { id: 1, account: { login: 'a', type: 'User' } },
      });
      const outcome = await handleInstallationEvent(db, {
        action: 'created',
        installation: { id: 1, account: { login: 'a', type: 'User' } },
      });
      expect(outcome.reason).toMatch(/db: updated/);
      const rows = await db
        .select()
        .from(installations)
        .where(eq(installations.githubInstallationId, 1));
      expect(rows[0]?.revokedAt).toBeNull();
    });

    it("treats 'suspend' the same as 'deleted'", async () => {
      await handleInstallationEvent(db, {
        action: 'created',
        installation: { id: 1, account: { login: 'a', type: 'User' } },
      });
      await handleInstallationEvent(db, {
        action: 'suspend',
        installation: { id: 1, account: { login: 'a', type: 'User' } },
      });
      const rows = await db.select().from(installations);
      expect(rows[0]?.revokedAt).not.toBeNull();
    });

    it('handles missing account gracefully', async () => {
      const outcome = await handleInstallationEvent(db, {
        action: 'created',
        installation: { id: 99, account: null },
      });
      expect(outcome.action).toBe('logged');
      const rows = await db
        .select()
        .from(installations)
        .where(eq(installations.githubInstallationId, 99));
      expect(rows[0]?.accountLogin).toBe('unknown');
    });
  });

  describe('handlePushEvent', () => {
    it('logs the ref + repo (no db write yet)', async () => {
      const outcome = await handlePushEvent(db, {
        ref: 'refs/heads/main',
        installation: { id: 1 },
        repository: { full_name: 'octo/hello', default_branch: 'main' },
      });
      expect(outcome.action).toBe('logged');
      expect(outcome.reason).toMatch(/octo\/hello/);
      expect(outcome.reason).toMatch(/refs\/heads\/main/);
    });
  });
});
