import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { readCapstoneArtifact } from "@/lib/capstone/read-artifact";
import {
  CAPSTONE_STEPS,
  CAPSTONE_STEP_ORDER,
  nextStepAfter,
  type CapstoneStepName,
} from "@/lib/capstone/steps";
import {
  getCapstoneSessionById,
  getRecentCapstoneSession,
} from "@/lib/db/progress-db";
import { CAPSTONE_SESSION_ID } from "@/lib/db/schemas";

import { CapstoneStepForm } from "./capstone-step-form";

type StepParams = { step: string };
type SearchParams = { session?: string | string[] };

export async function generateMetadata({
  params,
}: {
  params: Promise<StepParams>;
}): Promise<Metadata> {
  const { step } = await params;
  if (!isCanonicalStep(step)) return { title: "Capstone — step not found · BMAD Demo" };
  return { title: `Capstone — ${CAPSTONE_STEPS[step].title} · BMAD Demo` };
}

function isCanonicalStep(value: string): value is CapstoneStepName {
  return (CAPSTONE_STEP_ORDER as readonly string[]).includes(value);
}

export default async function CapstoneStepPage({
  params,
  searchParams,
}: {
  params: Promise<StepParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { step } = await params;
  if (!isCanonicalStep(step)) notFound();

  const { session: rawSession } = await searchParams;
  // Story 4.4 review patch: array `?session=` (Next.js `string | string[]`)
  // and malformed strings both treat as `notFound`, matching `/capstone`'s
  // contract. Previously the per-step page silently fell back to
  // `getRecentCapstoneSession`, which masked URL typos.
  if (Array.isArray(rawSession)) notFound();
  const sessionParam = rawSession;
  if (sessionParam !== undefined && !CAPSTONE_SESSION_ID.test(sessionParam)) {
    notFound();
  }

  // Resolve the active session id.
  let sessionId: string | null = null;
  if (sessionParam !== undefined) {
    const row = getCapstoneSessionById(sessionParam);
    if (row === null) notFound();
    // Story 4.4 review patch: a URL-pinned COMPLETE session redirects to
    // the overview's complete-session panel. Previously the per-step
    // page rendered the form (claiming "view-completed mode") but the
    // form's save path always errored: `/api/capstone/save` rejects a
    // non-active session with 400, and `markCapstoneSessionComplete`
    // no-ops on already-complete rows. The redirect is the honest UX:
    // trainee views finalized artifacts via the overview, not via an
    // editable form that silently overwrites then fails to commit.
    if (row.completedAt !== null) {
      redirect(`/capstone?session=${row.id}`);
    }
    sessionId = row.id;
  }
  if (sessionId === null) {
    // Fall back to the most recent ACTIVE session.
    const recent = getRecentCapstoneSession();
    if (recent !== null && recent.completedAt === null) sessionId = recent.id;
  }
  if (sessionId === null) {
    // No active session anywhere — send the trainee to the overview's
    // resume-or-start panel.
    redirect("/capstone");
  }

  const meta = CAPSTONE_STEPS[step];
  const initialContent = (await readCapstoneArtifact(sessionId, step)) ?? "";
  const nextStep = nextStepAfter(step);
  const isFinalStep = nextStep === null;
  const nextStepHref = nextStep ? `/capstone/${nextStep}?session=${sessionId}` : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Capstone · session <code className="font-mono normal-case">{sessionId}</code>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {meta.title}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{meta.promptOutline}</p>
      </header>

      <CapstoneStepForm
        session={sessionId}
        step={step}
        stepTitle={meta.title}
        initialContent={initialContent}
        isFinalStep={isFinalStep}
        nextStepHref={nextStepHref}
      />
    </main>
  );
}
