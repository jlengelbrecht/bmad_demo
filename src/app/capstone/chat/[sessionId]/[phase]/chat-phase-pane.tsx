"use client";

import { useMemo, useState } from "react";

import { TerminalPane } from "@/components/terminal-pane";
import {
  getLaunchCommand,
  PHASE_DISPLAY_NAMES,
} from "@/lib/capstone/phases/launch-commands";
import type { CapstonePhase, ToolId } from "@/lib/capstone/adapters/types";

const TOOL_DISPLAY_NAMES: Record<ToolId, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "github-copilot": "GitHub Copilot",
};

/**
 * Chat-phase surface — same teaching shape as Phase 2 (bootstrap):
 * show the trainee the exact command the portal is about to run, the
 * BMAD invocation they'll type once the tool opens, then click to
 * launch the tool inside their CHOSEN_DIR.
 *
 * Replaces the prior chat-thread + textbox UI; the trainee now drives
 * the AI tool directly via xterm.js, learning the same workflow they'd
 * use day-2 at their own machine.
 */
export function ChatPhasePane({
  sessionId,
  phase,
  tool,
  chosenDir,
  title,
}: {
  sessionId: string;
  phase: CapstonePhase;
  tool: ToolId;
  chosenDir: string;
  title: string;
}) {
  const [opened, setOpened] = useState(false);
  const launch = useMemo(() => getLaunchCommand(tool, phase), [tool, phase]);

  // Spawn body for the chat PTY route. Stable across renders so the
  // TerminalPane's useEffect doesn't re-spawn the PTY.
  const spawnBody = useMemo(() => ({ tool, phase }), [tool, phase]);
  const spawnUrl = `/api/capstone/chat/${sessionId}/pty/spawn`;
  const ptyId = `${sessionId}.${phase}`;

  const mainMaxWidth = opened ? "max-w-5xl" : "max-w-3xl";

  return (
    <main
      className={`mx-auto flex w-full ${mainMaxWidth} flex-1 flex-col gap-6 px-6 py-12`}
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Working in <code className="font-mono text-xs">{chosenDir}</code> with{" "}
          <strong className="font-medium">{TOOL_DISPLAY_NAMES[tool]}</strong>.
          The portal will launch the tool from inside that directory; you drive
          the conversation in the terminal below — same shape as you would on
          your own machine.
        </p>
      </header>

      {!opened ? (
        <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            What the portal will run
          </h2>
          <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
            {launch.preview(chosenDir)}
          </pre>

          {launch.autoRun && launch.bmadInvocation ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
              ✨ The portal passes{" "}
              <code className="font-mono">{launch.bmadInvocation}</code> as the
              initial prompt — {TOOL_DISPLAY_NAMES[tool]}{" "}
              will execute BMAD&apos;s{" "}
              <code className="font-mono">
                {launch.bmadInvocation.replace(/^\//, "")}
              </code>{" "}
              skill on launch and drop you straight into the{" "}
              {PHASE_DISPLAY_NAMES[phase]} workflow.
            </p>
          ) : launch.bmadInvocation ? (
            <>
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                ⚠ {TOOL_DISPLAY_NAMES[tool]} doesn&apos;t support
                initial-prompt argv yet (under the portal&apos;s validated set).
                Once it opens, type:
              </p>
              <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                {launch.bmadInvocation}
              </pre>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                That invokes BMAD&apos;s{" "}
                <code className="font-mono">
                  {launch.bmadInvocation.replace(/^\//, "")}
                </code>{" "}
                skill, which guides you through the {PHASE_DISPLAY_NAMES[phase]}{" "}
                workflow and writes the artifact to{" "}
                <code className="font-mono">_bmad-output/</code>.
              </p>
            </>
          ) : (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              No dedicated BMAD skill ships for this phase. Once the tool opens,
              ask it to help you write the {PHASE_DISPLAY_NAMES[phase]} artifact
              following the conventions from Lesson 4 — write the file to{" "}
              <code className="font-mono">_bmad-output/planning-artifacts/</code>.
            </p>
          )}

          <button
            type="button"
            onClick={() => setOpened(true)}
            className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Open terminal →
          </button>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              {TOOL_DISPLAY_NAMES[tool]} — interactive
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Target: <code className="font-mono">{chosenDir}</code>
            </p>
          </div>
          {launch.autoRun && launch.bmadInvocation ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
              ✨ Running{" "}
              <code className="font-mono">{launch.bmadInvocation}</code> for you
              on launch.
            </p>
          ) : launch.bmadInvocation ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              ⚠ Once {TOOL_DISPLAY_NAMES[tool]} loads, type{" "}
              <code className="font-mono">{launch.bmadInvocation}</code> to
              start the {PHASE_DISPLAY_NAMES[phase]} workflow.
            </p>
          ) : null}
          <TerminalPane
            ptyId={ptyId}
            spawnUrl={spawnUrl}
            spawnBody={spawnBody}
          />
        </section>
      )}

      <footer className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          When you&apos;re done with this phase
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Quit the tool (Ctrl-D / type <code className="font-mono">/exit</code>)
          when the artifact is on disk. The phase-done gate validates the
          artifact exists in your CHOSEN_DIR before advancing.
        </p>
      </footer>
    </main>
  );
}
