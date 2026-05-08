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
  listCompleted: Statement;
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
    listCompleted: db.prepare(
      `SELECT id FROM progress WHERE kind = ? AND completed_at IS NOT NULL`,
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

/**
 * Return the set of `id`s of the given `kind` whose `completed_at` is
 * non-NULL (i.e., currently marked complete). Mark-incomplete rows are
 * excluded. Single SELECT per call; statement cached per-connection.
 */
export function listCompleted(
  kind: ProgressKind,
  db: Database = getDb(),
): ReadonlySet<string> {
  const rows = statements(db).listCompleted.all(kind) as { id: string }[];
  return new Set(rows.map((r) => r.id));
}
