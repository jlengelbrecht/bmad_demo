"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { TerminalPane } from "@/components/terminal-pane";
import {
  getLaunchCommand,
  PHASE_DISPLAY_NAMES,
} from "@/lib/capstone/phases/launch-commands";
import { PHASE_TEACHING_PRIMERS } from "@/lib/capstone/phases/teaching-primers";
import type { CapstonePhase, ToolId } from "@/lib/capstone/adapters/types";

const TOOL_DISPLAY_NAMES: Record<ToolId, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "github-copilot": "GitHub Copilot",
};

type PhaseDoneCheck =
  | { kind: "idle" }
  | { kind: "checking" }
  | {
      kind: "valid";
      nextPhase: CapstonePhase | null;
      artifactPath: string;
    }
  | {
      kind: "invalid";
      artifactExists: boolean;
      artifactPath: string;
      candidates: string[];
      patternsTried: string[];
      reason?: string;
    }
  | { kind: "error"; message: string };

type ExitInfo = { exitCode: number; signal: number | null };

/**
 * Chat-phase surface — same teaching shape as Phase 2 (bootstrap):
 * show the trainee the exact command the portal is about to run, the
 * BMAD invocation they'll type once the tool opens, then click to
 * launch the tool inside their CHOSEN_DIR.
 *
 * After the trainee quits the tool (Ctrl-D / /exit) the page calls
 * the phase-done route to validate the artifact and offers a Continue
 * button to the next phase. The PTY is killed on every unmount so we
 * don't leave orphaned AI-tool processes on the trainee's machine.
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
  const [openCount, setOpenCount] = useState(0);
  const [exitInfo, setExitInfo] = useState<ExitInfo | null>(null);
  const [phaseDone, setPhaseDone] = useState<PhaseDoneCheck>({ kind: "idle" });

  const launch = useMemo(() => getLaunchCommand(tool, phase), [tool, phase]);

  // Spawn body for the chat PTY route. Stable across renders so the
  // TerminalPane's useEffect doesn't re-spawn the PTY.
  const spawnBody = useMemo(() => ({ tool, phase }), [tool, phase]);
  const spawnUrl = `/api/capstone/chat/${sessionId}/pty/spawn`;
  // DELETE endpoint — same route, with phase as a query param. Called
  // by TerminalPane on unmount so we don't leak the tool process.
  const deleteUrl = `/api/capstone/chat/${sessionId}/pty/spawn?phase=${phase}`;
  // ptyId matches the server's registry key (`<sid>.<phase>` — see the
  // chat-phase spawn route). On "Re-open terminal" we bump openCount and
  // pass it as React `key` on TerminalPane so the component remounts —
  // unmount cleanup fires DELETE, then the new mount re-POSTs spawn.
  const ptyId = `${sessionId}.${phase}`;

  const checkPhaseDone = useCallback(async () => {
    setPhaseDone({ kind: "checking" });
    try {
      const res = await fetch("/api/capstone/phase-done", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          phase,
          acknowledged: true,
        }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        valid: boolean;
        nextPhase: CapstonePhase | null;
        validation: {
          artifactExists: boolean;
          artifactPath: string;
          shapeValid: boolean;
          candidates?: string[];
          patternsTried?: string[];
          reason?: string;
        };
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setPhaseDone({
          kind: "error",
          message: body.error ?? `phase-done check failed (HTTP ${res.status})`,
        });
        return;
      }
      if (body.valid) {
        setPhaseDone({
          kind: "valid",
          nextPhase: body.nextPhase,
          artifactPath: body.validation.artifactPath,
        });
      } else {
        setPhaseDone({
          kind: "invalid",
          artifactExists: body.validation.artifactExists,
          artifactPath: body.validation.artifactPath,
          candidates: body.validation.candidates ?? [],
          patternsTried: body.validation.patternsTried ?? [],
          reason: body.validation.reason,
        });
      }
    } catch (err) {
      setPhaseDone({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [sessionId, phase]);

  const handleExit = useCallback(
    (info: ExitInfo) => {
      setExitInfo(info);
      // Auto-trigger the phase-done validation on a clean exit. The
      // trainee can re-run it manually from the result UI if they edit
      // the artifact later without re-opening the tool.
      if (info.exitCode === 0) {
        void checkPhaseDone();
      }
    },
    [checkPhaseDone],
  );

  const reopenTerminal = useCallback(() => {
    setExitInfo(null);
    setPhaseDone({ kind: "idle" });
    setOpenCount((c) => c + 1);
    setOpened(true);
  }, []);

  const mainMaxWidth = opened ? "max-w-5xl" : "max-w-3xl";

  // After the last phase, the Continue button heads to the handoff page
  // instead of another /capstone/chat/<phase>.
  const continueHref =
    phaseDone.kind === "valid"
      ? phaseDone.nextPhase
        ? `/capstone/chat/${sessionId}/${phaseDone.nextPhase}?tool=${tool}`
        : `/capstone/handoff/${sessionId}`
      : null;
  const continueLabel =
    phaseDone.kind === "valid"
      ? phaseDone.nextPhase
        ? `Continue → Phase: ${PHASE_DISPLAY_NAMES[phaseDone.nextPhase]}`
        : "Continue → Handoff"
      : "";

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

      <PhaseTeachingPanel phase={phase} />

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
            key={openCount}
            ptyId={ptyId}
            spawnUrl={spawnUrl}
            deleteUrl={deleteUrl}
            spawnBody={spawnBody}
            onExit={handleExit}
          />
        </section>
      )}

      {exitInfo && (
        <PhaseDoneSection
          exitInfo={exitInfo}
          phaseDone={phaseDone}
          continueHref={continueHref}
          continueLabel={continueLabel}
          onRecheck={() => void checkPhaseDone()}
          onReopen={reopenTerminal}
        />
      )}

      {!exitInfo && (
        <footer className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            When you&apos;re done with this phase
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Quit the tool (Ctrl-D / type{" "}
            <code className="font-mono">/exit</code>) when the artifact is on
            disk. The portal will check that the artifact exists and offer a
            Continue button to the next phase.
          </p>
        </footer>
      )}
    </main>
  );
}

function PhaseDoneSection({
  exitInfo,
  phaseDone,
  continueHref,
  continueLabel,
  onRecheck,
  onReopen,
}: {
  exitInfo: ExitInfo;
  phaseDone: PhaseDoneCheck;
  continueHref: string | null;
  continueLabel: string;
  onRecheck: () => void;
  onReopen: () => void;
}) {
  const cleanExit = exitInfo.exitCode === 0;

  return (
    <section
      aria-labelledby="phase-done-heading"
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2
        id="phase-done-heading"
        className="text-lg font-medium text-zinc-900 dark:text-zinc-100"
      >
        Phase done?
      </h2>

      {!cleanExit ? (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
          ⚠ Tool exited with code {exitInfo.exitCode}
          {exitInfo.signal !== null ? ` (signal ${exitInfo.signal})` : ""}.
          That usually means the tool crashed or you Ctrl-C&apos;d before the
          artifact was written. Re-open the terminal and finish the phase.
        </p>
      ) : null}

      {phaseDone.kind === "checking" ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Checking the artifact on disk…
        </p>
      ) : null}

      {phaseDone.kind === "valid" && continueHref ? (
        <>
          <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
            ✓ Artifact found and valid:{" "}
            <code className="font-mono">{phaseDone.artifactPath}</code>
          </p>
          <Link
            href={continueHref}
            className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {continueLabel}
          </Link>
        </>
      ) : null}

      {phaseDone.kind === "invalid" ? (
        <>
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            ⚠ Couldn&apos;t identify the phase artifact in{" "}
            <code className="font-mono">{phaseDone.artifactPath}</code>.
          </p>
          {phaseDone.candidates.length > 0 ? (
            <div className="text-xs text-zinc-700 dark:text-zinc-300">
              <p className="mb-1">
                Files we saw in that directory (none matched the expected
                naming convention):
              </p>
              <ul className="ml-5 list-disc">
                {phaseDone.candidates.map((c) => (
                  <li key={c}>
                    <code className="font-mono">{c}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              No markdown files yet. The artifact this phase produces is
              expected to land in the directory above.
            </p>
          )}
          {phaseDone.patternsTried.length > 0 ? (
            <details className="text-xs text-zinc-600 dark:text-zinc-400">
              <summary className="cursor-pointer">
                What we looked for (canonical filename patterns)
              </summary>
              <ul className="ml-5 mt-1 list-disc font-mono">
                {phaseDone.patternsTried.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
          ) : null}
          {phaseDone.reason ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Detail: {phaseDone.reason}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReopen}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Re-open terminal →
            </button>
            <button
              type="button"
              onClick={onRecheck}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Re-check
            </button>
          </div>
        </>
      ) : null}

      {phaseDone.kind === "error" ? (
        <>
          <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
            ⚠ Could not check the artifact: {phaseDone.message}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRecheck}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Re-check
            </button>
            <button
              type="button"
              onClick={onReopen}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Re-open terminal
            </button>
          </div>
        </>
      ) : null}

      {phaseDone.kind === "idle" && cleanExit ? (
        <button
          type="button"
          onClick={onRecheck}
          className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Check artifact + continue
        </button>
      ) : null}

      {phaseDone.kind === "idle" && !cleanExit ? (
        <button
          type="button"
          onClick={onReopen}
          className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Re-open terminal →
        </button>
      ) : null}
    </section>
  );
}

/**
 * Per-phase teaching panel that surfaces the goal of the phase, what
 * the BMAD skill we're about to launch actually does, what the trainee
 * can expect in the conversation, and where the artifact lands. Lives
 * above the "What the portal will run" / terminal sections so the
 * teaching context is the FIRST thing the trainee reads, not an
 * afterthought.
 *
 * The portal is a teaching tool — without this panel we'd be telling
 * trainees to click a button without saying why.
 */
