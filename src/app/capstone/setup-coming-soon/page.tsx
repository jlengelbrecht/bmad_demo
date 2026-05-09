import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Capstone setup — coming soon · BMAD Demo",
};

export default function CapstoneSetupComingSoonPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          The capstone is being rebuilt
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The original textarea-based capstone has been retired. The rebuilt
          experience walks you through the full BMAD artifact chain by chatting
          with your own local AI tool (claude-code, codex, or github-copilot) and
          scaffolds a fresh team repo at a path of your choosing.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          What&apos;s coming
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>A pre-flight check for node/git/npx versions.</li>
          <li>A tool selection step with auth pre-check.</li>
          <li>A setup wizard that picks a target directory and bootstraps it with{" "}
            <code className="font-mono text-xs">npx bmad-method install</code>.
          </li>
          <li>Phase-by-phase chat for brief, PRD, architecture, epics + stories, and an ADR.</li>
          <li>A dev pass on story 1.1 with a green-tests gate.</li>
          <li>A handoff document you can show your team Monday morning.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          In the meantime
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Walk the six lessons and the three labs — that material is unchanged.
          If you produced a capstone with the prior textarea form, those
          artifacts remain in your working tree at{" "}
          <code className="font-mono text-xs">_bmad-output/capstone/&lt;session&gt;/</code>;
          the migration only deletes portal code, not your work.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          To wipe portal-side progress (lessons completed, labs run, prior
          capstone session rows): run{" "}
          <code className="font-mono text-xs">npm run reset-progress</code>.
        </p>
      </section>

      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 text-sm text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
      >
        ← Back to home
      </Link>
    </main>
  );
}
