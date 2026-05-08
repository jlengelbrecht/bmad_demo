import { readFileSync } from "node:fs";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LessonNav } from "@/components/lesson-nav";
import { Markdown } from "@/lib/markdown/render";
import {
  getLessonBySlug,
  getLessonSequence,
  getNeighbors,
} from "@/lib/lessons/sequence";

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
  const source = readFileSync(lesson.filePath, "utf8");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <LessonNav
        current={lesson}
        prev={prev}
        next={next}
        total={sequence.length}
        ariaLabel="Lesson navigation (top)"
      />
      <Markdown source={source} sourcePath={lesson.filePath} />
      <LessonNav
        current={lesson}
        prev={prev}
        next={next}
        total={sequence.length}
        ariaLabel="Lesson navigation (bottom)"
      />
    </main>
  );
}
