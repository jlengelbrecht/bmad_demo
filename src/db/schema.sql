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
--   'lesson'           — lesson completion (Story 3.x)
--   'lab'              — lab completion (Story 3.x)
--   'capstone-session' — capstone session (Epic 4)
--   'capstone-step'    — per-step capstone artifact (Epic 4)
--
-- `completed_at` is an ISO 8601 UTC string when set, NULL when reset.
CREATE TABLE IF NOT EXISTS progress (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  completed_at TEXT NULL,
  PRIMARY KEY (kind, id)
);
