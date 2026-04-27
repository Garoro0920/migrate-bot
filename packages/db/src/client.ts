import { drizzle as drizzleBetterSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import * as schema from './schema';

// D1 / better-sqlite3 両対応の DB client 抽象。
// apps/api (Workers): createD1Client(env.DB)
// テスト: createSqliteClient(new Database(':memory:'))
//
// drizzle が exports するクエリビルダ型は dialect ごとに異なるが、本プロジェクト
// で使うクエリは select / insert / update / delete の単純なものに限るため、
// "DbClient" を共通の interface 化せず、それぞれ生の drizzle インスタンスを
// repository 関数に渡す方針 (テスト時は better-sqlite3、本番は D1)。

export type D1Client = ReturnType<typeof createD1Client>;
export type SqliteClient = ReturnType<typeof createSqliteClient>;

// repository 関数が受け取る共通 type。drizzle-orm の two-dialect 横断型の
// 公式手段は無いため、union ではなく Caller 側で渡し分ける運用。
export type AnyDbClient = D1Client | SqliteClient;

export function createD1Client(database: D1Database) {
  return drizzleD1(database, { schema });
}

export function createSqliteClient(sqlite: import('better-sqlite3').Database) {
  return drizzleBetterSqlite(sqlite, { schema });
}

export { schema };
