import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found · AI Contribution Framework",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Not found</h1>
      <p className="text-base text-zinc-600 dark:text-zinc-300">
        We couldn&apos;t find the page you asked for. The portal&apos;s entry points are linked from
        the home page — pick one and start from there.
      </p>
      <p>
        <Link href="/" className="text-sm font-medium underline underline-offset-4">
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
