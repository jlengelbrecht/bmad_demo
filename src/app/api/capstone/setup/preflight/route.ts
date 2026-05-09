import { z } from "zod";

import { runPreflightChecks } from "@/lib/capstone/preflight/checks";

const RequestSchema = z.object({}).strict();

export async function POST(req: Request): Promise<Response> {
  let body: unknown = {};
  // Body is optional — accept no body, empty string, or `{}`. Anything
  // else must JSON-parse and pass the strict empty-object schema.
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const text = await req.text();
    if (text.length > 0) {
      try {
        body = JSON.parse(text);
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
    }
  }
  const parsed = RequestSchema.safeParse(body);
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
    const result = await runPreflightChecks();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
