import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";

export type Lesson = {
  slug: string;
  /** Primary lesson number (the integer before the first hyphen). */
  number: number;
  /**
   * Optional sub-number — e.g. `1-5-foo.md` → number=1, subNumber=5,
   * displayed as "Lesson 1.5". Lets us insert a lesson between 1 and 2
   * without renumbering everything downstream. `undefined` for the
   * canonical `<int>-<slug>.md` shape.
   */
  subNumber?: number;
  /** Human-readable number for prose: "1" for top-level, "1.5" for sub. */
  displayNumber: string;
  title: string;
  filePath: string;
};

const LESSONS_DIR = path.join(process.cwd(), "training", "lessons");
// Captures `<primary>(-<secondary>)?-<slug>.md` so `1-what-is-bmad.md`
// parses as number=1 (no sub) and `1-5-the-bmad-ecosystem.md` parses as
// number=1, subNumber=5. Sub-numbered lessons sort between integer
// neighbors (1 → 1.5 → 2).
const FILENAME_PREFIX = /^(\d+)(?:-(\d+))?-(.+)\.md$/;

let cached: Lesson[] | null = null;

function readLessons(): Lesson[] {
  const entries = readdirSync(LESSONS_DIR, { withFileTypes: true });
  const lessons: Lesson[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = entry.name.match(FILENAME_PREFIX);
    if (!match) continue;

    const number = Number.parseInt(match[1], 10);
    const subNumber =
      match[2] !== undefined ? Number.parseInt(match[2], 10) : undefined;
    const displayNumber =
      subNumber !== undefined ? `${number}.${subNumber}` : `${number}`;
    const slug = entry.name.replace(/\.md$/, "");
    const filePath = path.join(LESSONS_DIR, entry.name);
    const raw = readFileSync(filePath, "utf8");
    const fm = matter(raw).data as Record<string, unknown>;

    let title: string;
    if (typeof fm.title === "string" && fm.title.trim().length > 0) {
      title = fm.title;
    } else {
      title = `Lesson ${displayNumber}`;
      if (process.env.NODE_ENV !== "production" && fm.title !== undefined) {
        console.warn(
          `[lessons] frontmatter title for ${entry.name} is not a non-empty string (got ${typeof fm.title}); falling back to "${title}"`,
        );
      }
    }

    lessons.push({ slug, number, subNumber, displayNumber, title, filePath });
  }

  return lessons.sort((a, b) => {
    // Primary number first; sub-numbered lessons (e.g. 1.5) slot
    // between top-level neighbors (1 → 1.5 → 2). Treat absent
    // subNumber as 0 so `1-foo.md` (1) sorts before `1-5-bar.md` (1.5).
    const byNumber = a.number - b.number;
    if (byNumber !== 0) return byNumber;
    const aSub = a.subNumber ?? 0;
    const bSub = b.subNumber ?? 0;
    if (aSub !== bSub) return aSub - bSub;
    return a.slug.localeCompare(b.slug);
  });
}

export function getLessonSequence(): Lesson[] {
  // Skip the cache in dev so authoring loop changes (new lessons, edited
  // frontmatter) surface without restarting the dev server.
  if (process.env.NODE_ENV !== "production") {
    return readLessons();
  }
  if (cached) return cached;
  cached = readLessons();
  return cached;
}

export function getLessonBySlug(slug: string): Lesson | undefined {
  return getLessonSequence().find((lesson) => lesson.slug === slug);
}

export function getNeighbors(slug: string): { prev?: Lesson; next?: Lesson } {
  const sequence = getLessonSequence();
  const index = sequence.findIndex((lesson) => lesson.slug === slug);
  if (index === -1) return {};
  return {
    prev: index > 0 ? sequence[index - 1] : undefined,
    next: index < sequence.length - 1 ? sequence[index + 1] : undefined,
  };
}

// Test-only: reset the cache between fixture runs. Not exported via the public API.
export function __resetLessonCacheForTests(): void {
  cached = null;
}
