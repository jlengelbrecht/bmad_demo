"use client";

import Link from "next/link";

type Props = {
  /** Where the button navigates. Defaults to `/capstone/setup` (Story 6.1). */
  href?: string;
  /** Visible button label. Defaults to "Start your capstone". */
  label?: string;
};

/**
 * Per Story 10.2: the button is a `next/link` to `/capstone/setup`,
 * which is Story 6.1's tool-selection + auth-precheck page. The
 * /capstone/setup page generates a fresh capstone-session id on entry
 * (CAPSTONE_SESSION_ID format, redirect-with-session pattern), so the
 * button itself is purely navigational — no session-creation POST.
 */
export function StartCapstoneButton({
  href = "/capstone/setup",
  label = "Start the capstone",
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
