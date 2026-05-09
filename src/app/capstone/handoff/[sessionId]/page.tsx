import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCapstoneTargetDir } from "@/lib/db/progress-db";
import { CAPSTONE_SESSION_ID } from "@/lib/db/schemas";

import { GenerateHandoffButton } from "./generate-handoff-button";

export const metadata: Metadata = {
  title: "Capstone handoff · BMAD Demo",
};
export const dynamic = "force-dynamic";

type Params = Promise<{ sessionId: string }>;

export default async function HandoffPage({ params }: { params: Params }) {
  const { sessionId } = await params;
  if (!CAPSTONE_SESSION_ID.test(sessionId)) notFound();
  const chosenDir = getCapstoneTargetDir(sessionId);
  if (!chosenDir) notFound();

  const handoffPath = path.join(chosenDir, "HANDOFF.md");
  const exists = existsSync(handoffPath);
  let content = "";
  let sizeBytes = 0;
  if (exists) {
    content = readFileSync(handoffPath, "utf8");
    sizeBytes = statSync(handoffPath).size;
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          🎉 Capstone complete
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your bootstrapped repo lives at{" "}
          <code className="font-mono text-xs">{chosenDir}</code>.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            HANDOFF.md
          </h2>
          {exists ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              {(sizeBytes / 1024).toFixed(1)} KB
            </p>
          ) : null}
        </div>
        {!exists ? (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              HANDOFF.md hasn&apos;t been generated yet.
            </p>
            <GenerateHandoffButton sessionId={sessionId} />
          </>
        ) : (
          <>
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
{content}
            </pre>
            <GenerateHandoffButton sessionId={sessionId} regenerate />
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Next steps
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Push to your team&apos;s GitHub org (instructions inside HANDOFF.md), then
          start your team&apos;s Monday standup with story 1.1 already shipped.
        </p>
        <Link
          href="/"
          className="inline-flex w-fit items-center text-sm text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
        >
          ← Back to portal home
        </Link>
      </section>
    </main>
  );
}

