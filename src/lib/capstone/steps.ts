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
