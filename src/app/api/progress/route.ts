// Single-line import to satisfy route.test.ts's line-oriented import-
// discipline scan (a Story 3.2 deferred item; bumped here as a one-liner
// fix for now — switching to AST parse remains deferred).
import { getCapstoneSessionById, markCapstoneSessionComplete, upsertProgress } from "@/lib/db/progress-db";
import { ProgressUpsertRequest } from "@/lib/db/schemas";

/**
 * Sole mutation entry point for trainee progress (FR-2.1, FR-2.2).
 *
 * Per architecture's locked decisions:
 *   - "Route Handlers for all mutations. No Server Actions in v1."
 *   - Plain `Response.json({ … }, { status })` — no global middleware,
 *     no error catalog, no logger library beyond `console.error`.
 *
 * Story 4.4 wires the `kind === 'capstone-session' && completed === true`
 * branch through `markCapstoneSessionComplete` so the "must be active"
 * invariant from Story 4.1 is enforced at the API boundary. All other
 * combinations (lesson, lab, capstone-step, and capstone-session-with-
 * completed:false start path) continue to use plain `upsertProgress`.
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

  const parsed = ProgressUpsertRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "Invalid request",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.kind === "capstone-session" && parsed.data.completed === true) {
      const result = markCapstoneSessionComplete(parsed.data.id);
      if (!result.updated) {
        return Response.json(
          { ok: false, error: "Cannot mark inactive or unknown session complete" },
          { status: 400 },
        );
      }
    } else if (parsed.data.kind === "capstone-session" && parsed.data.completed === false) {
      // Story 4.4 review patch: protect an already-complete session row
      // from being silently flipped back to in-progress by a same-second
      // start-click (the compact-UTC id is seconds-precision; if the
      // trainee clicks "Start a new capstone" within the same second
      // their previous session was marked complete, the upsert would
      // reset `completed_at = NULL`).
      const existing = getCapstoneSessionById(parsed.data.id);
      if (existing !== null && existing.completedAt !== null) {
        return Response.json(
          { ok: false, error: "Session id already complete; please retry to get a fresh id" },
          { status: 400 },
        );
      }
      upsertProgress(parsed.data);
    } else {
      upsertProgress(parsed.data);
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
