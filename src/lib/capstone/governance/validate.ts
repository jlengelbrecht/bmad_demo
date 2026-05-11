import path from "node:path";

import type {
  ShapeFsAdapter,
  ShapeValidationResult,
} from "../phases/shapes";

/**
 * Multi-file gate for the governance phase.
 *
 * Governance is the only phase that requires *both* a CODEOWNERS file
 * AND a CONTRIBUTING.md before the trainee can advance to HANDOFF.
 * `validatePhaseShape` (the single-pattern flow used by the prior
 * phases) returns on the first match, which would let the trainee
 * advance with only one of the two files present. This sibling
 * validator looks for both file types and only reports `shapeValid`
 * when both are found and meet the soft min-size check.
 *
 * The search dir is the trainee's `chosenDir` (repo root) — governance
 * files live there or under `.github/`, never under `_bmad-output/`.
 */
const CODEOWNERS_PATHS = [".github/CODEOWNERS", "CODEOWNERS"] as const;
const CONTRIBUTING_PATHS = [".github/CONTRIBUTING.md", "CONTRIBUTING.md"] as const;
const MIN_SIZE_BYTES = 400;

/** Result of a multi-file governance gate check. */
export interface GovernanceValidationResult extends ShapeValidationResult {
  /** Resolved repo-relative path of CODEOWNERS, or null if not found. */
  codeownersPath: string | null;
  /** Resolved repo-relative path of CONTRIBUTING.md, or null if not found. */
  contributingPath: string | null;
}

function findFirstExisting(
  chosenDir: string,
  candidates: readonly string[],
  fsAdapter: ShapeFsAdapter,
): string | null {
  for (const rel of candidates) {
    const abs = path.join(chosenDir, rel);
    if (fsAdapter.existsSync(abs)) return rel;
  }
  return null;
}

export function validateGovernancePhaseShape(
  chosenDir: string,
  fsAdapter: ShapeFsAdapter,
): GovernanceValidationResult {
  const patternsTried = [...CODEOWNERS_PATHS, ...CONTRIBUTING_PATHS];

  const codeownersRel = findFirstExisting(chosenDir, CODEOWNERS_PATHS, fsAdapter);
  const contributingRel = findFirstExisting(
    chosenDir,
    CONTRIBUTING_PATHS,
    fsAdapter,
  );

  const codeownersAbs = codeownersRel
    ? path.join(chosenDir, codeownersRel)
    : null;
  const contributingAbs = contributingRel
    ? path.join(chosenDir, contributingRel)
    : null;

  const codeownersSize = codeownersAbs
    ? fsAdapter.statSync(codeownersAbs).size
    : 0;
  const contributingSize = contributingAbs
    ? fsAdapter.statSync(contributingAbs).size
    : 0;

  const missing: string[] = [];
  if (!codeownersRel) {
    missing.push(
      `CODEOWNERS not found (looked at ${CODEOWNERS_PATHS.join(" or ")})`,
    );
  } else if (codeownersSize < MIN_SIZE_BYTES) {
    missing.push(
      `${codeownersRel} too small (${codeownersSize} bytes; expected at least ${MIN_SIZE_BYTES})`,
    );
  }
  if (!contributingRel) {
    missing.push(
      `CONTRIBUTING.md not found (looked at ${CONTRIBUTING_PATHS.join(" or ")})`,
    );
  } else if (contributingSize < MIN_SIZE_BYTES) {
    missing.push(
      `${contributingRel} too small (${contributingSize} bytes; expected at least ${MIN_SIZE_BYTES})`,
    );
  }

  const bothPresent = codeownersRel !== null && contributingRel !== null;
  const bothMeetMinSize =
    codeownersSize >= MIN_SIZE_BYTES && contributingSize >= MIN_SIZE_BYTES;

  // For the shared `artifactPath` field, surface a comma-joined summary
  // of what was found / where we looked. The chat-phase pane renders
  // this string in the success / failure UI.
  const artifactPath = bothPresent
    ? `${codeownersRel} + ${contributingRel}`
    : chosenDir;

  return {
    artifactExists: bothPresent,
    artifactPath,
    shapeValid: bothPresent && bothMeetMinSize,
    sizeBytes: bothPresent ? codeownersSize + contributingSize : undefined,
    candidates: [codeownersRel, contributingRel].filter(
      (s): s is string => s !== null,
    ),
    patternsTried,
    reason: missing.length > 0 ? missing.join("; ") : undefined,
    codeownersPath: codeownersRel,
    contributingPath: contributingRel,
  };
}

/** Exposed for tests / HANDOFF rendering — the canonical search paths. */
export const GOVERNANCE_PATHS = {
  codeowners: CODEOWNERS_PATHS,
  contributing: CONTRIBUTING_PATHS,
  minSizeBytes: MIN_SIZE_BYTES,
} as const;
