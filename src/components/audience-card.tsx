import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Three-audience-card grid on `/` — trainee, stakeholder, facilitator.
 *
 * Visual contract: identical chrome (border, padding, shadow, radius)
 * across all three. Differentiated by icon + headline + blurb + time
 * investment + CTA copy ONLY. Per Story 11.2's "answer to the
 * three-color tile critique" — cards no longer carry per-audience
 * accent colors that read as ranked or categorized.
 *
 * Single brand accent (sky-500/600) flows through hover + the active
 * focus ring + the CTA arrow.
 */
type AudienceCardProps = {
  href: string;
  title: string;
  blurb: string;
  audience: string;
  timeInvestment: string;
  icon: ReactNode;
  cta: string;
};

export function AudienceCard({
  href,
  title,
  blurb,
  audience,
  timeInvestment,
  icon,
  cta,
}: AudienceCardProps) {
  return (
    <Link
      href={href}
      aria-label={`${title} (${timeInvestment})`}
      className="group relative flex flex-col gap-5 overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md hover:shadow-sky-100 focus-visible:-translate-y-0.5 focus-visible:border-sky-500 focus-visible:shadow-md focus-visible:shadow-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-sky-700 dark:hover:shadow-sky-950/40 dark:focus-visible:border-sky-600 dark:focus-visible:shadow-sky-950/40"
    >
      {/* Subtle top-edge accent line — sky on hover/focus */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-sky-400 to-sky-600 transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
      />

      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-sky-50 group-hover:text-sky-700 group-focus-visible:bg-sky-50 group-focus-visible:text-sky-700 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-sky-950/60 dark:group-hover:text-sky-300 dark:group-focus-visible:bg-sky-950/60 dark:group-focus-visible:text-sky-300"
        >
          {icon}
        </span>
        <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {audience}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {blurb}
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {timeInvestment}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 transition-transform duration-200 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 dark:text-sky-300">
          {cta}
          <span aria-hidden className="text-base leading-none">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
