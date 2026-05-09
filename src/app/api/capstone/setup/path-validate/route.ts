import { accessSync, constants, existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";

import { z } from "zod";

import { isPathAllowed } from "@/lib/capstone/bootstrap/path-allowlist";

const RequestSchema = z.object({
  path: z.string().min(1).max(4096),
});

type Status =
  | "ok-empty"
  | "ok-create"
  | "warn-non-empty"
  | "block-allowlist"
  | "block-existing-git"
  | "block-existing-bmad"
  | "block-malformed"
  | "block-unwritable";

interface ValidateResponse {
  ok: true;
  valid: boolean;
  status: Status;
  message: string;
  requiresTypedConfirm?: boolean;
  resolvedPath?: string;
}

function buildResponse(payload: ValidateResponse): Response {
  return Response.json(payload);
}

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

  const result = isPathAllowed(parsed.data.path, homedir(), process.cwd());
  if (!result.allowed) {
    return buildResponse({
      ok: true,
      valid: false,
      status: "block-allowlist",
      message: result.reason,
      resolvedPath: result.resolved,
    });
  }
  const resolved = result.resolved;

  if (!existsSync(resolved)) {
    return buildResponse({
      ok: true,
      valid: true,
      status: "ok-create",
      message: `${resolved} does not exist yet — bootstrap will create it.`,
      resolvedPath: resolved,
    });
  }

  let stat;
  try {
    stat = statSync(resolved);
  } catch (err) {
    return buildResponse({
      ok: true,
      valid: false,
      status: "block-malformed",
      message: `Could not stat ${resolved}: ${(err as Error).message}`,
      resolvedPath: resolved,
    });
  }
  if (!stat.isDirectory()) {
    return buildResponse({
      ok: true,
      valid: false,
      status: "block-malformed",
      message: `${resolved} is not a directory.`,
      resolvedPath: resolved,
    });
  }

  let entries: string[];
  try {
    entries = readdirSync(resolved);
  } catch (err) {
    return buildResponse({
      ok: true,
      valid: false,
      status: "block-unwritable",
      message: `Cannot read ${resolved}: ${(err as Error).message}`,
      resolvedPath: resolved,
    });
  }

  const filtered = entries.filter((e) => e !== ".DS_Store");
  if (filtered.includes("_bmad")) {
    return buildResponse({
      ok: true,
      valid: false,
      status: "block-existing-bmad",
      message: `${resolved} already contains a BMAD installation. Pick a fresh path.`,
      resolvedPath: resolved,
    });
  }
  if (filtered.includes(".git")) {
    return buildResponse({
      ok: true,
      valid: false,
      status: "block-existing-git",
      message: `${resolved} is already a git repository — protected. Pick a fresh path.`,
      resolvedPath: resolved,
    });
  }
  if (filtered.length === 0) {
    try {
      accessSync(resolved, constants.W_OK);
    } catch {
      return buildResponse({
        ok: true,
        valid: false,
        status: "block-unwritable",
        message: `${resolved} exists but is not writable.`,
        resolvedPath: resolved,
      });
    }
    return buildResponse({
      ok: true,
      valid: true,
      status: "ok-empty",
      message: `${resolved} is an empty directory — bootstrap will populate it.`,
      resolvedPath: resolved,
    });
  }

  try {
    accessSync(resolved, constants.W_OK);
  } catch {
    return buildResponse({
      ok: true,
      valid: false,
      status: "block-unwritable",
      message: `${resolved} exists but is not writable.`,
      resolvedPath: resolved,
    });
  }
  return buildResponse({
    ok: true,
    valid: true,
    status: "warn-non-empty",
    message: `${resolved} exists and contains files. Type the literal path '${resolved}' to confirm before bootstrapping.`,
    requiresTypedConfirm: true,
    resolvedPath: resolved,
  });
}
