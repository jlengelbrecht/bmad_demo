import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
        <Link
          href="/"
          aria-label="BMAD Demo home"
          className="group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-sm transition-transform group-hover:scale-105"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M10 2 1 6l9 4 9-4-9-4Zm0 6L4 5.6V11l6 2.6 6-2.6V5.6L10 8Z" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-tight text-zinc-900 group-hover:text-sky-700 dark:text-zinc-100 dark:group-hover:text-sky-300">
            BMAD Demo
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          <NavLink href="/start-here">Trainee</NavLink>
          <NavLink href="/stakeholder">Stakeholder</NavLink>
          <NavLink href="/facilitator">Facilitator</NavLink>
          <span aria-hidden className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <NavLink href="/capstone" emphasized>
            Capstone
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  emphasized,
}: {
  href: string;
  children: string;
  emphasized?: boolean;
}) {
  const base =
    "inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500";
  const styling = emphasized
    ? "text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40"
    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
  return (
    <Link href={href} className={`${base} ${styling}`}>
      {children}
    </Link>
  );
}
