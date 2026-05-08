import type { ReactNode } from "react";

type Accent = "trainee" | "stakeholder" | "facilitator";

const accentStyles: Record<Accent, { border: string; badgeBg: string; badgeText: string }> = {
  trainee: {
    border: "border-emerald-500",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/40",
    badgeText: "text-emerald-800 dark:text-emerald-200",
  },
  stakeholder: {
    border: "border-sky-500",
    badgeBg: "bg-sky-100 dark:bg-sky-900/40",
    badgeText: "text-sky-800 dark:text-sky-200",
  },
  facilitator: {
    border: "border-amber-500",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-800 dark:text-amber-200",
  },
};

type AudienceCardProps = {
  href: string;
  title: string;
  blurb: string;
  audience: string;
  timeInvestment: string;
  accent: Accent;
  icon: ReactNode;
};

export function AudienceCard({
  href,
  title,
  blurb,
  audience,
  timeInvestment,
  accent,
  icon,
}: AudienceCardProps) {
  const styles = accentStyles[accent];
  return (
    <a
      href={href}
      aria-label={`${audience}: ${title} — ${timeInvestment}`}
      className={`group flex flex-col gap-4 rounded-lg border-2 ${styles.border} bg-white p-6 shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:bg-zinc-900`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden
          className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${styles.badgeBg} ${styles.badgeText}`}
        >
          {icon}
        </span>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium uppercase tracking-wide ${styles.badgeBg} ${styles.badgeText}`}
        >
          {audience}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{blurb}</p>
      </div>
      <p className="mt-auto text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {timeInvestment}
      </p>
    </a>
  );
}
