import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadContent } from "@/lib/markdown/load-content";
import { Markdown } from "@/lib/markdown/render";

export const metadata: Metadata = {
  title: "Facilitator — Workshop Guide · AI Contribution Framework",
};

export default async function FacilitatorPage() {
  const content = loadContent("training/facilitator-guide.md");
  if (!content) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Markdown source={content.source} sourcePath={content.sourcePath} />
    </main>
  );
}
