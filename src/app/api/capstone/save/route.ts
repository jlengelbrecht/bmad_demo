import path from "node:path";

import { writeCapstoneArtifact } from "@/lib/capstone/write-artifact";
import { isCapstoneSessionActive, upsertProgress } from "@/lib/db/progress-db";
import { CapstoneSaveRequest } from "@/lib/db/schemas";

/**
 * Capstone artifact write endpoint (Story 4.2 / FR-3.6).
 *
 * Architecture line 221: one of two POST Route Handlers in v1. The route
 * orchestrates the four-step contract: parse → validate → check-session-
 * active → write file → upsert capstone-step row. The file write happens
 * BEFORE the row upsert so a failed write never leaves a "step complete"
 * row behind (AC8 ordering invariant).
 */
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Invalid request",
        details: { formErrors: ["body is not valid JSON"], fieldErrors: {} },
      },
      { status: 400 },
    );
  }

  const parsed = CapstoneSaveRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { session, step, content } = parsed.data;

  if (!isCapstoneSessionActive(session)) {
    return Response.json(
      { ok: false, error: "Unknown or inactive session" },
      { status: 400 },
    );
  }

  let absolutePath: string;
  try {
    const result = await writeCapstoneArtifact({ session, step, content });
    absolutePath = result.path;
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
  }

  // File is on disk. Now upsert the capstone-step row. If this throws,
  // the file is left in place (idempotent on retry); the row is what
  // failed, so the trainee retries and the second write is a no-op + the
  // row finally lands. The reverse ordering would be silently corrupting.
  try {
    upsertProgress({
      kind: "capstone-step",
      id: `${session}/${step}`,
      completed: true,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    path: path.relative(process.cwd(), absolutePath),
  });
}
