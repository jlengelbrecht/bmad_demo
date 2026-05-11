import { existsSync, readdirSync, statSync } from "node:fs";

import { z } from "zod";

import type { CapstonePhase } from "@/lib/capstone/adapters/types";
import { readBmadOutputFolder } from "@/lib/capstone/bootstrap/output-folder";
import { validateGovernancePhaseShape } from "@/lib/capstone/governance/validate";
import {
  nextPhase,
  validatePhaseShape,
} from "@/lib/capstone/phases/shapes";
import {
  getCapstoneTargetDir,
  upsertProgress,
} from "@/lib/db/progress-db";
import { CAPSTONE_PHASE_NAMES } from "@/lib/db/schemas";

export const runtime = "nodejs";

const RequestSchema = z.object({
  sessionId: z.string().regex(/^\d{8}T\d{6}Z$/),
  phase: z.enum(CAPSTONE_PHASE_NAMES),
  acknowledged: z.boolean(),
  dryRun: z.boolean().optional(),
  /**
   * Optional override of the output folder name. By default, the route
   * reads the trainee's actual choice from
   * `<chosenDir>/_bmad/bmm/config.yaml::output_folder` (BMAD persists
   * whatever folder the trainee picked during `npx bmad-method install`,
   * defaulting to `_bmad-output`). Tests can pin this via the override.
   */
  outputFolder: z.string().min(1).max(64).optional(),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const {
    sessionId,
    phase,
    acknowledged,
    dryRun,
    outputFolder: outputFolderOverride,
  } = parsed.data;
  const chosenDir = getCapstoneTargetDir(sessionId);
  if (!chosenDir) {
    return Response.json(
      { ok: false, error: "Session has no chosen directory" },
      { status: 404 },
    );
  }
  // Discover the trainee's actual `output_folder` from their
  // bootstrapped BMAD config; fall back to the request override or the
  // BMAD default. Trainees may pick a custom folder during
  // `npx bmad-method install`, so the gate must respect that choice
  // rather than hardcoding `_bmad-output`.
  const outputFolder = outputFolderOverride ?? readBmadOutputFolder(chosenDir);
  // Per-phase gate selection:
  //   - governance: BOTH .github/CODEOWNERS (or root CODEOWNERS) AND
  //     CONTRIBUTING.md (or .github/CONTRIBUTING.md) must exist + meet
  //     the soft min-size. Multi-file gate; lives in
  //     src/lib/capstone/governance/validate.ts.
  //   - everything else (including dev-story-1.1): single-file pattern
  //     match under outputFolder via PHASE_SHAPES. dev-story-1.1
  //     specifically looks for the story spec file
  //     `<epic>-<story>-<slug>.md` in `<outputFolder>/implementation-artifacts/`,
  //     written by `bmad-create-story`. The earlier test-suite gate
  //     (`npm test` in chosenDir) was dropped — it was orthogonal to
  //     "did BMAD's create-story run?" and added fragility on trainee
  //     repos that may not yet have a configured test command.
  const validation =
    phase === "governance"
      ? validateGovernancePhaseShape(chosenDir, {
          existsSync,
          readdirSync,
          statSync,
        })
      : validatePhaseShape(phase, chosenDir, outputFolder, {
          existsSync,
          readdirSync,
          statSync,
        });
  const valid = validation.shapeValid;
  let advanced = false;
  if (!dryRun && valid && acknowledged) {
    upsertProgress({
      kind: "capstone-step",
      id: `${sessionId}/${legacyStepName(phase)}`,
      completed: true,
    });
    advanced = true;
  }
  return Response.json({
    ok: true,
    valid,
    advanced,
    nextPhase: nextPhase(phase),
    outputFolder,
    outputFolderSource:
      outputFolderOverride !== undefined ? "request-override" : "bmad-config",
    validation,
  });
}

/**
 * The capstone-step row's id format uses the Story-4.1 step names. The
 * rebuild's `CapstonePhase` enum maps onto distinct legacy step slots
 * so each phase writes a distinct row.
 *
 * Historical note: the legacy `'adr'` slot is preserved in
 * `CAPSTONE_STEP_NAMES` for backward compatibility (older session rows
 * may reference it), but the rebuild's `CapstonePhase` no longer
 * includes ADR — BMAD 6.6.0 doesn't ship an ADR skill, and decision
 * rationale lives inline in `architecture.md`.
 */
function legacyStepName(phase: CapstonePhase): string {
  // Phases brief/prd/architecture/epics-and-stories map onto the
  // historical Epic-4 textarea-step slot names (preserves the DB row
  // shape). Phases added post-Epic-4 (implementation-readiness,
  // sprint-planning, dev-story-1.1) use their own names — they were
  // added to CAPSTONE_STEP_NAMES alongside the legacy slots.
  const map: Record<CapstonePhase, string> = {
    brief: "brief",
    prd: "epic",
    architecture: "story-1",
    "epics-and-stories": "story-2",
    "implementation-readiness": "implementation-readiness",
    "sprint-planning": "sprint-planning",
    "dev-story-1.1": "dev-story-1.1",
    governance: "governance",
  };
  return map[phase];
}
