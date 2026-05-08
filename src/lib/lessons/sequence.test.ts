import { beforeAll, describe, expect, it } from "vitest";

import {
  __resetLessonCacheForTests,
  getLessonBySlug,
  getLessonSequence,
  getNeighbors,
} from "./sequence";

// Reset the module-scoped cache so the suite is order-independent.
beforeAll(() => {
  __resetLessonCacheForTests();
});

describe("lesson sequence", () => {
  it("returns six lessons sorted by leading number prefix (numeric, not lexicographic)", () => {
    const sequence = getLessonSequence();
    expect(sequence).toHaveLength(6);
    expect(sequence.map((l) => l.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(sequence[0].slug).toBe("1-what-is-bmad");
    expect(sequence[5].slug).toBe("6-from-lessons-to-capstone");
  });

  it("hydrates titles from frontmatter", () => {
    const sequence = getLessonSequence();
    expect(sequence[0].title).toBe("What is BMAD");
    expect(sequence[3].title).toBe("CODEOWNERS and the gate");
  });
});

describe("getLessonBySlug", () => {
  it("returns the lesson on a hit", () => {
    const lesson = getLessonBySlug("3-stories-as-tool-agnostic-contract");
    expect(lesson?.number).toBe(3);
    expect(lesson?.title).toBe("Stories as tool-agnostic contract");
  });

  it("returns undefined on a miss", () => {
    expect(getLessonBySlug("does-not-exist")).toBeUndefined();
  });
});

describe("getNeighbors", () => {
  it("returns no prev for the first lesson", () => {
    const { prev, next } = getNeighbors("1-what-is-bmad");
    expect(prev).toBeUndefined();
    expect(next?.number).toBe(2);
  });

  it("returns no next for the last lesson", () => {
    const { prev, next } = getNeighbors("6-from-lessons-to-capstone");
    expect(prev?.number).toBe(5);
    expect(next).toBeUndefined();
  });

  it("returns both neighbors for a middle lesson", () => {
    const { prev, next } = getNeighbors("3-stories-as-tool-agnostic-contract");
    expect(prev?.number).toBe(2);
    expect(next?.number).toBe(4);
  });

  it("returns an empty object when slug is unknown", () => {
    const result = getNeighbors("nonexistent");
    expect(result).toEqual({});
  });
});
