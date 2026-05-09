// Seed a capstone-session pointing at an already-bootstrapped repo so
// the chat-phase surfaces (`/capstone/chat/<sessionId>/<phase>`) can be
// driven without rerunning the full bootstrap (which takes a real
// `npm install bmad-method`). Used for verification + ad-hoc demos.
//
//   npm run seed-chat-test-session -- /tmp/my-bmad-repo
//
// or with a custom session id (otherwise a fresh compact-UTC id is
// minted on each run):
//
//   CAPSTONE_TEST_SESSION_ID=20260509T040000Z npm run seed-chat-test-session -- /tmp/my-bmad-repo
//
// Idempotent — upserts the (capstone-session, capstone-target,
// capstone-tool) rows; will NOT drop your existing progress data.
//
// Pre-req: the chosenDir must already have BMAD installed
// (look for `_bmad/` and `.claude/skills/`). If you haven't bootstrapped
// it yet, run `npx bmad-method install --directory <path> --tools claude-code`.

import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const chosenDirArg = process.argv[2];
const toolArg = process.argv[3] ?? "claude-code";
const VALID_TOOLS = ["claude-code", "codex", "github-copilot"] as const;
type SeedToolId = (typeof VALID_TOOLS)[number];
if (!chosenDirArg) {
  console.error(
    "Usage: npm run seed-chat-test-session -- <absolute-chosen-dir> [tool]",
  );
  console.error(`  tool: one of ${VALID_TOOLS.join(", ")} (default: claude-code)`);
  process.exit(1);
}
if (!(VALID_TOOLS as readonly string[]).includes(toolArg)) {
  console.error(`Invalid tool '${toolArg}'. Must be one of: ${VALID_TOOLS.join(", ")}`);
  process.exit(1);
}
const tool = toolArg as SeedToolId;
const chosenDir = path.resolve(chosenDirArg);
if (!existsSync(chosenDir)) {
  console.error(`Directory does not exist: ${chosenDir}`);
  process.exit(1);
}
if (!existsSync(path.join(chosenDir, "_bmad"))) {
  console.warn(
    `Warning: ${chosenDir} has no \`_bmad/\` subdir — BMAD may not be installed there. Chat-phase /bmad-* skills will not be available.`,
  );
}

const sessionId =
  process.env.CAPSTONE_TEST_SESSION_ID ?? compactUtcNow();
if (!/^\d{8}T\d{6}Z$/.test(sessionId)) {
  console.error(
    `Invalid CAPSTONE_TEST_SESSION_ID (must match \\d{8}T\\d{6}Z): ${sessionId}`,
  );
  process.exit(1);
}

const dbPath = path.resolve("data", "progress.sqlite");
mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
// Apply schema idempotently — does not drop existing rows.
db.exec(readFileSync(path.resolve("src", "db", "schema.sql"), "utf8"));

const upsert = db.prepare(
  `INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)
     ON CONFLICT(kind, id) DO UPDATE SET completed_at = excluded.completed_at`,
);
upsert.run("capstone-session", sessionId, null);
upsert.run("capstone-target", sessionId, chosenDir);
upsert.run("capstone-tool", sessionId, tool);
db.close();

console.log(`Seeded session in ${dbPath}`);
console.log(`  sessionId=${sessionId}`);
console.log(`  chosenDir=${chosenDir}`);
console.log(`  tool=${tool}`);
console.log("");
console.log("Drive a chat phase via:");
console.log(
  `  http://localhost:3000/capstone/chat/${sessionId}/brief?tool=${tool}`,
);
console.log("(restart `npm run dev` if the server was running before this seed)");

function compactUtcNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}` +
    `${pad(d.getUTCMonth() + 1)}` +
    `${pad(d.getUTCDate())}` +
    `T` +
    `${pad(d.getUTCHours())}` +
    `${pad(d.getUTCMinutes())}` +
    `${pad(d.getUTCSeconds())}` +
    `Z`
  );
}
