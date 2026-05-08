import "server-only";

import type { Database, Statement } from "better-sqlite3";

import { getDb } from "./connection";

export type ProgressKind = "lesson" | "lab" | "capstone-session" | "capstone-step";

export type ProgressEntry = {
  kind: ProgressKind;
  id: string;
  completed: boolean;
};

export type ProgressRecord = {
  completedAt: string | null;
};

// Cache prepared statements per-connection so we don't re-parse SQL on
// every call. better-sqlite3's perf win comes from this.
type PreparedCache = {
  upsert: Statement;
  get: Statement;
};
const stmtCache = new WeakMap<Database, PreparedCache>();

function statements(db: Database): PreparedCache {
  const cached = stmtCache.get(db);
  if (cached) return cached;
  const prepared: PreparedCache = {
    upsert: db.prepare(
      `INSERT INTO progress (kind, id, completed_at)
       VALUES (?, ?, ?)
       ON CONFLICT(kind, id) DO UPDATE SET completed_at = excluded.completed_at`,
    ),
    get: db.prepare(
      `SELECT completed_at AS completedAt FROM progress WHERE kind = ? AND id = ?`,
    ),
  };
  stmtCache.set(db, prepared);
  return prepared;
}

/**
 * Insert or update a progress row.
 *  - `completed: true`  → `completed_at = <fresh ISO 8601 UTC>`
 *  - `completed: false` → `completed_at = NULL`
 *
 * Synchronous (better-sqlite3 is sync). Server Components and Route
 * Handlers can call this directly without `await`.
 */
export function upsertProgress(entry: ProgressEntry, db: Database = getDb()): void {
  const completedAt = entry.completed ? new Date().toISOString() : null;
  statements(db).upsert.run(entry.kind, entry.id, completedAt);
}

/**
 * Read a progress row by composite key. Returns `null` if no row exists,
 * `{ completedAt: <ISO> | null }` otherwise.
 */
export function getProgress(
  kind: ProgressKind,
  id: string,
  db: Database = getDb(),
): ProgressRecord | null {
  const row = statements(db).get.get(kind, id) as ProgressRecord | undefined;
  return row ?? null;
}
