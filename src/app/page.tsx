import Link from "next/link";

import { AudienceCard } from "@/components/audience-card";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-16 sm:py-20">
      {/* Hero */}
      <header className="flex flex-col items-start gap-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
          Training portal · BMAD spec-driven AI development
        </span>
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          Adopt BMAD as a team — without the&nbsp;guesswork.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-lg">
          A runnable training portal that teaches engineering teams how to adopt
          {" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">BMAD</span>
          {" "}
          and govern AI-assisted contributions using GitHub-native controls.
          Pick the path that matches why you&rsquo;re here.
        </p>
      </header>

      <section aria-label="Choose your path" className="grid gap-6 md:grid-cols-3">
        <AudienceCard
          href="/start-here"
          audience="Trainee"
          title="Start Here"
          blurb="Seven lessons + three labs that teach BMAD using this repo's own artifacts as the lesson material. Capstone produces a real BMAD artifact set."
          timeInvestment="~3 hours · self-paced"
          cta="Begin"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M10 2 1 6l9 4 9-4-9-4Zm0 6L4 5.6V11l6 2.6 6-2.6V5.6L10 8Zm-7 4.6V15l7 3 7-3v-2.4l-7 3-7-3Z" />
            </svg>
          }
        />
        <AudienceCard
          href="/stakeholder"
          audience="Stakeholder"
          title="15-minute Demo"
          blurb="A timed walkthrough of what BMAD looks like in practice and the trade-offs it makes, with explicit objections and answers."
          timeInvestment="15 minutes"
          cta="Watch"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 1.5a1 1 0 0 0-1 1V10a1 1 0 0 0 .55.9l3 1.5a1 1 0 0 0 .9-1.8L11 9.4V6a1 1 0 0 0-1-1Z" />
            </svg>
          }
        />
        <AudienceCard
          href="/facilitator"
          audience="Facilitator"
          title="Workshop Guide"
          blurb="Timing, prompts, and rituals to run a half-day or full-day BMAD workshop with your team."
          timeInvestment="~30 min prep · half-day delivery"
          cta="Plan"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-5l-3 3v-3H4a1 1 0 0 1-1-1V4Zm3 3h8v1.5H6V7Zm0 3h6v1.5H6V10Z" />
            </svg>
          }
        />
      </section>

      {/* What you'll get out of it */}
      <section
        aria-labelledby="what-you-get"
        className="grid gap-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/40 md:grid-cols-3"
      >
        <h2 id="what-you-get" className="sr-only">
          What you&rsquo;ll learn
        </h2>
        <Stat
          number="7"
          label="Lessons"
          desc="Conceptual + ecosystem coverage; ~15 min each, fully self-paced."
        />
        <Stat
          number="3"
          label="Labs"
          desc="Solo, full-team sync, and async cross-team — pick the format that fits."
        />
        <Stat
          number="1"
          label="Capstone"
          desc="A 90–120 min run that produces a real BMAD repo for your team to adopt."
        />
      </section>

      {/* Footer hints */}
      <footer className="flex flex-col items-start gap-3 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <p>
          No accounts, no signup, no remote services. The portal runs locally and your AI tool keeps doing its own thing.
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href="/capstone"
            className="font-medium text-sky-700 hover:underline dark:text-sky-300"
          >
            Skip to the capstone
          </Link>
          <span aria-hidden>·</span>
          <a
            href="https://docs.bmad-method.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sky-700 hover:underline dark:text-sky-300"
          >
            BMAD framework docs
          </a>
        </p>
      </footer>
    </main>
  );
}

function Stat({
  number,
  label,
  desc,
}: {
  number: string;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-sky-700 dark:text-sky-300">
          {number}
        </span>
        <span className="text-sm font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{desc}</p>
    </div>
  );
}
