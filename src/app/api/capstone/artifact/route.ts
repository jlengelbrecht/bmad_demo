import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import { getCapstoneTargetDir } from "@/lib/db/progress-db";

export const runtime = "nodejs";

const PHASE_TO_FILE: Record<string, string> = {
  brief: "brief.md",
  prd: "prd.md",
  architecture: "architecture.md",
  "epics-and-stories": "epics-and-stories.md",
  adr: "adr.md",
  "dev-story-1.1": "stories/1.1.md",
};

const QuerySchema = z.object({
  session: z.string().regex(/^\d{8}T\d{6}Z$/),
  phase: z.enum([
    "brief",
    "prd",
    "architecture",
    "epics-and-stories",
    "adr",
    "dev-story-1.1",
  ]),
  outputFolder: z.string().min(1).max(64).default("_bmad-output"),
});

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    session: url.searchParams.get("session") ?? undefined,
    phase: url.searchParams.get("phase") ?? undefined,
    outputFolder: url.searchParams.get("outputFolder") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { session, phase, outputFolder } = parsed.data;

  const chosenDir = getCapstoneTargetDir(session);
  if (!chosenDir) {
    return Response.json(
      { ok: false, error: "Session has no recorded chosen directory" },
      { status: 404 },
    );
  }

  const expected = path.join(outputFolder, PHASE_TO_FILE[phase]);
  const candidate = path.resolve(chosenDir, expected);
  // Path-traversal guard: the resolved file must live under chosenDir.
  const root = path.resolve(chosenDir);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    return Response.json(
      { ok: false, error: "Path traversal blocked" },
      { status: 400 },
    );
  }
  if (!existsSync(candidate)) {
    return Response.json({
      ok: false,
      error: "not-found",
      expectedPath: path.relative(chosenDir, candidate),
    });
  }
  let content: string;
  let sizeBytes: number;
  try {
    content = readFileSync(candidate, "utf8");
    sizeBytes = statSync(candidate).size;
  } catch (err) {
    console.error("artifact read failed", err);
    return Response.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
  return Response.json({
    ok: true,
    path: path.relative(chosenDir, candidate),
    content,
    sizeBytes,
  });
}
