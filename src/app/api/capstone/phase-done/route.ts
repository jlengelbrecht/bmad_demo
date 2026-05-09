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
  // Bounded sliding window — verbose suites can emit megabytes; we only
  // ever return TEST_OUTPUT_TAIL_BYTES, so trim during collection rather
  // than letting the buffer grow unbounded.
  const BUFFER_CAP = TEST_OUTPUT_TAIL_BYTES * 2;
  let collected = "";
  const append = (line: string) => {
    collected += line + "\n";
    if (collected.length > BUFFER_CAP) {
      collected = collected.slice(-TEST_OUTPUT_TAIL_BYTES);
    }
  };
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
      if (ev.kind === "stdout-line") append(ev.text);
      else if (ev.kind === "stderr-line") append(ev.text);
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
  // dev-story-1.1's gate is the test suite, not a shape check — there's
  // no planning artifact for "tests pass." Synthesize a passthrough
  // validation so the response shape stays consistent for all phases.
  const validation =
    phase === "dev-story-1.1"
      ? {
          artifactExists: true,
          artifactPath: "(test-gate phase — no artifact)",
          shapeValid: true,
          missingSections: [],
        }
      : validatePhaseShape(phase, chosenDir, outputFolder, {
          existsSync,
          readFileSync,
          statSync,
        });
  let testGate: TestGateResult | undefined;
  if (phase === "dev-story-1.1") {
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
 * The capstone-step row's id format uses the Story-4.1 step names. The
 * rebuild's `CapstonePhase` enum is wider; we map onto unique step slots
 * so completion of each phase writes a distinct row. `dev-story-1.1` was
 * added to `CAPSTONE_STEP_NAMES` (Story 7a.3 fix) so it no longer
 * collides with `adr`.
 */
function legacyStepName(phase: CapstonePhase): string {
  const map: Record<CapstonePhase, string> = {
    brief: "brief",
    prd: "epic",
    architecture: "story-1",
    "epics-and-stories": "story-2",
    adr: "adr",
    "dev-story-1.1": "dev-story-1.1",
  };
  return map[phase];
}
