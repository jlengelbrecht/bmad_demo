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

import { LessonCompleteButton } from "./lesson-complete-button";

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
  if (!lesson) return { title: "Lesson not found · BMAD Demo" };
  return {
    title: `Lesson ${lesson.number} — ${lesson.title} · BMAD Demo`,
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
      <LessonCompleteButton
        key={`lesson:${slug}:${!!progress?.completedAt}`}
        kind="lesson"
        id={slug}
        initialCompleted={!!progress?.completedAt}
      />
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
