-- Progress storage for trainee state.
--
-- Architecture reference: _bmad-output/planning-artifacts/architecture.md
-- §"Data Architecture". One table by design — single storage idiom for
-- lessons, labs, capstone-session and capstone-step kinds.
--
-- No `users` table, no `sessions` table, no auth surface. The portal trusts
-- the local user (FR-2.6 / NFR-S2). Adding any auth-adjacent table here is
-- a contract violation and will fail Story 3.1's no-auth-surface smoke
-- test in `src/lib/db/progress-db.test.ts`.
--
-- `kind` values:
--   'lesson'                  — lesson completion (Story 3.x)
--   'lab'                     — lab completion (Story 3.x)
--   'capstone-session'        — capstone session (Epic 4 / rebuilt Epic 5+)
--   'capstone-step'           — Epic 4 per-step textarea artifact (preserved
--                               for historical sessions)
--   'capstone-tool'           — chosen tool id; completed_at overloaded
--   'capstone-target'         — chosen target dir; completed_at overloaded
--   'capstone-tool-session'   — Story 5.7: tool-native session id keyed by
--                               <capstone-session-id>/<phase>
--   'capstone-session-lock'   — Story 6.1: two-tab session lock w/ TTL
--
-- `completed_at` carries:
--   * ISO 8601 UTC string for completed lessons/labs/sessions/phases;
--   * NULL while in-progress;
--   * 'aborted-<ISO>' sentinel for abort-recovered capstone-session rows
--     (Story 6.5);
--   * tool id / chosen path / tool-native session id (column-overload for
--     non-temporal kinds — see architecture §"Data Architecture" line 210).
CREATE TABLE IF NOT EXISTS progress (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  completed_at TEXT NULL,
  PRIMARY KEY (kind, id),
  -- Positional smoke. Story 4.1 enforced the ISO pattern; Stories 5.7 +
  -- 6.1 + 6.5 widened to accept the abort-sentinel + the column-overload
  -- kinds (capstone-tool / capstone-target / capstone-tool-session /
  -- capstone-session-lock) whose completed_at is NOT a timestamp. The
  -- positional check is now a soft guard for ISO consumers — direct
  -- producers of overloaded kinds bypass the LIKE clauses.
  CHECK (
    completed_at IS NULL
    OR completed_at LIKE '____-__-__T__:__:__%Z'
    OR completed_at LIKE 'aborted-%'
    OR kind IN ('capstone-tool', 'capstone-target', 'capstone-tool-session', 'capstone-session-lock')
  )
);
