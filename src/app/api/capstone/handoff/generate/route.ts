import { existsSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import { readInstalledBmadVersion } from "@/lib/capstone/bootstrap/bmad-version";
import { renderHandoff } from "@/lib/capstone/handoff/render";
import { runStreaming } from "@/lib/capstone/subprocess/run-streaming";
import {
  getCapstoneTargetDir,
  getCapstoneTool,
} from "@/lib/db/progress-db";

export const runtime = "nodejs";

const RequestSchema = z.object({
  sessionId: z.string().regex(/^\d{8}T\d{6}Z$/),
  projectName: z.string().regex(/^[a-z][a-z0-9-]{1,63}$/).optional(),
  outputFolder: z.string().min(1).max(64).default("_bmad-output"),
});

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex (OpenAI)",
  "github-copilot": "GitHub Copilot CLI",
};

const ARTIFACT_PATHS: { phase: string; rel: string }[] = [
  { phase: "brief", rel: "planning-artifacts/brief.md" },
  { phase: "prd", rel: "planning-artifacts/prd.md" },
  { phase: "architecture", rel: "planning-artifacts/architecture.md" },
  { phase: "epics-and-stories", rel: "planning-artifacts/epics.md" },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function captureGitLog(chosenDir: string): Promise<string> {
  let collected = "";
  let exitCode: number | null = null;
  try {
    for await (const ev of runStreaming({
      cmd: "git",
      args: ["log", "--oneline", "-n", "5"],
      cwd: chosenDir,
    })) {
      if (ev.kind === "stdout-line") collected += ev.text + "\n";
      else if (ev.kind === "exit") exitCode = ev.code;
    }
  } catch {
    return "(git log unavailable)";
  }
  return exitCode === 0 ? collected.trim() : "(git log unavailable)";
}

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
  const { sessionId, projectName, outputFolder } = parsed.data;
  const chosenDir = getCapstoneTargetDir(sessionId);
  if (!chosenDir) {
    return Response.json(
      { ok: false, error: "Session has no chosen directory" },
      { status: 404 },
    );
  }
  if (!existsSync(chosenDir)) {
    return Response.json(
      { ok: false, error: "Chosen directory no longer exists" },
      { status: 500 },
    );
  }
  const tool = getCapstoneTool(sessionId);
  const toolDisplayName =
    tool === null ? "<unknown>" : (TOOL_DISPLAY_NAMES[tool] ?? tool);

  const artifactLines: string[] = [];
  for (const { phase, rel } of ARTIFACT_PATHS) {
    const abs = path.join(chosenDir, outputFolder, rel);
    if (existsSync(abs)) {
      const size = statSync(abs).size;
      artifactLines.push(
        `- **${phase}** — \`${path.join(outputFolder, rel)}\` (${formatSize(size)})`,
      );
    } else {
      artifactLines.push(`- **${phase}** — *(not produced)*`);
    }
  }

  // Read the version from the trainee's bootstrapped repo, not the
  // portal's own install — the trainee may have bootstrapped against a
  // newer BMAD than the portal was tested against (we install @latest).
  let bmadVersion: string;
  try {
    bmadVersion = readInstalledBmadVersion(chosenDir);
  } catch {
    bmadVersion = "<unknown>";
  }

  const gitLog = await captureGitLog(chosenDir);

  const handoff = renderHandoff({
    projectName: projectName ?? path.basename(chosenDir),
    chosenDir,
    toolDisplayName,
    artifactList: artifactLines.join("\n"),
    gitLogOutput: gitLog,
    bmadVersion,
    date: new Date().toISOString().slice(0, 10),
  });

  const targetPath = path.resolve(chosenDir, "HANDOFF.md");
  const root = path.resolve(chosenDir);
  if (!targetPath.startsWith(root + path.sep) && targetPath !== root) {
    return Response.json(
      { ok: false, error: "Path traversal blocked" },
      { status: 500 },
    );
  }
  const tmpPath = `${targetPath}.tmp`;
  try {
    writeFileSync(tmpPath, handoff, "utf8");
    renameSync(tmpPath, targetPath);
  } catch (err) {
    console.error("HANDOFF.md write failed", err);
    return Response.json(
      { ok: false, error: "Could not write HANDOFF.md" },
      { status: 500 },
    );
  }

  let sizeBytes = 0;
  try {
    sizeBytes = statSync(targetPath).size;
  } catch {
    // ignore
  }

  return Response.json({ ok: true, path: targetPath, sizeBytes });
}
