import "server-only";

import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

const REPO_ROOT = path.resolve(process.cwd());
const DATA_DIR = path.join(REPO_ROOT, "data");
const DEFAULT_DB_PATH = path.join(DATA_DIR, "progress.sqlite");
const SCHEMA_PATH = path.join(REPO_ROOT, "src", "db", "schema.sql");

let cached: DatabaseType | null = null;

/**
 * Open a fresh better-sqlite3 connection at `filename` and apply the
 * `progress` schema idempotently. Used both by the production singleton
 * (default `./data/progress.sqlite`) and by Vitest fixtures (in-memory).
 */
export function createDb(filename: string): DatabaseType {
  if (filename !== ":memory:") {
    // Defensive — production path may not have the data/ dir yet on a
    // fresh clone (committed via `data/.gitkeep`), but mkdirSync({recursive})
    // is the cheapest belt-and-suspenders.
    mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new Database(filename);
  if (filename !== ":memory:") {
    // WAL gives concurrent-read sanity for Server Components; in-memory
    // doesn't support journal_mode = WAL.
    db.pragma("journal_mode = WAL");
  }

  const schema = readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  return db;
}

/**
 * Return the production singleton, creating it on first call. Server
 * Components and Route Handlers should call this rather than constructing
 * their own connection.
 */
export function getDb(): DatabaseType {
  if (cached) return cached;
  cached = createDb(DEFAULT_DB_PATH);
  return cached;
}

/** Test-only — close the cached connection so the next `getDb()` reopens. */
export function __resetDbCacheForTests(): void {
  if (cached) {
    cached.close();
    cached = null;
  }
}
