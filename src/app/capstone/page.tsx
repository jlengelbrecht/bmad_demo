import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CAPSTONE_STEP_ORDER } from "@/lib/capstone/steps";
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
        The rebuilt capstone walks you through the BMAD artifact chain by chatting with your local AI tool and scaffolds a fresh repo at a path you choose.
      </p>
      <StartCapstoneButton />
    </section>
  );
}

function SessionPanel({ session }: { session: CapstoneSessionRow }) {
  const completedSteps = completedStepsForSession(session.id);
  const isComplete = session.completedAt !== null;

  return (
    <section
      aria-labelledby="capstone-session-heading"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 id="capstone-session-heading" className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {isComplete
          ? `Your last capstone — ${formatIsoDate(session.completedAt!)}`
          : `Prior capstone session — started ${formatIsoDate(idToIsoDate(session.id))}`}
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Session id: <code className="font-mono text-xs">{session.id}</code>
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

      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        The textarea-based capstone has been retired. The rebuilt capstone is in active development; your prior session row is preserved for history.
      </p>

      <StartCapstoneButton label={isComplete ? "Start a new capstone" : "Try the rebuilt capstone"} />
    </section>
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
