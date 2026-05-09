import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getCapstoneTargetDir,
  getCapstoneTool,
  getCapstoneToolSessionId,
} from "@/lib/db/progress-db";
import { CAPSTONE_PHASE_NAMES, CAPSTONE_SESSION_ID } from "@/lib/db/schemas";

import { ChatThread } from "./chat-thread";

export const metadata: Metadata = {
  title: "Capstone chat · BMAD Demo",
};
export const dynamic = "force-dynamic";

const PHASE_TITLES: Record<string, string> = {
  brief: "Phase 3 — Brief",
  prd: "Phase 4 — PRD",
  architecture: "Phase 5 — Architecture",
  "epics-and-stories": "Phase 6 — Epics + stories",
  adr: "Phase 7 — ADR",
  "dev-story-1.1": "Phase 8 — Dev story 1.1",
};

type Params = Promise<{ sessionId: string; phase: string }>;

export default async function CapstoneChatPage({ params }: { params: Params }) {
  const { sessionId, phase } = await params;
  if (!CAPSTONE_SESSION_ID.test(sessionId)) notFound();
  if (!(CAPSTONE_PHASE_NAMES as readonly string[]).includes(phase)) notFound();

  const chosenDir = getCapstoneTargetDir(sessionId);
  const tool = getCapstoneTool(sessionId);
  const priorToolSessionId = getCapstoneToolSessionId(sessionId, phase);

  if (!chosenDir || !tool) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Capstone chat unavailable
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This session has no chosen directory or tool selection. Restart the setup wizard at
          {" "}
          <a className="underline" href="/capstone/setup">
            /capstone/setup
          </a>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {PHASE_TITLES[phase] ?? phase}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Working in <code className="font-mono text-xs">{chosenDir}</code> with{" "}
          <code className="font-mono text-xs">{tool}</code>.
          {priorToolSessionId ? (
            <>
              {" "}
              Resuming tool-native session{" "}
              <code className="font-mono text-xs">{priorToolSessionId}</code>.
            </>
          ) : (
            " First turn — the tool-native session id will be captured on the first message."
          )}
        </p>
      </header>

      <details className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <summary className="cursor-pointer text-zinc-800 dark:text-zinc-200">
          BMAD primer (read by the agent every turn)
        </summary>
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          The primer lives at{" "}
          <code className="font-mono">src/lib/capstone/primers/{phase}.md</code> and is loaded by the adapter on each turn. Phase 7a/7b stories replace the placeholder with phase-specific BMAD-skill content.
        </p>
      </details>

      <ChatThread
        sessionId={sessionId}
        phase={phase}
        tool={tool}
        chosenDir={chosenDir}
      />

      <footer className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          When you&apos;re done with this phase
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          The phase-done gate (Story 7a.3) will validate the produced artifact exists in your CHOSEN_DIR before advancing. v1 placeholder: ask your AI tool to write the artifact at the expected path and refresh.
        </p>
      </footer>
    </main>
  );
}
