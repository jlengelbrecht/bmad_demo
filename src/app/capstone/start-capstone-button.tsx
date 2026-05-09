"use client";

import Link from "next/link";

type Props = {
  /** Where the button navigates. Defaults to `/capstone/setup-coming-soon`. */
  href?: string;
  /** Visible button label. Defaults to "Start your capstone". */
  label?: string;
};

/**
 * Story 10.1 interim: the rebuilt capstone (Epic 5+) hasn't shipped yet,
 * so the button just navigates to the placeholder page that explains the
 * rebuild. Story 10.2 / Epic 6 repoints this at the setup wizard and
 * restores any session-creation logic the new flow needs.
 */
export function StartCapstoneButton({
  href = "/capstone/setup-coming-soon",
  label = "Start your capstone",
}: Props) {
  return (
    <div className="not-prose flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <Link
        href={href}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {label}
      </Link>
    </div>
  );
}
