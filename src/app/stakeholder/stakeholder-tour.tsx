"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * Stakeholder guided tour — six panels, prev/next navigation, no
 * LLM in the live path. Designed for a screen-share demo on a Teams
 * call: each panel fits in a 1280×720 frame without internal scrolling,
 * the contract → enforcement → propagation arc lands in 8–12 minutes,
 * and every artifact link points at a REAL file in this repo (the
 * portal eats its own dog food).
 *
 * The narrative arc:
 *   1. Problem        — why spec-driven AI work matters now.
 *   2. Contract       — show the unit of work (a real story file).
 *   3. Chain          — trace the artifact chain (brief → PRD → ... → story).
 *   4. Enforcement    — CODEOWNERS + CONTRIBUTING.md in THIS repo.
 *   5. Propagation    — same artifacts work across Claude, Codex, Copilot.
 *   6. Adoption       — what it takes to pilot, with a CTA into the capstone.
 *
 * Keyboard: ← / → / Home / End / digits 1–6.
 */

type Panel = {
  id: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
};

const PANELS: Panel[] = [
  {
    id: "problem",
    eyebrow: "01 / The problem",
    title: "AI-generated code is shipping faster than teams can review it.",
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          Engineering teams are adopting AI coding tools at a pace that outruns
          the review practices built for human-authored code. Reviewers default
          to <em>&ldquo;looks right&rdquo;</em> because there&apos;s no
          contract to compare a diff against. AI tools can&apos;t feel a
          team&apos;s conventions; humans can&apos;t feel an LLM&apos;s
          shortcuts.
        </p>
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          What&apos;s missing isn&apos;t more tooling. It&apos;s a{" "}
          <strong>contract</strong> the AI tool reads when authoring, the
          reviewer reads when approving, and the team reads when onboarding.
        </p>
        <div className="rounded-md border border-sky-300 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/40">
          <p className="text-sm text-sky-900 dark:text-sky-100">
            <strong>BMAD</strong> is a framework for spec-driven AI work
            with a team-rituals layer. <strong>This portal</strong> teaches
            it — using its own PRD, architecture, story specs, CODEOWNERS,
            and CONTRIBUTING.md as the lesson material.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "contract",
    eyebrow: "02 / The contract",
    title: "Every change starts with a story file. AI writes against it; humans review against it.",
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          The unit of work in BMAD is a markdown file in the repo. It carries a
          user-story, numbered acceptance criteria in Given/When/Then form, dev
          notes lifted from the architecture, and a tasks/subtasks checklist.
        </p>
        <ArtifactCallout
          label="Real story spec from this repo"
          file="_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md"
          excerpt={`# Story 3.3: Mark-complete client UI for lessons and labs

## Story
As a trainee finishing a lesson or running a lab,
I want a clearly labeled "Mark complete" button on each lesson and lab page,
So that I can track my position through the curriculum across visits.

## Acceptance Criteria
**AC1 — Initial-render button (not yet completed)**
- On a lesson page where the lesson is NOT marked complete, a "Mark complete" button is visible.
- Button has an accessible label and is keyboard-focusable.

**AC2 — Click → POST + optimistic update + revert on failure**
- Click fires \`fetch('/api/progress', { method: 'POST', ... })\`.
- During the request, the button is disabled with a pending state.
- The local UI optimistically reflects "Completed" before the response arrives.
- On a non-2xx response, the local state reverts and an inline error surfaces.`}
        />
        <p className="text-sm italic text-zinc-600 dark:text-zinc-400">
          Without this file, AI code review degenerates into{" "}
          <em>&ldquo;does this look right?&rdquo;</em> With it, review becomes{" "}
          <em>&ldquo;does the diff implement these acceptance criteria,
          nothing more?&rdquo;</em> That&apos;s a vibe-check turning into a
          repeatable practice.
        </p>
      </div>
    ),
  },
  {
    id: "chain",
    eyebrow: "03 / The chain",
    title: "Stories don't exist in isolation. They cite the brief, the PRD, and the architecture.",
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          BMAD&apos;s discipline is that every artifact downstream cites the
          ones upstream by ID. A story implements a PRD requirement
          (FR-1, NFR-S2), which traces to an architecture decision, which
          traces to a brief that captured the original{" "}
          <em>why</em>. No artifact is a black box.
        </p>
        <div className="rounded-md border border-zinc-300 bg-zinc-50 p-4 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
          <div className="flex flex-col gap-1">
            <Chain step="Brief" file="product-brief-bmad_demo.md" caption="the why — customer + problem" />
            <ChainArrow />
            <Chain step="PRD" file="prd.md" caption="functional + non-functional requirements (FR-1, NFR-S2, ...)" />
            <ChainArrow />
            <Chain step="Architecture" file="architecture.md" caption="technical decisions, threat model, NFR realization" />
            <ChainArrow />
            <Chain step="Epics + stories" file="epics.md" caption="the backlog index" />
            <ChainArrow />
            <Chain step="Per-story specs" file="implementation-artifacts/" caption="100–300 line implementation contract" />
            <ChainArrow />
            <Chain step="Code + tests" file="src/" caption="reviewed against the story spec" />
          </div>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          All of these files live in this repo — open the PRD as the
          starting point:{" "}
          <Link
            href="/source/_bmad-output/planning-artifacts/prd.md"
            className="font-mono text-sky-700 underline dark:text-sky-300"
          >
            /source/_bmad-output/planning-artifacts/prd.md
          </Link>
          . The portal&apos;s own planning chain is the lesson material.
        </p>
      </div>
    ),
  },
  {
    id: "enforcement",
    eyebrow: "04 / Enforcement",
    title: "The contract becomes a gate via CODEOWNERS and CONTRIBUTING.md.",
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          A contract is just a social agreement until something enforces
          it. BMAD pairs the story file with two GitHub-native files
          your team probably already uses partially:
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <GovernanceCard
            label="The machine gate"
            file=".github/CODEOWNERS"
            href="/source/.github/CODEOWNERS"
            description="Maps file patterns to reviewers. With branch protection's 'Require review from Code Owners' on, the named owner's approval is required to merge."
          />
          <GovernanceCard
            label="The human path"
            file="CONTRIBUTING.md"
            href="/source/CONTRIBUTING.md"
            description="Tells humans (AI-using or not) how to propose a change. Documents the three governance gates, the BMAD path, the without-AI path, and the branch-protection prerequisite."
          />
        </div>
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-sm text-emerald-900 dark:text-emerald-100">
            <strong>Both files exist in this repo right now.</strong> The
            portal practices the governance pattern it teaches. Click the
            file names above to read the actual files we ship with.
          </p>
        </div>
        <p className="text-sm italic text-zinc-600 dark:text-zinc-400">
          Adoption requires no new procurement, no SaaS subscription, no new
          auth surface. CODEOWNERS and branch protection are GitHub-native
          and predate BMAD by years. The curriculum&apos;s job is to teach
          the team to wire them together correctly.
        </p>
      </div>
    ),
  },
  {
    id: "propagation",
    eyebrow: "05 / Propagation",
    title: "Same artifacts, any AI tool, any teammate. Tool-agnostic by design.",
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          The artifact chain is plain markdown. Story files don&apos;t reference
          any specific AI tool&apos;s syntax. The portal&apos;s capstone has
          trainees pick one of three tools and produce identical artifacts:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <ToolBadge name="Claude Code" sub=".claude/skills/" />
          <ToolBadge name="Codex (OpenAI)" sub=".agents/skills/" />
          <ToolBadge name="GitHub Copilot CLI" sub=".agents/skills/" />
        </div>
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          Teams can switch tools — or use multiple tools in parallel — without
          changing the chain. The contract holds across the change.
        </p>
        <details className="rounded-md border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
          <summary className="cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
            The three objections every leader raises (click to expand)
          </summary>
          <div className="mt-3 flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <div>
              <p className="font-semibold">Procurement?</p>
              <p>
                None. BMAD is open-source MIT, the curriculum runs locally,
                and your AI tool is whatever you&apos;ve already procured.
              </p>
            </div>
            <div>
              <p className="font-semibold">SSO / RBAC / data residency?</p>
              <p>
                The portal has zero login screens and makes zero outbound
                calls. Every model call goes through your AI tool&apos;s
                process under your tool&apos;s auth, on your machine.
              </p>
            </div>
            <div>
              <p className="font-semibold">Vendor lock-in?</p>
              <p>
                The artifacts are markdown in Git. Worst case, you keep the
                artifacts and discard the BMAD framework — the contract
                pattern survives independently.
              </p>
            </div>
          </div>
        </details>
      </div>
    ),
  },
  {
    id: "adoption",
    eyebrow: "06 / Adoption",
    title: "Pilot in a week. Measure on real work.",
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          A typical pilot rhythm for a team adopting BMAD:
        </p>
        <ol className="ml-5 flex list-decimal flex-col gap-2 text-base text-zinc-700 dark:text-zinc-300">
          <li>
            <strong>Day 1.</strong> One engineer completes the curriculum
            (~3 hours: 7 lessons + 3 labs + capstone). They walk away with a
            real BMAD-bootstrapped repo.
          </li>
          <li>
            <strong>Day 2–3.</strong> The team runs the{" "}
            <code className="font-mono text-sm">sync</code> lab together
            (~1.5 hours). Everyone shares the same muscle memory for the
            ceremony chain.
          </li>
          <li>
            <strong>Week 1–2.</strong> Wire CODEOWNERS + branch protection
            on a real repo. Pilot two or three real stories through the
            chain. Measure review-cycle time and spec-vs-code drift.
          </li>
          <li>
            <strong>Decide to scale or stop.</strong> If review is faster
            and spec drift is lower, expand. If not, the team learned a
            governance pattern they can keep regardless.
          </li>
        </ol>
        <div className="flex flex-col gap-3 rounded-md border border-sky-300 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-950/40">
          <p className="text-base font-medium text-sky-900 dark:text-sky-100">
            See it end-to-end in the capstone.
          </p>
          <p className="text-sm text-sky-900 dark:text-sky-100">
            The capstone walks through 10 phases — bootstrap a fresh repo,
            produce a brief, PRD, architecture, epics, sprint plan, ship a
            real story with green tests, and author CODEOWNERS +
            CONTRIBUTING.md for the new repo. ~90 minutes; produces a real
            artifact set you can show your team Monday morning.
          </p>
          <Link
            href="/capstone"
            className="w-fit rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Open the capstone →
          </Link>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Or browse the curriculum first at{" "}
          <Link
            href="/start-here"
            className="font-medium text-sky-700 underline dark:text-sky-300"
          >
            /start-here
          </Link>
          . The lessons are short (~15 min each); the labs are where the
          team-shape muscle memory comes from.
        </p>
      </div>
    ),
  },
];

