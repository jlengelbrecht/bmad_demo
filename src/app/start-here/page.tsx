import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadContent } from "@/lib/markdown/load-content";
import { Markdown } from "@/lib/markdown/render";

export const metadata: Metadata = {
  title: "Trainee — Start Here · BMAD Demo",
};

export default async function StartHerePage() {
  const content = loadContent("training/00-start-here.md");
  if (!content) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Markdown source={content.source} sourcePath={content.sourcePath} />
    </main>
  );
}
