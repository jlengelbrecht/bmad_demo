import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "./theme-toggle";

/**
 * Sticky site header with three layout slots:
 *  - left:  brand mark from `public/brand/logo.png` + label
 *  - middle: primary nav (audience entries + capstone)
 *  - right: theme toggle (light / dark / auto)
 *
 * Logo source is a forkable slot — drop a different file at
 * `public/brand/logo.png` (or .svg) to skin the portal for your
 * team. Default ships the Cargill mark since this repo is for
 * Cargill internal use; adopters who fork are expected to swap the
 * file. Story 11.1 AC7's `<picture>`-element separate-light/dark
 * variant is a future upgrade; v1 uses a CSS filter for dark mode.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          aria-label="BMAD Demo home"
          className="group inline-flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <Image
            src="/brand/logo.png"
            alt=""
            width={120}
            height={40}
            priority
            className="h-7 w-auto object-contain dark:brightness-0 dark:invert"
          />
          <span aria-hidden className="hidden h-5 w-px bg-zinc-300 sm:block dark:bg-zinc-700" />
          <span className="hidden text-sm font-semibold tracking-tight text-zinc-700 group-hover:text-sky-700 sm:inline dark:text-zinc-300 dark:group-hover:text-sky-300">
            BMAD Demo
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label="Primary" className="flex items-center gap-0.5">
            <NavLink href="/start-here">Trainee</NavLink>
            <NavLink href="/stakeholder">Stakeholder</NavLink>
            <NavLink href="/facilitator">Facilitator</NavLink>
            <span aria-hidden className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
            <NavLink href="/capstone" emphasized>
              Capstone
            </NavLink>
          </nav>
          <span aria-hidden className="hidden h-4 w-px bg-zinc-300 sm:block dark:bg-zinc-700" />
          <ThemeToggle />
        </div>
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
