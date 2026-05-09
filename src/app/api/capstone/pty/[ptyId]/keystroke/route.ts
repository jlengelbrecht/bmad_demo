import { z } from "zod";

import * as ptyRegistry from "@/lib/capstone/pty/session-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PTY_ID_RE = /^\d{8}T\d{6}Z(\.[a-z0-9.-]+)?$/;
const MAX_KEYSTROKE_BYTES = 4 * 1024;

const RequestSchema = z.object({
  keystroke: z.string().max(MAX_KEYSTROKE_BYTES),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ptyId: string }> },
): Promise<Response> {
  const { ptyId } = await ctx.params;
  if (!PTY_ID_RE.test(ptyId)) {
    return Response.json(
      { ok: false, error: "Invalid ptyId" },
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
  const session = ptyRegistry.get(ptyId);
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
