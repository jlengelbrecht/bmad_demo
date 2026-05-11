import path from "node:path";

import type { CapstonePhase } from "../adapters/types";

/**
 * Pattern-based artifact discovery for the phase-done gate.
 *
 * Earlier versions of this module pinned each phase to a single
 * filename (`brief.md`, `epics-and-stories.md`, ...) plus a strict
 * H1+sections shape check. That broke against real BMAD output:
 *   - bmad-product-brief writes `product-brief-<project_name>.md`
 *     (parameterized) — never `brief.md`.
 *   - bmad-create-epics-and-stories writes `epics.md` — not
 *     `epics-and-stories.md`.
 *   - Sections drift across BMAD versions and trainee styles; locking
 *     them was a Procrustean check the user couldn't satisfy.
 *
 * Current shape: each phase declares the subdirectory under the output
 * folder where the artifact lives, an ordered list of filename
 * patterns (canonical first, fallback after), and a soft min-size.
 * The gate trusts the file-on-disk; downstream BMAD skills can reject
 * malformed content with their own quality checks.
 */
export interface PhaseShape {
  /** Subdirectory of the trainee's outputFolder where the artifact lives. */
  searchSubdir: string;
  /**
   * Filename patterns, ordered most-canonical first. The first matching
   * file in `searchSubdir` is the artifact for this phase.
   */
  artifactPatterns: RegExp[];
  /** Soft minimum size to reject suspiciously short artifacts. */
  minSizeBytes: number;
}

export const PHASE_SHAPES: Record<CapstonePhase, PhaseShape> = {
  brief: {
    searchSubdir: "planning-artifacts",
    // Canonical BMAD output: product-brief-<project_name>.md
    // (excluding the -distillate sibling).
    artifactPatterns: [
      /^product-brief-(?!.*-distillate)[a-zA-Z0-9._-]+\.md$/,
      /^product-brief\.md$/,
      /^brief\.md$/,
    ],
    minSizeBytes: 200,
  },
  prd: {
    searchSubdir: "planning-artifacts",
    artifactPatterns: [
      /^prd\.md$/,
      /^product-requirements-document\.md$/i,
    ],
    minSizeBytes: 400,
  },
  architecture: {
    searchSubdir: "planning-artifacts",
    artifactPatterns: [/^architecture\.md$/],
    minSizeBytes: 400,
  },
  "epics-and-stories": {
    searchSubdir: "planning-artifacts",
    // Canonical BMAD output is `epics.md` (per
    // bmad-create-epics-and-stories' customize.toml). Other trainee
    // styles fall through to the broader matchers.
    artifactPatterns: [
      /^epics\.md$/,
      /^epics-and-stories\.md$/,
      /^stories\.md$/,
    ],
    minSizeBytes: 200,
  },
  "implementation-readiness": {
    // bmad-check-implementation-readiness writes
    // `{planning_artifacts}/implementation-readiness-report-<date>.md`.
    // The date suffix shifts per run, so we match the prefix.
    searchSubdir: "planning-artifacts",
    artifactPatterns: [
      /^implementation-readiness-report.*\.md$/,
      /^readiness-report.*\.md$/,
    ],
    minSizeBytes: 200,
  },
  "sprint-planning": {
    // bmad-sprint-planning writes
    // `{implementation_artifacts}/sprint-status.yaml` (per the skill's
    // step-01: `status_file = {implementation_artifacts}/sprint-status.yaml`).
    searchSubdir: "implementation-artifacts",
    artifactPatterns: [/^sprint-status\.yaml$/, /^sprint-status\.yml$/],
    minSizeBytes: 20,
  },
  "dev-story-1.1": {
    // `bmad-create-story` writes the per-story implementation spec to
    // `{implementation_artifacts}/<epic>-<story>-<slug>.md` (per the
    // skill's customize.toml). The `<story>` segment can carry a letter
    // suffix (e.g., `11-1b-...`); the `<epic>` segment can too
    // (`7a-1-...`). The trailing `bmad-dev-story` skill writes code in
    // the trainee's repo + updates the spec file's Dev Agent Record;
    // either way, the phase's deliverable file is the spec on disk.
    //
    // Pattern ordering: canonical numeric-with-optional-letter prefix
    // first, broad markdown fallback after, so a permissive match
    // doesn't shadow a stricter one when both are present.
    searchSubdir: "implementation-artifacts",
    artifactPatterns: [
      /^[\dA-Za-z]+-[\dA-Za-z]+-[a-z0-9-]+\.md$/i,
      /.+\.md$/,
    ],
    minSizeBytes: 400,
  },
  governance: {
    // The governance phase requires BOTH `.github/CODEOWNERS` (or
    // `CODEOWNERS` at repo root) AND `CONTRIBUTING.md` (or
    // `.github/CONTRIBUTING.md`). The phase-done route bypasses
    // validatePhaseShape for governance entirely and calls
    // validateGovernancePhaseShape (sibling fn), which understands the
    // multi-file gate. These settings are placeholders kept only so the
    // keyed Record<CapstonePhase, ...> remains exhaustive — the real
    // shape lives in src/lib/capstone/governance/validate.ts.
    searchSubdir: ".",
    artifactPatterns: [/^(\.github\/)?CODEOWNERS$/, /^(\.github\/)?CONTRIBUTING\.md$/],
    minSizeBytes: 400,
  },
};

