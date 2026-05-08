import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";

export type Lesson = {
  slug: string;
  number: number;
  title: string;
  filePath: string;
};

const LESSONS_DIR = path.join(process.cwd(), "training", "lessons");
const FILENAME_PREFIX = /^(\d+)-(.+)\.md$/;

let cached: Lesson[] | null = null;

function readLessons(): Lesson[] {
  const entries = readdirSync(LESSONS_DIR, { withFileTypes: true });
  const lessons: Lesson[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = entry.name.match(FILENAME_PREFIX);
    if (!match) continue;

    const number = Number.parseInt(match[1], 10);
    const slug = entry.name.replace(/\.md$/, "");
    const filePath = path.join(LESSONS_DIR, entry.name);
    const raw = readFileSync(filePath, "utf8");
    const fm = matter(raw).data as Record<string, unknown>;
    const title = typeof fm.title === "string" && fm.title.trim().length > 0 ? fm.title : `Lesson ${number}`;

    lessons.push({ slug, number, title, filePath });
  }

  return lessons.sort((a, b) => a.number - b.number);
}

export function getLessonSequence(): Lesson[] {
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
