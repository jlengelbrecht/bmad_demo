import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadContent } from "@/lib/markdown/load-content";
import { Markdown } from "@/lib/markdown/render";

export const metadata: Metadata = {
  title: "Stakeholder — 15-minute Demo · BMAD Demo",
};

export default async function StakeholderPage() {
  const content = loadContent("training/stakeholder-demo-script.md");
  if (!content) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Markdown source={content.source} sourcePath={content.sourcePath} />
    </main>
  );
}
