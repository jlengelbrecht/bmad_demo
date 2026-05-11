import { describe, expect, it } from "vitest";

import { renderHandoff } from "./render";

describe("renderHandoff", () => {
  it("substitutes every placeholder", () => {
    const out = renderHandoff({
      projectName: "demo-app",
      chosenDir: "/tmp/demo-app",
      toolDisplayName: "Claude Code",
      artifactList: "- brief.md (1KB)",
      gitLogOutput: "abc123 init commit",
      bmadVersion: "6.6.0",
      date: "2026-05-08",
    });
    expect(out).toContain("HANDOFF — demo-app");
    expect(out).toContain("/tmp/demo-app");
    expect(out).toContain("Claude Code");
    expect(out).toContain("brief.md (1KB)");
    expect(out).toContain("abc123 init commit");
    expect(out).toContain("6.6.0");
    expect(out).toContain("2026-05-08");
    expect(out).not.toMatch(/{{[^}]+}}/);
  });

  it("includes the branch-protection reminder section", () => {
    const out = renderHandoff({
      projectName: "demo",
      chosenDir: "/tmp/demo",
      toolDisplayName: "Codex",
      artifactList: "- whatever",
      gitLogOutput: "abc",
      bmadVersion: "6.6.0",
      date: "2026-05-10",
    });
    expect(out).toMatch(/Branch protection reminder/);
    expect(out).toMatch(/Require review from Code Owners/);
    expect(out).toMatch(/documentation only/);
  });

  it("renders <unknown> for missing fields", () => {
    const out = renderHandoff({
      projectName: "",
      chosenDir: "",
      toolDisplayName: "",
      artifactList: "",
      gitLogOutput: "",
      bmadVersion: "",
      date: "2026-05-08",
    });
    expect(out).toContain("<unknown>");
  });
});
