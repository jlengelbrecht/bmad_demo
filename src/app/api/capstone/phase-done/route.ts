import { existsSync, readFileSync, statSync } from "node:fs";

import { z } from "zod";

import type { CapstonePhase } from "@/lib/capstone/adapters/types";
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
  outputFolder: z.string().min(1).max(64).default("_bmad-output"),
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
  const { sessionId, phase, acknowledged, dryRun, outputFolder } = parsed.data;
  const chosenDir = getCapstoneTargetDir(sessionId);
  if (!chosenDir) {
    return Response.json(
      { ok: false, error: "Session has no chosen directory" },
      { status: 404 },
    );
  }
  const validation = validatePhaseShape(phase, chosenDir, outputFolder, {
    existsSync,
    readFileSync,
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
    validation,
  });
}

/**
 * The capstone-step row's legacy id format uses the Story-4.1 step
 * names (brief, epic, story-1, story-2, adr). For Story 7a.3 we map
 * the rebuilt CapstonePhase enum onto a flattened slug that fits the
 * existing CAPSTONE_STEP_ID regex; if/when CAPSTONE_STEP_ID is widened
 * to include the new phase names, this mapping collapses.
 */
function legacyStepName(phase: CapstonePhase): string {
  const map: Record<CapstonePhase, string> = {
    brief: "brief",
    prd: "epic", // closest legacy slot
    architecture: "story-1",
    "epics-and-stories": "story-2",
    adr: "adr",
    "dev-story-1.1": "adr", // legacy set has no slot — collapse onto adr
  };
  return map[phase];
}
