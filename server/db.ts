import path from "path";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@shared/schema";

// server/db.ts in dev and dist/index.js in production are both one level below the root
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsFolder = path.join(rootDir, "migrations");

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

function createDatabase() {
  const url = process.env.DATABASE_URL;

  if (url) {
    // Without a connect timeout an unreachable database hangs startup forever,
    // and the host only reports "no open ports" after 15 minutes
    const pool = new pg.Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 15_000 });
    const db = drizzlePg(pool, { schema });
    return {
      db: db as unknown as Database,
      migrate: () => migratePg(db, { migrationsFolder }),
      close: () => pool.end(),
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production");
  }

  // Local development and tests: embedded Postgres, no install needed.
  // PGLITE_DIR=memory:// keeps everything in memory (used by the tests).
  const dataDir = process.env.PGLITE_DIR || path.join(rootDir, ".data", "pglite");
  if (!dataDir.startsWith("memory://")) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  return {
    db: db as unknown as Database,
    migrate: () => migratePglite(db, { migrationsFolder }),
    close: () => client.close(),
  };
}

const database = createDatabase();

export const db = database.db;
export const migrateDatabase = database.migrate;
export const closeDatabase = database.close;
