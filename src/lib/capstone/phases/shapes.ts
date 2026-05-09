import path from "node:path";

import type { CapstonePhase } from "../adapters/types";

export interface PhaseShape {
  /** Resolves the expected artifact path for the phase. */
  artifactPath: (chosenDir: string, outputFolder: string) => string;
  /** Regex that the file's H1 line must match. */
  requiredH1Pattern: RegExp;
  /** Exact-match section names (`## <name>`) the file must contain. */
  requiredSections: string[];
  /** Soft minimum size to reject suspiciously short artifacts. */
  minSizeBytes: number;
}

export const PHASE_SHAPES: Record<CapstonePhase, PhaseShape> = {
  brief: {
    artifactPath: (cd, of) => path.join(cd, of, "planning-artifacts", "brief.md"),
    requiredH1Pattern: /^#\s+Product Brief/m,
    requiredSections: ["Customer", "Problem", "Solution", "Success Criteria", "Scope"],
    minSizeBytes: 200,
  },
  prd: {
    artifactPath: (cd, of) => path.join(cd, of, "planning-artifacts", "prd.md"),
    requiredH1Pattern: /^#\s+Product Requirements Document/m,
    requiredSections: [
      "Executive Summary",
      "Success Criteria",
      "Product Scope",
      "Functional Requirements",
    ],
    minSizeBytes: 400,
  },
  architecture: {
    artifactPath: (cd, of) => path.join(cd, of, "planning-artifacts", "architecture.md"),
    requiredH1Pattern: /^#\s+Architecture/m,
    requiredSections: [
      "Stack and Runtime",
      "Data Architecture",
      "Frontend Architecture",
      "Test Strategy",
    ],
    minSizeBytes: 500,
  },
  "epics-and-stories": {
    artifactPath: (cd, of) =>
      path.join(cd, of, "planning-artifacts", "epics-and-stories.md"),
    requiredH1Pattern: /^#\s+Epics and Stories/m,
    requiredSections: ["Epic 1"],
    minSizeBytes: 200,
  },
  adr: {
    artifactPath: (cd, of) =>
      path.join(cd, of, "planning-artifacts", "adr-001.md"),
    requiredH1Pattern: /^#\s+ADR/m,
    requiredSections: ["Status", "Context", "Decision", "Consequences"],
    minSizeBytes: 100,
  },
  "dev-story-1.1": {
    artifactPath: (cd) => path.join(cd, ".bmad", "story-1.1-tests.txt"),
    requiredH1Pattern: /tests?:.*pass/i,
    requiredSections: [],
    minSizeBytes: 1,
  },
};

export interface ShapeValidationResult {
  artifactExists: boolean;
  artifactPath: string;
  shapeValid: boolean;
  missingSections: string[];
  sizeBytes?: number;
  reason?: string;
}

export function validatePhaseShape(
  phase: CapstonePhase,
  chosenDir: string,
  outputFolder: string,
  fsAdapter: {
    existsSync: (p: string) => boolean;
    readFileSync: (p: string, enc: "utf8") => string;
    statSync: (p: string) => { size: number };
  },
): ShapeValidationResult {
  const shape = PHASE_SHAPES[phase];
  const filePath = shape.artifactPath(chosenDir, outputFolder);
  if (!fsAdapter.existsSync(filePath)) {
    return {
      artifactExists: false,
      artifactPath: filePath,
      shapeValid: false,
      missingSections: shape.requiredSections,
      reason: "artifact file does not exist",
    };
  }
  const sizeBytes = fsAdapter.statSync(filePath).size;
  if (sizeBytes < shape.minSizeBytes) {
    return {
      artifactExists: true,
      artifactPath: filePath,
      shapeValid: false,
      missingSections: [],
      sizeBytes,
      reason: `artifact too small (${sizeBytes} bytes; minimum ${shape.minSizeBytes})`,
    };
  }
  const text = fsAdapter.readFileSync(filePath, "utf8");
  if (!shape.requiredH1Pattern.test(text)) {
    return {
      artifactExists: true,
      artifactPath: filePath,
      shapeValid: false,
      missingSections: [],
      sizeBytes,
      reason: `artifact H1 does not match ${shape.requiredH1Pattern}`,
    };
  }
  const missing: string[] = [];
  for (const section of shape.requiredSections) {
    const re = new RegExp(`^##\\s+${section}\\b`, "m");
    if (!re.test(text)) missing.push(section);
  }
  return {
    artifactExists: true,
    artifactPath: filePath,
    shapeValid: missing.length === 0,
    missingSections: missing,
    sizeBytes,
  };
}

export const PHASE_ORDER: CapstonePhase[] = [
  "brief",
  "prd",
  "architecture",
  "epics-and-stories",
  "adr",
  "dev-story-1.1",
];

export function nextPhase(phase: CapstonePhase): CapstonePhase | null {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}
