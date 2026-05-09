import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { readBootstrappedTree, formatSize, type TreeNode } from "@/lib/capstone/bootstrap/file-tree";
import { getCapstoneTargetDir } from "@/lib/db/progress-db";
import { CAPSTONE_SESSION_ID } from "@/lib/db/schemas";

export const metadata: Metadata = {
  title: "Capstone setup — bootstrap complete · BMAD Demo",
};
export const dynamic = "force-dynamic";

type SearchParams = { session?: string | string[]; tool?: string | string[] };

export default async function BootstrapCompletePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session: rawSession, tool: rawTool } = await searchParams;
  const sessionId = Array.isArray(rawSession) ? undefined : rawSession;
  const tool = Array.isArray(rawTool) ? undefined : rawTool;
  if (!sessionId || !CAPSTONE_SESSION_ID.test(sessionId)) {
    redirect("/capstone/setup");
  }

  const chosenDir = getCapstoneTargetDir(sessionId);
  if (!chosenDir) notFound();
  if (!existsSync(chosenDir)) notFound();

  const tree = readBootstrappedTree(chosenDir, 3);
  const explainer = readFileSync(
    path.join(process.cwd(), "src", "lib", "capstone", "bootstrap", "explainer.md"),
    "utf8",
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          ✓ Bootstrap complete
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your BMAD-bootstrapped repo is ready at{" "}
          <code className="font-mono">{chosenDir}</code>.
        </p>
      </header>

      <section
        aria-labelledby="tree-heading"
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 id="tree-heading" className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Files in {path.basename(chosenDir)}
        </h2>
        <FileTree node={tree} />
      </section>

      <section
        aria-labelledby="explainer-heading"
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2
          id="explainer-heading"
          className="text-lg font-medium text-zinc-900 dark:text-zinc-100"
        >
          What BMAD just did
        </h2>
        <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700 dark:text-zinc-300">
{explainer}
        </pre>
      </section>

      <Link
        href={`/capstone/chat/${sessionId}/brief${tool ? `?tool=${tool}` : ""}`}
        className="inline-flex w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Continue → Phase 3: brief
      </Link>
    </main>
  );
}

function FileTree({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  return (
    <ul
      style={{ paddingLeft: depth === 0 ? 0 : 16 }}
      className="font-mono text-xs"
    >
      <li className="flex items-center gap-2">
        <span className={node.kind === "dir" ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-600 dark:text-zinc-400"}>
          {node.kind === "dir" ? "📁" : node.kind === "symlink" ? "🔗" : "📄"} {node.name}
          {node.kind === "file" && node.size !== undefined ? (
            <span className="ml-2 text-zinc-500 dark:text-zinc-500">
              ({formatSize(node.size)})
            </span>
          ) : null}
        </span>
      </li>
      {node.children?.map((child) => (
        <FileTree key={child.name} node={child} depth={depth + 1} />
      ))}
    </ul>
  );
}
