import path from "node:path";
import { describe, expect, it } from "vitest";

import { CAPSTONE_DIR, sessionDir, stepFile } from "./paths";

describe("CAPSTONE_DIR", () => {
  it("resolves to a path under the repo root by default (Story 4.2 AC2)", () => {
    // Production default is `<cwd>/_bmad-output/capstone`. Tests run from
    // the repo root, so cwd === repo root. The resolved path must end
    // with `_bmad-output/capstone` and start with the repo root.
    const expectedSuffix = path.join("_bmad-output", "capstone");
    expect(CAPSTONE_DIR.endsWith(expectedSuffix)).toBe(true);
    expect(path.isAbsolute(CAPSTONE_DIR)).toBe(true);
  });
});

describe("sessionDir", () => {
  it("returns CAPSTONE_DIR + '/' + sessionId", () => {
    const sessionId = "20260507T143022Z";
    expect(sessionDir(sessionId)).toBe(path.join(CAPSTONE_DIR, sessionId));
  });
});

describe("stepFile", () => {
  it("returns sessionDir + '/' + <step>.md for each canonical step", () => {
    const sessionId = "20260507T143022Z";
    expect(stepFile(sessionId, "brief")).toBe(
      path.join(CAPSTONE_DIR, sessionId, "brief.md"),
    );
    expect(stepFile(sessionId, "epic")).toBe(
      path.join(CAPSTONE_DIR, sessionId, "epic.md"),
    );
    expect(stepFile(sessionId, "story-1")).toBe(
      path.join(CAPSTONE_DIR, sessionId, "story-1.md"),
    );
    expect(stepFile(sessionId, "story-2")).toBe(
      path.join(CAPSTONE_DIR, sessionId, "story-2.md"),
    );
    expect(stepFile(sessionId, "adr")).toBe(
      path.join(CAPSTONE_DIR, sessionId, "adr.md"),
    );
  });
});
