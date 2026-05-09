import { z } from "zod";

import * as ptyRegistry from "@/lib/capstone/pty/session-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard cap on per-request keystroke payload. xterm.js fires onData per
// keystroke (including escape sequences), so a single POST is typically
// 1–5 bytes. The 4 KB cap is generous enough for paste events and tight
// enough to refuse a runaway client.
const MAX_KEYSTROKE_BYTES = 4 * 1024;

// Field named `keystroke` (not `data`) so it doesn't shadow Zod's
// `parsed.data` (the parsed-body container) at the call site below.
const RequestSchema = z.object({
  keystroke: z.string().max(MAX_KEYSTROKE_BYTES),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await ctx.params;
  if (!/^\d{8}T\d{6}Z$/.test(sessionId)) {
    return Response.json(
      { ok: false, error: "Invalid sessionId" },
      { status: 400 },
    );
  }

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

  const session = ptyRegistry.get(sessionId);
  if (!session) {
    return Response.json(
      { ok: false, error: "No PTY session for that id" },
      { status: 404 },
    );
  }
  if (session.exitCode !== null) {
    return Response.json(
      { ok: false, error: "PTY has already exited" },
      { status: 409 },
    );
  }

  try {
    session.pty.write(parsed.data.keystroke);
  } catch (err) {
    console.error("pty.write failed", err);
    return Response.json(
      { ok: false, error: "Could not write to PTY" },
      { status: 500 },
    );
  }
  return new Response(null, { status: 204 });
}
