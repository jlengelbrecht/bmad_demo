import { readFileSync } from "node:fs";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LessonNav } from "@/components/lesson-nav";
import {
  getLessonBySlug,
  getLessonSequence,
  getNeighbors,
} from "@/lib/lessons/sequence";
import { getProgress, listCompleted } from "@/lib/db/progress-db";
import { Markdown } from "@/lib/markdown/render";

import { StartCapstoneButton } from "@/app/capstone/start-capstone-button";

import { LessonCompleteButton } from "./lesson-complete-button";

// Lesson 7 is the capstone hand-off — its prose ends with "click
// 'Start the capstone' below", so we embed the StartCapstoneButton
// inline at the end of that lesson. Other lessons rely on Next-link
// navigation only.
const CAPSTONE_HANDOFF_SLUG = "7-from-lessons-to-capstone";

type LessonPageParams = { slug: string };

export function generateStaticParams(): LessonPageParams[] {
  return getLessonSequence().map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LessonPageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson) return { title: "Lesson not found · AI Contribution Framework" };
  return {
    title: `Lesson ${lesson.number} — ${lesson.title} · AI Contribution Framework`,
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<LessonPageParams>;
}) {
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson) notFound();

  const sequence = getLessonSequence();
  const { prev, next } = getNeighbors(slug);

  let source: string;
  try {
    source = readFileSync(lesson.filePath, "utf8");
  } catch (err) {
    // File may have been removed between sequence cache and request — surface as 404.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[lessons] failed to read ${lesson.filePath}: ${String(err)}`);
    }
    notFound();
  }

  const progress = getProgress("lesson", slug);
  const completedSlugs = listCompleted("lesson");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <LessonNav
        current={lesson}
        prev={prev}
        next={next}
        total={sequence.length}
        sequence={sequence}
        completedSlugs={completedSlugs}
        ariaLabel="Lesson navigation (top)"
      />
      <Markdown source={source} sourcePath={lesson.filePath} />
      {slug === CAPSTONE_HANDOFF_SLUG ? (
        // Lesson 6 is the capstone hand-off — clicking through to the
        // capstone IS the completion signal, so we hide the separate
        // Mark-complete button and auto-mark inside StartCapstoneButton.
        <StartCapstoneButton markCompleteSlug={slug} />
      ) : (
        <LessonCompleteButton
          key={`lesson:${slug}:${!!progress?.completedAt}`}
          kind="lesson"
          id={slug}
          initialCompleted={!!progress?.completedAt}
        />
      )}
      <LessonNav
        current={lesson}
        prev={prev}
        next={next}
        total={sequence.length}
        sequence={sequence}
        completedSlugs={completedSlugs}
        ariaLabel="Lesson navigation (bottom)"
      />
    </main>
  );
}
