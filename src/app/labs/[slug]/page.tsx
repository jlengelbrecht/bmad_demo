import matter from "gray-matter";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LessonCompleteButton } from "@/app/lessons/[slug]/lesson-complete-button";
import { getLabSlugs } from "@/lib/labs/sequence";
import { getProgress } from "@/lib/db/progress-db";
import { loadContent } from "@/lib/markdown/load-content";
import { Markdown } from "@/lib/markdown/render";

type LabPageParams = { slug: string };

export function generateStaticParams(): LabPageParams[] {
  return getLabSlugs().map((slug) => ({ slug }));
}

function isKnownSlug(slug: string): boolean {
  return getLabSlugs().includes(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LabPageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isKnownSlug(slug)) return { title: "Lab not found · BMAD Demo" };

  const content = loadContent(`training/labs/${slug}.md`);
  if (!content) return { title: "Lab not found · BMAD Demo" };

  let title = `Lab — ${slug}`;
  try {
    const fm = matter(content.source).data as Record<string, unknown>;
    if (typeof fm.title === "string" && fm.title.trim().length > 0) {
      title = fm.title;
    }
  } catch {
    // Bad YAML — fall back to the slug-derived title rather than 500 the route.
  }
  return { title: `${title} · BMAD Demo` };
}

export default async function LabPage({
  params,
}: {
  params: Promise<LabPageParams>;
}) {
  const { slug } = await params;
  if (!isKnownSlug(slug)) notFound();

  const content = loadContent(`training/labs/${slug}.md`);
  if (!content) notFound();

  const progress = getProgress("lab", slug);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Markdown source={content.source} sourcePath={content.sourcePath} />
      <LessonCompleteButton
        key={`lab:${slug}:${!!progress?.completedAt}`}
        kind="lab"
        id={slug}
        initialCompleted={!!progress?.completedAt}
        label="Mark this lab as run"
        completedLabel="Lab marked run ✓"
      />
    </main>
  );
}
