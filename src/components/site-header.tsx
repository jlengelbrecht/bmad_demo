import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-zinc-100"
        >
          BMAD Demo
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4">
          <Link
            href="/capstone"
            className="text-xs font-medium uppercase tracking-wide text-zinc-600 hover:text-zinc-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Capstone
          </Link>
          <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Training Portal
          </span>
        </nav>
      </div>
    </header>
  );
}
