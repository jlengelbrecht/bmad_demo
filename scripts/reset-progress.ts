#!/usr/bin/env tsx
//
// Reset trainee progress — delete the SQLite file (+ WAL/journal sidecars)
// and tell the user the absolute path that was removed.
//
// Architecture note: this script's deletion target is the project's SQLite
// file (or whatever `BMAD_DATABASE_PATH` resolves to — honored so the e2e
// suite can reset its own isolated DB). The env override is gated to
// `.sqlite` files so a stray env var in the calling shell can't widen the
// deletion target. There is NO command-line argument parsing — a hostile
// or sleepy caller cannot widen the deletion target. The capstone artifact
// tree (under bmad-output, see architecture.md line 202) is intentionally
// untouched (NFR-R3 guarantee).

import path from "node:path";

import { resetProgressAt, resolveProgressTarget } from "../src/lib/db/reset-progress";

const DEFAULT_PATH = path.resolve(process.cwd(), "data", "progress.sqlite");

function main(): number {
  try {
    const target = resolveProgressTarget({
      envPath: process.env.BMAD_DATABASE_PATH,
      defaultPath: DEFAULT_PATH,
    });
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
  } catch (err) {
    console.error(`Reset failed: ${(err as Error).message}`);
    return 1;
  }
}

process.exit(main());
