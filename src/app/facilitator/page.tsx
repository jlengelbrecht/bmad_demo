import Link from "next/link";

export default function FacilitatorPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Facilitator — Workshop Guide</h1>
      <p className="text-base text-zinc-600 dark:text-zinc-300">
        The facilitator guide lands in Epic 2. This route exists so the home-page card has
        somewhere to go.
      </p>
      <p>
        <Link href="/" className="text-sm font-medium underline underline-offset-4">
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
