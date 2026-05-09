import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCapstoneTargetDir, getCapstoneTool } from "@/lib/db/progress-db";
import { CAPSTONE_PHASE_NAMES, CAPSTONE_SESSION_ID } from "@/lib/db/schemas";
import type { CapstonePhase, ToolId } from "@/lib/capstone/adapters/types";

import { ChatPhasePane } from "./chat-phase-pane";

export const metadata: Metadata = {
  title: "Capstone chat · BMAD Demo",
};
export const dynamic = "force-dynamic";

const PHASE_TITLES: Record<CapstonePhase, string> = {
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

  if (!chosenDir || !tool) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Capstone chat unavailable
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This session has no chosen directory or tool selection. Restart the
          setup wizard at{" "}
          <a className="underline" href="/capstone/setup">
            /capstone/setup
          </a>
          .
        </p>
      </main>
    );
  }

  return (
    <ChatPhasePane
      sessionId={sessionId}
      phase={phase as CapstonePhase}
      tool={tool as ToolId}
      chosenDir={chosenDir}
      title={PHASE_TITLES[phase as CapstonePhase] ?? phase}
    />
  );
}
