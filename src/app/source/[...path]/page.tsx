import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isAllowedSourcePath } from "@/lib/source-viewer/allowlist";
import { buildSourceBody } from "@/lib/source-viewer/render";
import { Markdown } from "@/lib/markdown/render";

type Params = { path: string[] };

const REPO_ROOT = process.cwd();

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { path: segs } = await params;
  const rel = (segs ?? []).join("/");
  return {
    title: `${rel || "Source"} · BMAD Demo`,
  };
}

export default async function SourcePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { path: segs } = await params;
  const relInput = (segs ?? []).join("/");

  const allow = isAllowedSourcePath(relInput, REPO_ROOT);
  if (!allow.allowed) {
    notFound();
  }

  let stats;
  let contents: string;
  try {
    stats = statSync(allow.absolutePath);
    if (!stats.isFile()) {
      notFound();
    }
    contents = readFileSync(allow.absolutePath, "utf8");
  } catch {
    notFound();
  }

  const ext = path.extname(allow.relPath);
  const rendered = buildSourceBody(contents, ext);
  const fileName = path.basename(allow.relPath);
  const dirName = path.dirname(allow.relPath);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <nav className="text-sm mb-6">
        <Link href="/" className="text-zinc-500 hover:underline">
          ← Home
        </Link>
        <span className="mx-2 text-zinc-400">/</span>
        <span className="text-zinc-500 font-mono text-xs">source</span>
        {dirName !== "." && (
          <>
            <span className="mx-2 text-zinc-400">/</span>
            <span className="text-zinc-500 font-mono text-xs">{dirName}</span>
          </>
        )}
        <span className="mx-2 text-zinc-400">/</span>
        <span className="font-mono text-xs">{fileName}</span>
      </nav>
      <header className="mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="font-mono text-base mb-1">{allow.relPath}</h1>
        <p className="text-xs text-zinc-500">
          {formatSize(rendered.sizeBytes)}
          {rendered.kind === "code" && rendered.lang ? (
            <>
              {" · "}
              <span className="font-mono">{rendered.lang}</span>
            </>
          ) : null}
          {" · "}
          <span className="text-zinc-600 dark:text-zinc-400">
            from this repo
          </span>
        </p>
      </header>
      <Markdown source={rendered.body} sourcePath={allow.absolutePath} />
    </main>
  );
}
