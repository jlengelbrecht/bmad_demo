import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CAPSTONE_DIR } from "./paths";
import { readCapstoneArtifact } from "./read-artifact";
import { CapstoneTraversalError } from "./write-artifact";

const cleanupSessions: string[] = [];

beforeEach(() => {
  if (existsSync(CAPSTONE_DIR)) {
    for (const entry of readdirSync(CAPSTONE_DIR)) {
      if (entry.startsWith("19990101T")) {
        rmSync(path.join(CAPSTONE_DIR, entry), { recursive: true, force: true });
      }
    }
  }
});

afterEach(() => {
  for (const sessionId of cleanupSessions) {
    const dir = path.join(CAPSTONE_DIR, sessionId);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  cleanupSessions.length = 0;
});

describe("readCapstoneArtifact (Story 4.4)", () => {
  it("returns the file content when the file exists", async () => {
    const session = "19990101T000010Z";
    cleanupSessions.push(session);
    const dir = path.join(CAPSTONE_DIR, session);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "brief.md"), "saved brief", "utf8");

    expect(await readCapstoneArtifact(session, "brief")).toBe("saved brief");
  });

  it("returns null when the file does not exist (ENOENT swallowed)", async () => {
    const session = "19990101T000011Z";
    cleanupSessions.push(session);

    expect(await readCapstoneArtifact(session, "brief")).toBeNull();
  });

  it("returns null when the session directory does not exist", async () => {
    expect(await readCapstoneArtifact("19990101T000099Z", "brief")).toBeNull();
  });

  it("rejects a session id containing `..` with CapstoneTraversalError (defense-in-depth)", async () => {
    await expect(readCapstoneArtifact("../etc", "brief")).rejects.toThrow(
      CapstoneTraversalError,
    );
  });

  it("propagates non-ENOENT filesystem errors (e.g., target is a directory)", async () => {
    const session = "19990101T000012Z";
    cleanupSessions.push(session);
    const dir = path.join(CAPSTONE_DIR, session);
    mkdirSync(dir, { recursive: true });
    // Make `brief.md` a directory so readFile errors with EISDIR.
    mkdirSync(path.join(dir, "brief.md"), { recursive: true });

    await expect(readCapstoneArtifact(session, "brief")).rejects.toThrow();
  });
});
