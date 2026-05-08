import "server-only";

import type { Database, Statement } from "better-sqlite3";

import { CAPSTONE_STEP_NAMES, type CapstoneStepName } from "./schemas";

import { getDb } from "./connection";

const CANONICAL_STEP_SET: ReadonlySet<string> = new Set(CAPSTONE_STEP_NAMES);

/*
 * Capstone-session schema-shape decision (Story 4.1)
 * ===================================================
 * The architecture flagged three viable shapes for capstone-session state:
 *   A. Reuse the existing `progress` table; encode "in progress" as
 *      `completed_at IS NULL` and "complete" as a non-NULL ISO string.
 *   B. Add a separate `capstone_sessions` table.
 *   C. Use a kind-value transition (`capstone-session-active` →
 *      `capstone-session-complete`) on the same table.
 *
 * We picked option A. One table, one prepared-statement cache, one
 * mutation primitive (`upsertProgress` for kind=lab|lesson|capstone-step;
 * `markCapstoneSessionComplete` for the final transition). Cost: the
 * `completed_at IS NULL` column overloads two semantics —
 *   - lesson / lab  → "user marked incomplete (or no row exists)"
 *   - capstone-session → "session is in progress"
 * The discriminating filter is always `WHERE kind = ?`, so each query that
 * touches the column knows which reading applies. See architecture
 * §"Data Architecture" line 203 for the encoded conventions.
 */
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
  getRecentCapstone: Statement;
  getCapstoneById: Statement;
  isCapstoneActive: Statement;
  markCapstoneComplete: Statement;
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
    getRecentCapstone: db.prepare(
      // Lex-DESC ordering of compact-UTC ids is also chronological-DESC
      // because the format is fixed-width (Story 4.1 regex enforces 8 + T
      // + 6 + Z). `rowid DESC` is a defensive tiebreaker for the rare case
      // where wallclock and id-time disagree (NTP step-back during a
      // training session) — newer-by-insert wins when ids tie.
      `SELECT id, completed_at AS completedAt
       FROM progress
       WHERE kind = 'capstone-session'
       ORDER BY id DESC, rowid DESC
       LIMIT 1`,
    ),
    getCapstoneById: db.prepare(
      `SELECT id, completed_at AS completedAt
       FROM progress
       WHERE kind = 'capstone-session' AND id = ?`,
    ),
    isCapstoneActive: db.prepare(
      `SELECT 1 AS one
       FROM progress
       WHERE kind = 'capstone-session' AND id = ? AND completed_at IS NULL`,
    ),
    markCapstoneComplete: db.prepare(
      `UPDATE progress
       SET completed_at = ?
       WHERE kind = 'capstone-session' AND id = ? AND completed_at IS NULL`,
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

export type CapstoneSessionRow = {
  id: string;
  completedAt: string | null;
};

/**
 * Return the most-recently-created capstone-session row, or `null`. Sort
 * is `id DESC` — lexicographic ordering on the compact-UTC format is also
 * chronological. Used by `/capstone` overview (Story 4.3).
 */
export function getRecentCapstoneSession(
  db: Database = getDb(),
): CapstoneSessionRow | null {
  const row = statements(db).getRecentCapstone.get() as
    | CapstoneSessionRow
    | undefined;
  return row ?? null;
}

/**
 * Return a capstone-session row by id, or `null` if missing. Used for
 * the `/capstone?session=<id>` historical-session view (Story 4.3).
 */
export function getCapstoneSessionById(
  sessionId: string,
  db: Database = getDb(),
): CapstoneSessionRow | null {
  const row = statements(db).getCapstoneById.get(sessionId) as
    | CapstoneSessionRow
    | undefined;
  return row ?? null;
}

/**
 * `true` iff a capstone-session row exists for `sessionId` AND its
 * `completed_at IS NULL` (i.e., the session is currently in progress).
 * Returns `false` for missing or already-complete sessions. Used as the
 * gate in `POST /api/capstone/save` (Story 4.2).
 *
 * The SQL filters by `completed_at IS NULL` upstream, so any row hit
 * means active — the existence check is the contract.
 */
export function isCapstoneSessionActive(
  sessionId: string,
  db: Database = getDb(),
): boolean {
  return statements(db).isCapstoneActive.get(sessionId) !== undefined;
}

/**
 * Return the set of step-name suffixes (e.g. `'brief'`, `'epic'`) for
 * the given session whose capstone-step row is currently completed.
 *
 * Composes `listCompleted('capstone-step')` and filters in JavaScript:
 * a single trainee will have a small number of capstone sessions, so
 * the O(n) filter beats adding a dedicated prepared statement (rule of
 * three; revisit if a third caller appears).
 */
export function completedStepsForSession(
  sessionId: string,
  db: Database = getDb(),
): ReadonlySet<CapstoneStepName> {
  // Defensive guards: the empty session id would build prefix `'/'` and
  // over-match `/<step>` rows; a session id containing `/` would create
  // a multi-segment prefix. Both shapes are blocked at the Zod boundary
  // upstream; the helper refuses to compute a result regardless.
  if (sessionId === "" || sessionId.includes("/")) return new Set();
  const prefix = `${sessionId}/`;
  const all = listCompleted("capstone-step", db);
  const result = new Set<CapstoneStepName>();
  for (const id of all) {
    if (!id.startsWith(prefix)) continue;
    const suffix = id.slice(prefix.length);
    // Filter to canonical step names so the return type narrows truthfully.
    // A non-canonical suffix (impossible via Zod today; possible via a
    // future migration or direct SQL) is silently dropped.
    if (CANONICAL_STEP_SET.has(suffix)) {
      result.add(suffix as CapstoneStepName);
    }
  }
  return result;
}

/**
 * Transition an in-progress capstone session to complete. UPDATE-only;
 * does NOT insert a missing row and does NOT overwrite an already-complete
 * one. Returns `{ updated: <true if exactly one row changed> }` so callers
 * can distinguish a successful transition from a no-op.
 *
 * **Wiring status (Story 4.1):** the helper is exported but `POST
 * /api/progress` still routes through plain `upsertProgress` for every
 * `kind`. Story 4.4 will add the `kind === 'capstone-session' &&
 * completed === true` branch in the route handler that calls this helper
 * and returns 400 on `{ updated: false }`. Direct callers (storage-layer
 * tests, future scripts) get the strict semantics today.
 *
 * **Collapsed semantic:** both "missing row" and "row already complete"
 * return `{ updated: false }`. Story 4.4 returns 400 for both cases with
 * the same envelope ("Cannot mark inactive or unknown session complete"),
 * so disambiguation isn't load-bearing. Future code that needs to tell
 * them apart should call `getCapstoneSessionById` first.
 */
export function markCapstoneSessionComplete(
  sessionId: string,
  db: Database = getDb(),
): { updated: boolean } {
  const completedAt = new Date().toISOString();
  const result = statements(db).markCapstoneComplete.run(completedAt, sessionId);
  // The (kind, id) PK guarantees at most one match for the WHERE; `=== 1`
  // is the same as `> 0` here, but `=== 1` reads as the contract: "exactly
  // one row should have changed."
  return { updated: result.changes === 1 };
}
