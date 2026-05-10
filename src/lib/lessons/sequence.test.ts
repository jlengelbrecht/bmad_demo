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
  it("returns the lesson set sorted by primary then sub number", () => {
    const sequence = getLessonSequence();
    expect(sequence).toHaveLength(7);
    expect(sequence.map((l) => l.displayNumber)).toEqual([
      "1",
      "1.5",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    expect(sequence[0].slug).toBe("1-what-is-bmad");
    expect(sequence[1].slug).toBe("1-5-the-bmad-ecosystem");
    expect(sequence[6].slug).toBe("6-from-lessons-to-capstone");
  });

  it("hydrates titles from frontmatter", () => {
    const sequence = getLessonSequence();
    expect(sequence[0].title).toBe("What is BMAD");
    // Lesson 1.5's slot is index 1; CODEOWNERS lesson is now at index 4.
    expect(sequence[1].title).toBe("The BMAD ecosystem and installer");
    expect(sequence[4].title).toBe("CODEOWNERS and the gate");
  });

  it("parses sub-numbers from filenames", () => {
    const ecosystem = getLessonBySlug("1-5-the-bmad-ecosystem");
    expect(ecosystem?.number).toBe(1);
    expect(ecosystem?.subNumber).toBe(5);
    expect(ecosystem?.displayNumber).toBe("1.5");

    const intro = getLessonBySlug("1-what-is-bmad");
    expect(intro?.number).toBe(1);
    expect(intro?.subNumber).toBeUndefined();
    expect(intro?.displayNumber).toBe("1");
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
    // Lesson 1.5 (the BMAD ecosystem) is the new neighbor after Lesson 1.
    expect(next?.slug).toBe("1-5-the-bmad-ecosystem");
    expect(next?.displayNumber).toBe("1.5");
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
