import matter from "gray-matter";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getLabSlugs } from "@/lib/labs/sequence";
import { loadContent } from "@/lib/markdown/load-content";
import { Markdown } from "@/lib/markdown/render";

type LabPageParams = { slug: string };

export function generateStaticParams(): LabPageParams[] {
  return getLabSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LabPageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = loadContent(`training/labs/${slug}.md`);
  if (!content) return { title: "Lab not found · BMAD Demo" };
  const fm = matter(content.source).data as Record<string, unknown>;
  const title = typeof fm.title === "string" && fm.title.trim().length > 0 ? fm.title : `Lab — ${slug}`;
  return { title: `${title} · BMAD Demo` };
}

export default async function LabPage({
  params,
}: {
  params: Promise<LabPageParams>;
}) {
  const { slug } = await params;
  const content = loadContent(`training/labs/${slug}.md`);
  if (!content) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Markdown source={content.source} sourcePath={content.sourcePath} />
    </main>
  );
}
