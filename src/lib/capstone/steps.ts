import { CAPSTONE_STEP_NAMES, type CapstoneStepName } from "@/lib/db/schemas";

/**
 * Canonical capstone step order (Story 4.3).
 *
 * Architecture line 234: the resume mechanism walks this sequence to
 * pick "next incomplete step." Same array as `CAPSTONE_STEP_NAMES`
 * (from `schemas.ts`); re-exported here under the order-specific name
 * so consumers can self-document intent: regex consumers reach for
 * `CAPSTONE_STEP_NAMES`; sequence consumers reach for `CAPSTONE_STEP_ORDER`.
 */
export const CAPSTONE_STEP_ORDER = CAPSTONE_STEP_NAMES;

export type { CapstoneStepName };

/**
 * Per-step trainee-facing metadata (Story 4.4). Title is the page
 * heading; promptOutline is a one-paragraph hint describing what the
 * trainee should produce. Full prompt content is Epic 6's curriculum
 * scope; this is the v1 outline-only placeholder per the AC.
 */
export type StepMetadata = {
  title: string;
  promptOutline: string;
};

export const CAPSTONE_STEPS: Record<CapstoneStepName, StepMetadata> = {
  brief: {
    title: "Product Brief",
    promptOutline:
      "Capture the customer, the problem, the chosen solution, and one success metric. Keep it under a page — the brief frames everything that follows.",
  },
  epic: {
    title: "Epic Outline",
    promptOutline:
      "Sketch a single epic that delivers the brief. Name the epic, list 4–6 candidate stories with one-line summaries, and call out one explicit non-capability (something the epic does NOT do).",
  },
  "story-1": {
    title: "User Story #1",
    promptOutline:
      "Pick the first story from your epic and expand it. Write the As-a/I-want/So-that statement plus 3–5 acceptance criteria in Given/When/Then form. Keep ACs testable and observable.",
  },
  "story-2": {
    title: "User Story #2",
    promptOutline:
      "Pick a second story (one that depends on or interacts with story-1) and apply the same template. The pair should expose a real seam in the epic — not two trivially-independent stories.",
  },
  adr: {
    title: "Architecture Decision Record",
    promptOutline:
      "Document one architectural decision your epic forces (e.g., schema shape, framework pick, integration choice). Include the choice, the rejected alternatives, and the consequences.",
  },
};

/**
 * Walk `CAPSTONE_STEP_ORDER` and return the first step not in
 * `completedSteps`, or `null` if every step is complete. The walk is
 * order-driven, not input-driven: a session that has `epic` complete
 * but `brief` incomplete still routes to `brief` first.
 */
export function nextIncompleteStep(
  completedSteps: ReadonlySet<CapstoneStepName>,
): CapstoneStepName | null {
  for (const step of CAPSTONE_STEP_ORDER) {
    if (!completedSteps.has(step)) return step;
  }
  return null;
}

/**
 * Return the step that comes after `step` in `CAPSTONE_STEP_ORDER`, or
 * `null` if `step` is the final step. Used by Story 4.4's per-step page
 * to compute `nextStepHref`.
 */
export function nextStepAfter(step: CapstoneStepName): CapstoneStepName | null {
  const index = CAPSTONE_STEP_ORDER.indexOf(step);
  if (index === -1 || index === CAPSTONE_STEP_ORDER.length - 1) return null;
  return CAPSTONE_STEP_ORDER[index + 1];
}
