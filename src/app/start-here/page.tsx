import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trainee — Start Here · BMAD Demo",
  robots: { index: false, follow: false },
};

export default function StartHerePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Trainee — Start Here</h1>
      <p className="text-base text-zinc-600 dark:text-zinc-300">
        Lesson rendering lands in Epic 2. This route exists so the home-page card has somewhere to go.
      </p>
      <p>
        <Link href="/" className="text-sm font-medium underline underline-offset-4">
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
