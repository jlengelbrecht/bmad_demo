import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CAPSTONE_DIR } from "./paths";
import { CapstoneTraversalError, writeCapstoneArtifact } from "./write-artifact";

// Valid compact-UTC shape but clearly historical so it's recognizable as
// test data; each test reserves a unique session id and cleans up its
// directory in afterEach.
const TEST_SESSION_PREFIX = "19990101T";
const cleanupSessions: string[] = [];

// Story 4.2 review patch: pre-cleanup any orphaned 19990101T*/ dirs from
// a prior test run that crashed (Ctrl-C, OOM, CI timeout). The afterEach
// cleanup catches the happy path; this beforeAll catches the rest.
beforeEach(() => {
  if (existsSync(CAPSTONE_DIR)) {
    for (const entry of readdirSync(CAPSTONE_DIR)) {
      if (entry.startsWith(TEST_SESSION_PREFIX)) {
        rmSync(path.join(CAPSTONE_DIR, entry), { recursive: true, force: true });
      }
    }
  }
});

afterEach(() => {
  for (const sessionId of cleanupSessions) {
    const sessionDir = path.join(CAPSTONE_DIR, sessionId);
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
  }
  cleanupSessions.length = 0;
});

describe("writeCapstoneArtifact (Story 4.2)", () => {
  it("writes the file at the expected path with the supplied content", async () => {
    const session = "19990101T000001Z";
    cleanupSessions.push(session);

    const result = await writeCapstoneArtifact({
      session,
      step: "brief",
      content: "# Product Brief\n\nThis is the brief.",
    });

    const expected = path.join(CAPSTONE_DIR, session, "brief.md");
    expect(result.path).toBe(expected);
    expect(readFileSync(expected, "utf8")).toBe("# Product Brief\n\nThis is the brief.");
  });

  it("creates the session directory if it does not exist (idempotent mkdir)", async () => {
    const session = "19990101T000002Z";
    cleanupSessions.push(session);
    // Pre-condition: directory does not exist.
    expect(existsSync(path.join(CAPSTONE_DIR, session))).toBe(false);

    await writeCapstoneArtifact({ session, step: "epic", content: "epic content" });

    const target = path.join(CAPSTONE_DIR, session, "epic.md");
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(target, "utf8")).toBe("epic content");
  });

  it("overwrites existing content on a second write to the same step", async () => {
    const session = "19990101T000003Z";
    cleanupSessions.push(session);

    await writeCapstoneArtifact({ session, step: "story-1", content: "first draft" });
    await writeCapstoneArtifact({ session, step: "story-1", content: "second draft" });

    const target = path.join(CAPSTONE_DIR, session, "story-1.md");
    expect(readFileSync(target, "utf8")).toBe("second draft");
  });

  it("rejects a session id containing `..` with CapstoneTraversalError (defense-in-depth)", async () => {
    // The Zod boundary upstream disallows `..` via the compact-UTC regex,
    // but the helper guards independently so a future caller bypassing
    // Zod (a script, a test, a refactor) can't escape CAPSTONE_DIR.
    await expect(
      writeCapstoneArtifact({
        session: "../etc",
        step: "brief",
        content: "should not write",
      }),
    ).rejects.toThrow(CapstoneTraversalError);
  });

  it("rejects a path that resolves outside CAPSTONE_DIR even after deep `..` traversal", async () => {
    await expect(
      writeCapstoneArtifact({
        session: "../../../tmp",
        step: "brief",
        content: "escape attempt",
      }),
    ).rejects.toThrow(CapstoneTraversalError);
  });
});