export function StakeholderTour() {
  const [index, setIndex] = useState(0);
  const total = PANELS.length;
  const panel = PANELS[index];

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(
    () => setIndex((i) => Math.min(total - 1, i + 1)),
    [total],
  );
  const goTo = useCallback(
    (i: number) => setIndex(Math.max(0, Math.min(total - 1, i))),
    [total],
  );

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      // Don't hijack typing in inputs / contenteditable.
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (ev.key === "ArrowLeft") goPrev();
      else if (ev.key === "ArrowRight" || ev.key === " ") goNext();
      else if (ev.key === "Home") goTo(0);
      else if (ev.key === "End") goTo(total - 1);
      else if (/^[1-9]$/.test(ev.key)) {
        const n = parseInt(ev.key, 10) - 1;
        if (n < total) goTo(n);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, goTo, total]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Stakeholder demo — BMAD on a team
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          ~10 minute walkthrough. ← / → to navigate, or click the dots.
        </p>
      </header>

      <article
        aria-live="polite"
        aria-labelledby="panel-title"
        className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            {panel.eyebrow}
          </p>
          <h2
            id="panel-title"
            className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            {panel.title}
          </h2>
        </div>
        <div>{panel.body}</div>
      </article>

      <nav
        aria-label="Tour navigation"
        className="flex items-center justify-between"
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          ← Previous
        </button>

        <div className="flex items-center gap-2" role="tablist" aria-label="Panel selector">
          {PANELS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Panel ${i + 1}: ${p.title}`}
              onClick={() => goTo(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-sky-700 dark:bg-sky-400"
                  : "bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={index === total - 1}
          className="rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next →
        </button>
      </nav>
    </main>
  );
}

function ArtifactCallout({
  label,
  file,
  excerpt,
}: {
  label: string;
  file: string;
  excerpt: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/60">
      <div className="flex items-center justify-between border-b border-zinc-300 bg-zinc-100 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
        </p>
        <Link
          href={`/source/${file}`}
          className="font-mono text-xs text-sky-700 underline dark:text-sky-300"
        >
          {file}
        </Link>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
        {excerpt}
      </pre>
    </div>
  );
}

function Chain({
  step,
  file,
  caption,
}: {
  step: string;
  file: string;
  caption: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
        {step}
      </span>
      <span className="text-zinc-500 dark:text-zinc-500">{file}</span>
      <span className="text-[10px] italic text-zinc-500 dark:text-zinc-500">
        — {caption}
      </span>
    </div>
  );
}

function ChainArrow() {
  return (
    <span aria-hidden className="ml-3 text-zinc-400 dark:text-zinc-600">
      ↓
    </span>
  );
}

function GovernanceCard({
  label,
  file,
  href,
  description,
}: {
  label: string;
  file: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-md border border-zinc-300 bg-white p-4 transition-colors hover:border-sky-400 hover:bg-sky-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-sky-600 dark:hover:bg-sky-950/30"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
        {label}
      </p>
      <code className="font-mono text-sm text-zinc-900 group-hover:text-sky-800 dark:text-zinc-100 dark:group-hover:text-sky-200">
        {file} →
      </code>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{description}</p>
    </Link>
  );
}

function ToolBadge({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-md border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {name}
      </p>
      <p className="font-mono text-xs text-zinc-500 dark:text-zinc-500">
        skills → <code>{sub}</code>
      </p>
    </div>
  );
}
