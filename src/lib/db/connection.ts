import "server-only";

import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

const REPO_ROOT = path.resolve(process.cwd());
const DATA_DIR = path.join(REPO_ROOT, "data");

/**
 * Default location for the production SQLite file. Honors
 * `BMAD_DATABASE_PATH` so the e2e test runner can point at a separate
 * file (`./data/e2e-progress.sqlite`) and keep test mutations from
 * polluting the dev portal's progress.
 */
const DEFAULT_DB_PATH = process.env.BMAD_DATABASE_PATH
  ? path.resolve(process.env.BMAD_DATABASE_PATH)
  : path.join(DATA_DIR, "progress.sqlite");

// Resolve the schema. Prefer `import.meta.dirname` (Node 20.11+ ESM, used by
// Vitest) so the path is invariant under chdir; fall back to a cwd-relative
// path because Turbopack (Next.js v16's dev/build runtime) does not populate
// `import.meta.dirname` for App-Router server modules. Production deployment
// is local-only per architecture, so process.cwd() === repo root.
const SCHEMA_PATH = import.meta.dirname
  ? path.resolve(import.meta.dirname, "..", "..", "db", "schema.sql")
  : path.resolve(process.cwd(), "src", "db", "schema.sql");

// Cache on globalThis so the singleton survives Next.js dev HMR reloads —
// otherwise every edit reopens a second file handle and orphans the previous
// one (on Windows, the WAL lock can also block the new handle).
type GlobalDbCache = { __progressDb?: DatabaseType | null };
const globalCache = globalThis as unknown as GlobalDbCache;

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
  try {
    if (filename !== ":memory:") {
      // WAL gives concurrent-read sanity for Server Components; in-memory
      // doesn't support journal_mode = WAL.
      db.pragma("journal_mode = WAL");
    }

    const schema = readFileSync(SCHEMA_PATH, "utf8");
    db.exec(schema);
  } catch (err) {
    // Don't leak the file handle if schema apply fails.
    db.close();
    throw err;
  }

  return db;
}

/**
 * Return the production singleton, creating it on first call. Server
 * Components and Route Handlers should call this rather than constructing
 * their own connection.
 */
export function getDb(): DatabaseType {
  if (globalCache.__progressDb) return globalCache.__progressDb;
  globalCache.__progressDb = createDb(DEFAULT_DB_PATH);
  return globalCache.__progressDb;
}

/** Test-only — close the cached connection so the next `getDb()` reopens. */
export function __resetDbCacheForTests(): void {
  if (globalCache.__progressDb) {
    globalCache.__progressDb.close();
    globalCache.__progressDb = null;
  }
}