function PhaseTeachingPanel({ phase }: { phase: CapstonePhase }) {
  const primer = PHASE_TEACHING_PRIMERS[phase];
  return (
    <section
      aria-labelledby="phase-teaching-heading"
      className="flex flex-col gap-4 rounded-lg border border-sky-300 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-950/30"
    >
      <header className="flex flex-col gap-1">
        <h2
          id="phase-teaching-heading"
          className="text-lg font-medium text-sky-900 dark:text-sky-100"
        >
          📚 What this phase is for
        </h2>
        <p className="text-sm text-sky-900 dark:text-sky-100">
          {primer.goal}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            What the BMAD skill does
          </h3>
          <p className="text-sm text-zinc-800 dark:text-zinc-200">
            {primer.skillDoes
              .split(/(`[^`]+`)/g)
              .map((part, i) =>
                part.startsWith("`") && part.endsWith("`") ? (
                  <code
                    key={i}
                    className="font-mono text-xs rounded bg-zinc-900 px-1 py-0.5 text-zinc-100 dark:bg-zinc-800"
                  >
                    {part.slice(1, -1)}
                  </code>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            What to expect in the chat
          </h3>
          <ul className="ml-4 list-disc text-sm text-zinc-800 dark:text-zinc-200">
            {primer.whatToExpect.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-sky-200 pt-3 dark:border-sky-900">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
          Why this phase exists in the chain
        </h3>
        <p className="text-sm text-zinc-800 dark:text-zinc-200">
          {primer.whyThisMatters}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
          Artifact this phase produces
        </h3>
        <code className="self-start font-mono text-xs rounded bg-zinc-900 px-2 py-1 text-zinc-100 dark:bg-zinc-800">
          {primer.artifactPath}
        </code>
      </div>
    </section>
  );
}