export interface ShapeValidationResult {
  /** True iff a file matching one of the phase's artifactPatterns exists. */
  artifactExists: boolean;
  /**
   * Resolved path of the matched artifact (when `artifactExists`); or
   * the search-directory path when no match (so the UI can tell the
   * trainee where we looked).
   */
  artifactPath: string;
  /** True iff artifact exists AND meets the soft min-size check. */
  shapeValid: boolean;
  /** File size in bytes when the artifact was found. */
  sizeBytes?: number;
  /**
   * All `.md` files seen in the search directory at check time. Useful
   * for the failure UI: "we looked for X but found these other files."
   */
  candidates: string[];
  /**
   * Human-readable description of every pattern we tried, in order.
   * Stable across versions so the gate UI can show "we expected one
   * of: ... — did your tool produce something else?"
   */
  patternsTried: string[];
  /** Free-text reason populated only when shapeValid is false. */
  reason?: string;
}

export type ShapeFsAdapter = {
  existsSync: (p: string) => boolean;
  statSync: (p: string) => { size: number };
  readdirSync: (p: string) => string[];
};

export function validatePhaseShape(
  phase: CapstonePhase,
  chosenDir: string,
  outputFolder: string,
  fsAdapter: ShapeFsAdapter,
): ShapeValidationResult {
  const shape = PHASE_SHAPES[phase];
  const searchDir = path.join(chosenDir, outputFolder, shape.searchSubdir);
  const patternsTried = shape.artifactPatterns.map((p) => p.source);

  if (!fsAdapter.existsSync(searchDir)) {
    return {
      artifactExists: false,
      artifactPath: searchDir,
      shapeValid: false,
      candidates: [],
      patternsTried,
      reason: `search directory does not exist: ${searchDir}`,
    };
  }

  let entries: string[];
  try {
    entries = fsAdapter.readdirSync(searchDir);
  } catch (err) {
    return {
      artifactExists: false,
      artifactPath: searchDir,
      shapeValid: false,
      candidates: [],
      patternsTried,
      reason: `could not read search directory (${(err as Error).message})`,
    };
  }

  const candidates = entries.filter((n) => n.endsWith(".md")).sort();

  // Find first match — patterns are ordered most-canonical first, so
  // the canonical name wins when multiple candidates match.
  let matchedName: string | null = null;
  for (const pattern of shape.artifactPatterns) {
    const hit = entries.find((name) => pattern.test(name));
    if (hit) {
      matchedName = hit;
      break;
    }
  }

  if (!matchedName) {
    return {
      artifactExists: false,
      artifactPath: searchDir,
      shapeValid: false,
      candidates,
      patternsTried,
      reason:
        candidates.length > 0
          ? `no file matched the expected patterns; saw: ${candidates.join(", ")}`
          : `no markdown files in ${searchDir}`,
    };
  }

  const filePath = path.join(searchDir, matchedName);
  const sizeBytes = fsAdapter.statSync(filePath).size;
  if (sizeBytes < shape.minSizeBytes) {
    return {
      artifactExists: true,
      artifactPath: filePath,
      shapeValid: false,
      sizeBytes,
      candidates,
      patternsTried,
      reason: `artifact too small (${sizeBytes} bytes; expected at least ${shape.minSizeBytes})`,
    };
  }

  return {
    artifactExists: true,
    artifactPath: filePath,
    shapeValid: true,
    sizeBytes,
    candidates,
    patternsTried,
  };
}

export const PHASE_ORDER: CapstonePhase[] = [
  "brief",
  "prd",
  "architecture",
  "epics-and-stories",
  "implementation-readiness",
  "sprint-planning",
  "dev-story-1.1",
  "governance",
];

export function nextPhase(phase: CapstonePhase): CapstonePhase | null {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}
