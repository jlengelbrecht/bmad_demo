import { z } from "zod";

/**
 * Compact-UTC capstone-session id format (Story 4.1).
 *
 * Architecture line 401: "compact UTC (`20260507T143022Z` — no dashes,
 * no colons). It's both a SQLite `id` value and a directory name; the
 * format chosen avoids filesystem-unsafe characters across macOS / Linux
 * / WSL2."
 *
 * The regex enforces shape (digit positions + T/Z markers), not
 * temporal validity — `00000000T253022Z` would parse. Per the
 * architecture's local-only single-trainee threat model, deeper temporal
 * validation isn't load-bearing; downstream consumers that touch the
 * filesystem rely on the path-traversal guard in `write-artifact.ts`,
 * not the temporal correctness of the id.
 */
export const CAPSTONE_SESSION_ID = /^\d{8}T\d{6}Z$/;

/**
 * Canonical capstone step names. Single source of truth: the regex
 * `CAPSTONE_STEP_ID` and the parametric tests in `progress-db.test.ts`
 * iterate over this constant rather than re-declaring the literal list.
 *
 * Historical entries (`epic`, `story-1`, `story-2`, `adr`) are preserved
 * for backward compatibility with any session-step rows from the
 * Epic-4 textarea capstone era. New phases use their CapstonePhase
 * names directly.
 */
export const CAPSTONE_STEP_NAMES = [
  "brief",
  "epic",
  "story-1",
  "story-2",
  "adr",
  "dev-story-1.1",
  "implementation-readiness",
  "sprint-planning",
  "governance",
] as const;

export type CapstoneStepName = (typeof CAPSTONE_STEP_NAMES)[number];

/**
 * Capstone-step id format (Story 4.1): `<session-timestamp>/<step-name>`.
 * Built from `CAPSTONE_STEP_NAMES` so the regex stays in sync with the
 * canonical list. Step names are regex-escaped to keep dotted names
 * (`dev-story-1.1`) literal rather than wildcard.
 */
const STEP_NAMES_RE = CAPSTONE_STEP_NAMES.map((n) =>
  n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).join("|");
export const CAPSTONE_STEP_ID = new RegExp(
  `^\\d{8}T\\d{6}Z\\/(${STEP_NAMES_RE})$`,
);

/**
 * Rebuilt-capstone phase names (Story 5.7+). Distinct from the legacy
 * `CAPSTONE_STEP_NAMES` set above (those were the Epic-4 textarea-form
 * artifacts). The rebuild's chat phases drive primer selection and
 * `capstone-tool-session` row keys.
 *
 * History:
 *  - `adr` removed 2026-05-10 — BMAD 6.6.0 doesn't ship an ADR skill;
 *    decision rationale lives inline in `architecture.md`.
 *  - `implementation-readiness` and `sprint-planning` added 2026-05-10
 *    after a codex walkthrough hit "no sprint-status.yaml" because the
 *    capstone jumped from epics-and-stories straight to dev-story-1.1,
 *    skipping the readiness gate (3-solutioning) and sprint init
 *    (4-implementation) that BMAD's manifest marks `required`.
 *  - `governance` added (Epic 14 / Story 14.1) — terminal phase that
 *    authors `.github/CODEOWNERS` + `CONTRIBUTING.md` so the trainee
 *    walks away with real, git-native team-governance scaffolding, not
 *    just a planning bundle.
 */
export const CAPSTONE_PHASE_NAMES = [
  "brief",
  "prd",
  "architecture",
  "epics-and-stories",
  "implementation-readiness",
  "sprint-planning",
  "dev-story-1.1",
  "governance",
] as const;

export type CapstonePhaseName = (typeof CAPSTONE_PHASE_NAMES)[number];

/**
 * Request shape for `POST /api/progress` (Stories 3.2 + 4.1 + 4.4).
 *
 * Discriminated by `kind`. Architecture line 221 specifies the endpoint
 * accepts all four kinds; per-kind id-format validation happens at this
 * boundary rather than inside the storage layer.
 *
 *  - `lesson` / `lab`        — id is a non-empty trimmed string ≤ 200 chars
 *                              (Story 3.1 contract; preserved verbatim).
 *  - `capstone-session`      — id matches CAPSTONE_SESSION_ID.
 *  - `capstone-step`         — id matches CAPSTONE_STEP_ID.
 */
const lessonRequest = z.object({
  kind: z.literal("lesson"),
  id: z.string().trim().min(1).max(200),
  completed: z.boolean(),
});

const labRequest = z.object({
  kind: z.literal("lab"),
  id: z.string().trim().min(1).max(200),
  completed: z.boolean(),
});

const capstoneSessionRequest = z.object({
  kind: z.literal("capstone-session"),
  id: z.string().regex(CAPSTONE_SESSION_ID),
  completed: z.boolean(),
});

const capstoneStepRequest = z.object({
  kind: z.literal("capstone-step"),
  id: z.string().regex(CAPSTONE_STEP_ID),
  completed: z.boolean(),
});

export const ProgressUpsertRequest = z.discriminatedUnion("kind", [
  lessonRequest,
  labRequest,
  capstoneSessionRequest,
  capstoneStepRequest,
]);

export type ProgressUpsertRequest = z.infer<typeof ProgressUpsertRequest>;
