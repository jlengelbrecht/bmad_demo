import { describe, expect, it } from "vitest";

import { buildBootstrapExplainer } from "./explainer";

describe("buildBootstrapExplainer", () => {
  it("names Claude Code + .claude/skills/ when tool=claude-code", () => {
    const md = buildBootstrapExplainer({ tool: "claude-code" });
    expect(md).toContain("Claude Code");
    expect(md).toContain(".claude/skills/");
    // Should NOT mention the other tools' skill dirs as the active wiring.
    expect(md).not.toMatch(/per-tool wiring for.*Codex/);
    expect(md).not.toMatch(/per-tool wiring for.*GitHub Copilot/);
  });

  it("names Codex + .agents/skills/ when tool=codex", () => {
    const md = buildBootstrapExplainer({ tool: "codex" });
    expect(md).toContain("Codex");
    expect(md).toContain(".agents/skills/");
    // Should NOT call out .claude/skills/ as the active wiring.
    expect(md).not.toContain(".claude/skills/");
  });

  it("names GitHub Copilot + .agents/skills/ when tool=github-copilot", () => {
    const md = buildBootstrapExplainer({ tool: "github-copilot" });
    expect(md).toContain("GitHub Copilot");
    expect(md).toContain(".agents/skills/");
    expect(md).not.toContain(".claude/skills/");
  });

  it("falls back to a tool-agnostic line when tool is undefined", () => {
    const md = buildBootstrapExplainer({ tool: undefined });
    // Mentions both layouts; doesn't promote one over the other.
    expect(md).toContain(".claude/skills/");
    expect(md).toContain(".agents/skills/");
    expect(md).toContain("Either way the contract is the same");
  });

  it("does not enumerate a hardcoded skill count", () => {
    // Older static explainer.md said "42 skills" — the count drifts as
    // BMAD evolves. The new explainer must not pin a number.
    for (const tool of ["claude-code", "codex", "github-copilot"] as const) {
      const md = buildBootstrapExplainer({ tool });
      expect(md).not.toMatch(/\d+\s+skills/);
    }
  });

  it("preserves the load-bearing structural sections", () => {
    const md = buildBootstrapExplainer({ tool: "codex" });
    expect(md).toContain("## What BMAD just did");
    expect(md).toContain("`_bmad/`");
    expect(md).toContain("`_bmad-output/planning-artifacts/`");
    expect(md).toContain("`_bmad-output/implementation-artifacts/`");
    expect(md).toContain("`docs/`");
    expect(md).toContain("HANDOFF.md");
  });
});
