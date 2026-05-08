#!/usr/bin/env tsx
//
// Reset trainee progress — delete the SQLite file (+ WAL/journal sidecars)
// and tell the user the absolute path that was removed.
//
// Architecture note: this script's deletion target is hardcoded to
// `data/progress.sqlite` (or whatever `BMAD_DATABASE_PATH` resolves to —
// honored so the e2e suite can reset its own isolated DB). There is NO
// command-line argument parsing — a hostile or sleepy caller cannot widen
// the deletion target. The capstone artifact tree (under bmad-output, see
// architecture.md line 202) is intentionally untouched (NFR-R3 guarantee).

import path from "node:path";

import { resetProgressAt } from "../src/lib/db/reset-progress";

function resolveTargetPath(): string {
  const envPath = process.env.BMAD_DATABASE_PATH;
  if (envPath && envPath.trim().length > 0) {
    return path.resolve(envPath);
  }
  return path.resolve(process.cwd(), "data", "progress.sqlite");
}

function main(): number {
  const target = resolveTargetPath();
  const result = resetProgressAt(target);

  if (result.deleted) {
    console.log(`Deleted: ${result.path}`);
    for (const sidecar of result.sidecarsDeleted) {
      console.log(`Deleted: ${sidecar}`);
    }
  } else {
    console.log(`nothing to reset (no progress file at ${result.path})`);
  }
  return 0;
}

process.exit(main());
