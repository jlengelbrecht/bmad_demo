import { existsSync } from "node:fs";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { stepFile } from "@/lib/capstone/paths";
import { CAPSTONE_STEP_ORDER, nextIncompleteStep } from "@/lib/capstone/steps";
import {
  completedStepsForSession,
  getCapstoneSessionById,
  getRecentCapstoneSession,
  type CapstoneSessionRow,
} from "@/lib/db/progress-db";
import { CAPSTONE_SESSION_ID } from "@/lib/db/schemas";

import { StartCapstoneButton } from "./start-capstone-button";

export const metadata: Metadata = {
  title: "Capstone · BMAD Demo",
};

// Next.js 15+ exposes `searchParams` as `Promise<{ key?: string | string[] }>`.
// A repeated query parameter (`?session=a&session=b`) yields an array; we
// treat array values as malformed (notFound) — equivalent to a single
// id that fails the regex.
type SearchParams = { session?: string | string[] };

export default async function CapstonePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session: rawSession } = await searchParams;
  const sessionParam = Array.isArray(rawSession) ? undefined : rawSession;
  const sessionParamProvided = rawSession !== undefined;

  let session: CapstoneSessionRow | null;
  if (sessionParamProvided) {
    if (sessionParam === undefined || !CAPSTONE_SESSION_ID.test(sessionParam)) {
      notFound();
    }
    session = getCapstoneSessionById(sessionParam);
    if (!session) notFound();
  } else {
    session = getRecentCapstoneSession();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Capstone
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Produce a real BMAD artifact set in your working tree: 1 product brief, 1 epic, 2 user stories, and 1 architecture decision record.
        </p>
      </header>

      {session === null ? <NoSessionPanel /> : <SessionPanel session={session} />}
    </main>
  );
}

function NoSessionPanel() {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Start your capstone
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Each artifact lands as a file under <code className="font-mono text-xs">_bmad-output/capstone/&lt;session&gt;/</code> in your working tree — yours to commit to your team&apos;s repo.
      </p>
      <StartCapstoneButton />
    </section>
  );
}

function SessionPanel({ session }: { session: CapstoneSessionRow }) {
  const completedSteps = completedStepsForSession(session.id);
  const isComplete = session.completedAt !== null;
  const nextStep = isComplete ? null : nextIncompleteStep(completedSteps);

  return (
    <section
      aria-labelledby="capstone-session-heading"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 id="capstone-session-heading" className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {isComplete
          ? `Your last capstone — ${formatIsoDate(session.completedAt!)}`
          : `Resume your capstone — started ${formatIsoDate(idToIsoDate(session.id))}`}
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Session id: <code className="font-mono text-xs">{session.id}</code>
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {isComplete ? "Find your artifacts at " : "Artifacts land at "}
        <code className="font-mono text-xs">_bmad-output/capstone/{session.id}/</code>
        {isComplete ? " — commit them to your team's repo." : null}
      </p>

      <ol aria-label="Capstone steps" className="flex flex-col gap-1.5 text-sm">
        {CAPSTONE_STEP_ORDER.map((step) => {
          const stepComplete = completedSteps.has(step);
          return (
            <li
              key={step}
              aria-label={`${step}, ${stepComplete ? "completed" : "not yet"}`}
              className="flex items-center gap-2"
            >
              <span aria-hidden className={stepComplete ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-600"}>
                {stepComplete ? "✓" : "—"}
              </span>
              <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{step}</span>
            </li>
          );
        })}
      </ol>

      {nextStep ? (
        <Link
          href={`/capstone/${nextStep}?session=${session.id}`}
          className="inline-flex w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Continue with {nextStep} →
        </Link>
      ) : null}

      {isComplete ? (
        <>
          <ArtifactPathList sessionId={session.id} />
          <StartCapstoneButton label="Start a new capstone" />
        </>
      ) : null}
    </section>
  );
}

/**
 * Story 4.4 AC6: on the complete branch, list the absolute paths of all
 * 5 produced artifact files. Files that don't exist on disk are rendered
 * as `(not yet saved)` for resilience against partial-completion (e.g.,
 * a session marked complete via direct DB edit, or a future migration).
 */
function ArtifactPathList({ sessionId }: { sessionId: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Produced artifacts
      </p>
      <ul className="flex flex-col gap-1 text-xs">
        {CAPSTONE_STEP_ORDER.map((step) => {
          const target = stepFile(sessionId, step);
          const exists = existsSync(target);
          return (
            <li key={step} className="font-mono text-zinc-700 dark:text-zinc-300">
              {target}
              {exists ? null : (
                <span className="text-zinc-500 dark:text-zinc-500"> (not yet saved)</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        These are absolute paths in your working tree; commit them to your team&apos;s repo.
      </p>
    </div>
  );
}

/** Convert a compact-UTC id (`20260507T143022Z`) to a readable ISO date (`2026-05-07`). */
function idToIsoDate(id: string): string {
  // Caller guarantees id matches CAPSTONE_SESSION_ID.
  return `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`;
}

/** Render an ISO date for display. */
function formatIsoDate(iso: string): string {
  return iso.slice(0, 10);
}
