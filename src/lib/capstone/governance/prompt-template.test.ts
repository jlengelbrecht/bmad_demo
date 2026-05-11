import { describe, expect, it } from "vitest";

import { governancePromptTemplate } from "./prompt-template";

const TEMPLATE = governancePromptTemplate();

describe("governancePromptTemplate", () => {
  it("names all four decision points", () => {
    expect(TEMPLATE).toMatch(/Ownership routing/);
    expect(TEMPLATE).toMatch(/Team ceremonies/);
    expect(TEMPLATE).toMatch(/AI-vs-non-AI contribution path/);
    expect(TEMPLATE).toMatch(/Branch protection/);
  });

  it("references both write targets verbatim", () => {
    expect(TEMPLATE).toContain(".github/CODEOWNERS");
    expect(TEMPLATE).toContain("CONTRIBUTING.md");
  });

  it("contains the 'Contributing without AI' framing verbatim", () => {
    expect(TEMPLATE).toContain("Contributing without AI");
  });

  it("explicitly forbids excluding non-AI contributors when the trainee accepts them", () => {
    expect(TEMPLATE).toContain("do NOT use BMAD or any AI tool");
  });

  it("forbids placeholder boilerplate output", () => {
    expect(TEMPLATE).toMatch(/do NOT write placeholder/);
    expect(TEMPLATE).toMatch(/@your-org\/your-team/);
  });

  it("instructs the AI to require branch-protection setup as a user-owned step", () => {
    expect(TEMPLATE).toMatch(/Require review from Code Owners/);
    expect(TEMPLATE).toMatch(/cannot do this for them/);
  });

  describe("research-first instructions", () => {
    it("requires the AI to read BMAD config before asking questions", () => {
      expect(TEMPLATE).toMatch(/Research first/);
      expect(TEMPLATE).toContain("_bmad/bmm/config.yaml");
      expect(TEMPLATE).toContain("output_folder");
      expect(TEMPLATE).toContain("planning_artifacts");
      expect(TEMPLATE).toContain("implementation_artifacts");
    });

    it("requires the AI to discover actually-installed skills, not invent names", () => {
      expect(TEMPLATE).toMatch(/installed skills/);
      expect(TEMPLATE).toMatch(/do NOT (invent|assume).*name/i);
    });

    it("requires the AI to research the repo's actual top-level layout", () => {
      expect(TEMPLATE).toMatch(/top-level director(ies|y)/);
      expect(TEMPLATE).toMatch(/grounded in what's actually there/);
    });

    it("requires the AI to summarize findings so the user can correct", () => {
      expect(TEMPLATE).toMatch(/summarize what you found/i);
    });

    it("forbids assuming the default _bmad-output/ folder", () => {
      expect(TEMPLATE).toMatch(/do NOT assume `_bmad-output\/`/);
    });
  });

  describe("verify-before-write step", () => {
    it("requires a verification pass that checks every path against the filesystem", () => {
      expect(TEMPLATE).toMatch(/Verify before writing/);
      expect(TEMPLATE).toMatch(/check each one|CHECK each one/i);
      expect(TEMPLATE).toMatch(/confirm the path exists/);
    });

    it("requires verification of every BMAD skill name referenced", () => {
      expect(TEMPLATE).toMatch(/every BMAD skill name/i);
      expect(TEMPLATE).toMatch(/cannot verify/);
    });

    it("requires CODEOWNERS rules to match real paths", () => {
      expect(TEMPLATE).toMatch(/every path glob matches/);
    });

    it("instructs the AI to report what was corrected during verification", () => {
      expect(TEMPLATE).toMatch(/what you verified|what.*corrected/i);
    });
  });

  describe("ordering", () => {
    it("Research → Decisions → Verify → Write, in that order", () => {
      const idxResearch = TEMPLATE.indexOf("Step 1");
      const idxDecisions = TEMPLATE.indexOf("Step 2");
      const idxVerify = TEMPLATE.indexOf("Step 3");
      const idxWrite = TEMPLATE.indexOf("Step 4");
      expect(idxResearch).toBeGreaterThan(0);
      expect(idxDecisions).toBeGreaterThan(idxResearch);
      expect(idxVerify).toBeGreaterThan(idxDecisions);
      expect(idxWrite).toBeGreaterThan(idxVerify);
    });

    it("instructs the AI to begin with research, not with a question", () => {
      expect(TEMPLATE).toMatch(/Begin with Step 1/);
      expect(TEMPLATE).toMatch(/Don't ask the user anything yet/);
    });
  });
});
