import { AudienceCard } from "@/components/audience-card";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">BMAD Demo</h1>
        <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
          A runnable training portal that teaches teams how to adopt BMAD &mdash; spec-driven
          software development with AI agents. Pick the path that matches why you&rsquo;re here.
        </p>
      </header>

      <section
        aria-label="Choose your path"
        className="grid gap-6 md:grid-cols-3"
      >
        <AudienceCard
          href="/start-here"
          accent="trainee"
          audience="Trainee"
          title="Trainee — Start Here"
          blurb="Six lessons and three labs that teach BMAD using this repo's own artifacts as the lesson material. Capstone produces a real BMAD artifact set."
          timeInvestment="~3 hours · self-paced"
          icon={
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M10 2 1 6l9 4 9-4-9-4Zm0 6L4 5.6V11l6 2.6 6-2.6V5.6L10 8Zm-7 4.6V15l7 3 7-3v-2.4l-7 3-7-3Z" />
            </svg>
          }
        />
        <AudienceCard
          href="/stakeholder"
          accent="stakeholder"
          audience="Stakeholder"
          title="Stakeholder — 15-minute Demo"
          blurb="A timed walkthrough of what BMAD looks like in practice and the trade-offs it makes, with explicit objections and answers."
          timeInvestment="15 minutes"
          icon={
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 1.5a1 1 0 0 0-1 1V10a1 1 0 0 0 .55.9l3 1.5a1 1 0 0 0 .9-1.8L11 9.4V6a1 1 0 0 0-1-1Z" />
            </svg>
          }
        />
        <AudienceCard
          href="/facilitator"
          accent="facilitator"
          audience="Facilitator"
          title="Facilitator — Workshop Guide"
          blurb="Timing, prompts, and rituals to run a half-day or full-day BMAD workshop with your team."
          timeInvestment="~30 min prep · half-day delivery"
          icon={
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-5l-3 3v-3H4a1 1 0 0 1-1-1V4Zm3 3h8v1.5H6V7Zm0 3h6v1.5H6V10Z" />
            </svg>
          }
        />
      </section>
    </main>
  );
}
