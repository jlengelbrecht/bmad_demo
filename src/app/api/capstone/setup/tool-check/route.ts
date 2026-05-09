import { z } from "zod";

import { getAdapterRegistry } from "@/lib/capstone/adapters";
import type { ToolId } from "@/lib/capstone/adapters/types";

const TOOL_VALUES = ["claude-code", "codex", "github-copilot"] as const satisfies readonly ToolId[];

const RequestSchema = z.object({
  tool: z.enum(TOOL_VALUES),
});

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
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const adapter = getAdapterRegistry().get(parsed.data.tool);
  if (!adapter) {
    return Response.json(
      { ok: false, error: "Unknown tool" },
      { status: 400 },
    );
  }

  try {
    const installed = await adapter.detectInstalled();
    const authed = installed ? await adapter.detectAuthenticated() : null;
    return Response.json({ ok: true, installed, authed });
  } catch (err) {
    console.error("tool-check failed", err);
    return Response.json(
      { ok: true, installed: false, authed: null },
      { status: 200 },
    );
  }
}
