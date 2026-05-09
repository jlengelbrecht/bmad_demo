import { describe, expect, it } from "vitest";

import {
  CAPSTONE_STEP_ORDER,
  CAPSTONE_STEPS,
  type LegacyCapstoneStepName,
  nextIncompleteStep,
  nextStepAfter,
} from "./steps";

describe("CAPSTONE_STEP_ORDER (Story 4.3)", () => {
  it("contains exactly the 5 canonical steps in canonical order", () => {
    expect([...CAPSTONE_STEP_ORDER]).toEqual([
      "brief",
      "epic",
      "story-1",
      "story-2",
      "adr",
    ]);
  });
});

describe("nextIncompleteStep (Story 4.3)", () => {
  it("returns 'brief' when nothing is complete", () => {
    expect(nextIncompleteStep(new Set<LegacyCapstoneStepName>())).toBe("brief");
  });

  it("returns 'epic' when only 'brief' is complete", () => {
    expect(nextIncompleteStep(new Set<LegacyCapstoneStepName>(["brief"]))).toBe("epic");
  });

  it("returns 'story-2' when brief + epic + story-1 are complete", () => {
    expect(
      nextIncompleteStep(new Set<LegacyCapstoneStepName>(["brief", "epic", "story-1"])),
    ).toBe("story-2");
  });

  it("returns null when all five steps are complete", () => {
    expect(
      nextIncompleteStep(
        new Set<LegacyCapstoneStepName>(["brief", "epic", "story-1", "story-2", "adr"]),
      ),
    ).toBeNull();
  });

  it("walks order-first (skipping ahead based on order, not input set membership)", () => {
    // 'epic' is complete but 'brief' is not — the walk still returns
    // 'brief' first because it's the canonical-order next-incomplete.
    expect(nextIncompleteStep(new Set<LegacyCapstoneStepName>(["epic"]))).toBe("brief");
  });
});

describe("CAPSTONE_STEPS metadata (Story 4.4)", () => {
  it("has exactly the 5 canonical-step keys", () => {
    expect(Object.keys(CAPSTONE_STEPS).sort()).toEqual(
      [...CAPSTONE_STEP_ORDER].sort(),
    );
  });

  it("each entry has a non-empty title and promptOutline", () => {
    for (const step of CAPSTONE_STEP_ORDER) {
      const meta = CAPSTONE_STEPS[step];
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.promptOutline.length).toBeGreaterThan(0);
    }
  });
});

describe("nextStepAfter (Story 4.4)", () => {
  it("returns 'epic' after 'brief'", () => {
    expect(nextStepAfter("brief")).toBe("epic");
  });

  it("returns 'story-2' after 'story-1'", () => {
    expect(nextStepAfter("story-1")).toBe("story-2");
  });

  it("returns null after the final step ('adr')", () => {
    expect(nextStepAfter("adr")).toBeNull();
  });
});
