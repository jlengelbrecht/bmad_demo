import {
  existsSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
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

/**
 * Per-phase artifact lookup for the HANDOFF.md "What was produced"
 * section. Each entry has one of three shapes:
 *   - `rel`: a fixed relative path under outputFolder, OR
 *   - `dir` + `pattern`: a directory glob (under outputFolder) — the
 *     first matching file is used. Used for phases whose canonical
 *     filename includes a date (readiness report) or otherwise varies.
 *   - `repoRoot: true` with `candidates`: an ordered list of
 *     repo-root-relative paths to probe. Used for the governance phase,
 *     whose files (CODEOWNERS, CONTRIBUTING.md) live at repo root or
 *     under `.github/`, NOT under outputFolder.
 *
 * Brief uses a glob too because BMAD writes
 * `product-brief-<project_name>.md` parameterized by project name,
 * not a literal `brief.md`.
 */
type ArtifactLookup =
  | { phase: string; rel: string }
  | { phase: string; dir: string; pattern: RegExp }
  | { phase: string; repoRoot: true; candidates: readonly string[] };

const ARTIFACT_PATHS: ArtifactLookup[] = [
  {
    phase: "brief",
    dir: "planning-artifacts",
    pattern: /^product-brief-(?!.*-distillate)[a-zA-Z0-9._-]+\.md$|^brief\.md$/,
  },
  { phase: "prd", rel: "planning-artifacts/prd.md" },
  { phase: "architecture", rel: "planning-artifacts/architecture.md" },
  { phase: "epics-and-stories", rel: "planning-artifacts/epics.md" },
  {
    phase: "implementation-readiness",
    dir: "planning-artifacts",
    pattern: /^implementation-readiness-report.*\.md$/,
  },
  {
    phase: "sprint-planning",
    dir: "implementation-artifacts",
    pattern: /^sprint-status\.ya?ml$/,
  },
  {
    // Governance writes to repo root, not outputFolder. The two files
    // are listed as separate phase entries so HANDOFF.md surfaces them
    // independently — partial production (e.g., CODEOWNERS exists but
    // CONTRIBUTING.md doesn't) renders as one ✓ + one *(not produced)*.
    phase: "governance:codeowners",
    repoRoot: true,
    candidates: [".github/CODEOWNERS", "CODEOWNERS"],
  },
  {
    phase: "governance:contributing",
    repoRoot: true,
    candidates: [".github/CONTRIBUTING.md", "CONTRIBUTING.md"],
  },
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
  for (const lookup of ARTIFACT_PATHS) {
    // Repo-root lookups (governance) — probe candidates at chosenDir,
    // NOT under outputFolder. The displayed path is the repo-rel path
    // verbatim, no outputFolder prefix.
    if ("repoRoot" in lookup) {
      const hit = lookup.candidates.find((rel) =>
        existsSync(path.join(chosenDir, rel)),
      );
      if (hit) {
        const size = statSync(path.join(chosenDir, hit)).size;
        artifactLines.push(
          `- **${lookup.phase}** — \`${hit}\` (${formatSize(size)})`,
        );
      } else {
        artifactLines.push(`- **${lookup.phase}** — *(not produced)*`);
      }
      continue;
    }

    let resolvedRel: string | null = null;
    if ("rel" in lookup) {
      const abs = path.join(chosenDir, outputFolder, lookup.rel);
      if (existsSync(abs)) resolvedRel = lookup.rel;
    } else {
      const dirAbs = path.join(chosenDir, outputFolder, lookup.dir);
      if (existsSync(dirAbs)) {
        try {
          const entries = readdirSync(dirAbs);
          const match = entries.find((name) => lookup.pattern.test(name));
          if (match) resolvedRel = path.join(lookup.dir, match);
        } catch {
          // Directory unreadable — leave resolvedRel null so we report
          // the artifact as not-produced.
        }
      }
    }
    if (resolvedRel) {
      const abs = path.join(chosenDir, outputFolder, resolvedRel);
      const size = statSync(abs).size;
      artifactLines.push(
        `- **${lookup.phase}** — \`${path.join(outputFolder, resolvedRel)}\` (${formatSize(size)})`,
      );
    } else {
      artifactLines.push(`- **${lookup.phase}** — *(not produced)*`);
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
