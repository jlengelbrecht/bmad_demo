import { upsertProgress } from "@/lib/db/progress-db";
import { ProgressUpsertRequest } from "@/lib/db/schemas";

/**
 * Sole mutation entry point for trainee progress (FR-2.1, FR-2.2).
 *
 * Per architecture's locked decisions:
 *   - "Route Handlers for all mutations. No Server Actions in v1."
 *   - Plain `Response.json({ … }, { status })` — no global middleware,
 *     no error catalog, no logger library beyond `console.error`.
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
    upsertProgress(parsed.data);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
