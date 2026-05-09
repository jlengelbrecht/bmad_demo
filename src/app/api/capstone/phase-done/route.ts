import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import type { CapstonePhase } from "@/lib/capstone/adapters/types";
import {
  nextPhase,
  validatePhaseShape,
} from "@/lib/capstone/phases/shapes";
import { runStreaming } from "@/lib/capstone/subprocess/run-streaming";
import {
  getCapstoneTargetDir,
  upsertProgress,
} from "@/lib/db/progress-db";
import { CAPSTONE_PHASE_NAMES } from "@/lib/db/schemas";

export const runtime = "nodejs";

const TEST_GATE_TIMEOUT_MS = 5 * 60 * 1000;
const TEST_OUTPUT_TAIL_BYTES = 4 * 1024;

type TestGateStatus = "green" | "red" | "no-test-command" | "timeout";

export interface TestGateResult {
  status: TestGateStatus;
  exitCode?: number;
  durationMs?: number;
  output?: string;
  message?: string;
}

async function runTestGate(chosenDir: string): Promise<TestGateResult> {
  const pkgPath = path.join(chosenDir, "package.json");
  if (!existsSync(pkgPath)) {
    return {
      status: "no-test-command",
      message:
        'No package.json found at the chosen directory; add one and a "test" script before continuing.',
    };
  }
  let pkg: { scripts?: Record<string, string> };
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as typeof pkg;
  } catch {
    return {
      status: "no-test-command",
      message: "package.json could not be parsed.",
    };
  }
  if (!pkg.scripts?.test) {
    return {
      status: "no-test-command",
      message:
        'No "test" script found in package.json. Add one before continuing.',
    };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TEST_GATE_TIMEOUT_MS);
  const start = Date.now();
  let collected = "";
  let exitCode: number | null = null;
  let timedOut = false;
  try {
    for await (const ev of runStreaming({
      cmd: "npm",
      args: ["test"],
      cwd: chosenDir,
      signal: ctrl.signal,
      metadata: { kind: "tool-check" },
    })) {
      if (ev.kind === "stdout-line") collected += ev.text + "\n";
      else if (ev.kind === "stderr-line") collected += ev.text + "\n";
      else if (ev.kind === "exit") {
        exitCode = ev.code;
        if (ev.signal === "SIGTERM" || ev.signal === "SIGKILL") timedOut = true;
      }
    }
  } catch (err) {
    return {
      status: "red",
      exitCode: -1,
      durationMs: Date.now() - start,
      output: (err instanceof Error ? err.message : String(err)).slice(
        -TEST_OUTPUT_TAIL_BYTES,
      ),
    };
  } finally {
    clearTimeout(timer);
  }
  const tail = collected.slice(-TEST_OUTPUT_TAIL_BYTES);
  if (timedOut) {
    return {
      status: "timeout",
      durationMs: Date.now() - start,
      output: tail,
      message:
        "Test run exceeded 5 minutes; the gate timed out. Re-run after the suite settles.",
    };
  }
  return {
    status: exitCode === 0 ? "green" : "red",
    exitCode: exitCode ?? -1,
    durationMs: Date.now() - start,
    output: tail,
  };
}

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
  let testGate: TestGateResult | undefined;
  if (phase === "dev-story-1.1" && validation.shapeValid) {
    testGate = await runTestGate(chosenDir);
  }
  const valid =
    validation.shapeValid &&
    (phase !== "dev-story-1.1" ||
      (testGate !== undefined && testGate.status === "green"));
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
    ...(testGate ? { testGate } : {}),
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
