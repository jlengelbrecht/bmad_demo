import { describe, expect, it } from "vitest";

import {
  CAPSTONE_STEP_ORDER,
  type CapstoneStepName,
  nextIncompleteStep,
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
    expect(nextIncompleteStep(new Set<CapstoneStepName>())).toBe("brief");
  });

  it("returns 'epic' when only 'brief' is complete", () => {
    expect(nextIncompleteStep(new Set<CapstoneStepName>(["brief"]))).toBe("epic");
  });

  it("returns 'story-2' when brief + epic + story-1 are complete", () => {
    expect(
      nextIncompleteStep(new Set<CapstoneStepName>(["brief", "epic", "story-1"])),
    ).toBe("story-2");
  });

  it("returns null when all five steps are complete", () => {
    expect(
      nextIncompleteStep(
        new Set<CapstoneStepName>(["brief", "epic", "story-1", "story-2", "adr"]),
      ),
    ).toBeNull();
  });

  it("walks order-first (skipping ahead based on order, not input set membership)", () => {
    // 'epic' is complete but 'brief' is not — the walk still returns
    // 'brief' first because it's the canonical-order next-incomplete.
    expect(nextIncompleteStep(new Set<CapstoneStepName>(["epic"]))).toBe("brief");
  });
});
