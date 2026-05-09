import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdapterRegistry } from "@/lib/capstone/adapters";
import { AUTH_HINTS, INSTALL_HINTS } from "@/lib/capstone/adapters/install-hints";
import type { ToolAdapter, ToolId } from "@/lib/capstone/adapters/types";
import { runPreflightChecks } from "@/lib/capstone/preflight/checks";
import { CAPSTONE_SESSION_ID } from "@/lib/db/schemas";

export const metadata: Metadata = {
  title: "Capstone setup — Phase 0/0.5 · BMAD Demo",
};
export const dynamic = "force-dynamic";

type SearchParams = { session?: string | string[] };

function compactUtcNow(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

type ToolCheckResult = {
  installed: boolean;
  authed: boolean | null;
  error?: string;
};

async function checkTool(adapter: ToolAdapter): Promise<ToolCheckResult> {
  try {
    const installed = await adapter.detectInstalled();
    const authed = installed ? await adapter.detectAuthenticated() : null;
    return { installed, authed };
  } catch (err) {
    return {
      installed: false,
      authed: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function CapstoneSetupPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session: rawSession } = await searchParams;
  const sessionParam = Array.isArray(rawSession) ? undefined : rawSession;

  if (!sessionParam || !CAPSTONE_SESSION_ID.test(sessionParam)) {
    const fresh = compactUtcNow();
    redirect(`/capstone/setup?session=${fresh}`);
  }
  const sessionId = sessionParam;

  const registry = getAdapterRegistry();
  const adapters = [...registry.values()];

  const [preflight, ...toolResults] = await Promise.all([
    runPreflightChecks(),
    ...adapters.map(checkTool),
  ]);

  const preflightAllGreen = preflight.allGreen;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Capstone setup
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Phase 0 — environment check. Phase 0.5 — tool selection + auth pre-check.
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Session id: <code className="font-mono">{sessionId}</code>
        </p>
      </header>

      <PreflightPanel preflight={preflight} sessionId={sessionId} />

      <section
        aria-labelledby="tool-grid-heading"
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2
          id="tool-grid-heading"
          className="text-lg font-medium text-zinc-900 dark:text-zinc-100"
        >
          Pick your AI tool
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Three tools are supported at v1. The portal will not auto-install or auto-authenticate any of them.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {adapters.map((adapter, i) => (
            <ToolCard
              key={adapter.manifest.id}
              adapter={adapter}
              result={toolResults[i]}
              disabled={!preflightAllGreen}
              sessionId={sessionId}
            />
          ))}
        </div>
        {!preflightAllGreen ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Resolve the preflight issues above before selecting a tool.
          </p>
        ) : null}
      </section>

      <details className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <summary className="cursor-pointer text-zinc-800 dark:text-zinc-200">
          What does this check?
        </summary>
        <div className="mt-2 flex flex-col gap-2 text-zinc-600 dark:text-zinc-400">
          <p>
            <strong>Installed:</strong> the tool&apos;s CLI binary is on{" "}
            <code className="font-mono text-xs">$PATH</code> at a supported version.
          </p>
          <p>
            <strong>Authed:</strong> the tool can complete a one-token round-trip with its cloud
            backend using credentials the trainee already has on the machine. The portal never
            stores, forwards, or proxies these credentials.
          </p>
        </div>
      </details>
    </main>
  );
}

function PreflightPanel({
  preflight,
  sessionId,
}: {
  preflight: { checks: { name: string; status: string; requiredVersion: string; actualVersion?: string; hint?: string }[]; allGreen: boolean };
  sessionId: string;
}) {
  return (
    <section
      aria-labelledby="preflight-heading"
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2
        id="preflight-heading"
        className="text-lg font-medium text-zinc-900 dark:text-zinc-100"
      >
        Phase 0 — preflight
      </h2>
      <ul className="flex flex-col gap-2">
        {preflight.checks.map((c) => (
          <li key={c.name} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden
              className={
                c.status === "green"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }
            >
              {c.status === "green" ? "✓" : "✗"}
            </span>
            <span className="flex flex-col">
              <span className="font-mono text-zinc-900 dark:text-zinc-100">
                {c.name}{" "}
                <span className="text-zinc-500 dark:text-zinc-500">
                  ({c.actualVersion ?? "not detected"} / required {c.requiredVersion})
                </span>
              </span>
              {c.hint ? (
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{c.hint}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {!preflight.allGreen ? (
        <Link
          href={`/capstone/setup?session=${sessionId}`}
          className="inline-flex w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Re-check preflight
        </Link>
      ) : null}
    </section>
  );
}

function ToolCard({
  adapter,
  result,
  disabled,
  sessionId,
}: {
  adapter: ToolAdapter;
  result: ToolCheckResult;
  disabled: boolean;
  sessionId: string;
}) {
  const id = adapter.manifest.id as ToolId;
  const installed = result.installed;
  const authed = result.authed;
  const allGreen = installed && authed === true;
  const cardDisabled = disabled || !allGreen;

  return (
    <article
      aria-labelledby={`tool-${id}-heading`}
      className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <header className="flex flex-col gap-1">
        <h3
          id={`tool-${id}-heading`}
          className="text-base font-medium text-zinc-900 dark:text-zinc-100"
        >
          {adapter.manifest.displayName}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          binary:{" "}
          <code className="font-mono">{adapter.manifest.cliBinary}</code>
          {" "}
          ({adapter.manifest.minVersion})
        </p>
      </header>
      <ul className="flex flex-col gap-1.5 text-xs">
        <li className="flex items-start gap-2">
          <span
            aria-hidden
            className={
              installed
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }
          >
            {installed ? "✓" : "✗"}
          </span>
          <span>
            {installed ? "Installed" : "Not on PATH"}
            {!installed ? (
              <span className="block text-zinc-500 dark:text-zinc-500">
                {INSTALL_HINTS[id]}
              </span>
            ) : null}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span
            aria-hidden
            className={
              authed === true
                ? "text-emerald-600 dark:text-emerald-400"
                : authed === false
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-zinc-400 dark:text-zinc-600"
            }
          >
            {authed === true ? "✓" : authed === false ? "✗" : "—"}
          </span>
          <span>
            {authed === true
              ? "Authenticated"
              : authed === false
                ? "Sign in needed"
                : "Not checked (install first)"}
            {authed === false ? (
              <span className="block text-zinc-500 dark:text-zinc-500">
                {AUTH_HINTS[id]}
              </span>
            ) : null}
          </span>
        </li>
      </ul>
      <Link
        href={
          cardDisabled
            ? "#"
            : `/capstone/setup/wizard?session=${sessionId}&tool=${id}`
        }
        aria-disabled={cardDisabled}
        className={`inline-flex w-fit rounded-md px-3 py-1.5 text-xs font-medium ${
          cardDisabled
            ? "cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
            : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        }`}
        tabIndex={cardDisabled ? -1 : 0}
      >
        {cardDisabled ? "Select (locked)" : "Select"}
      </Link>
      <a
        href={adapter.manifest.docsUrl}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        Docs →
      </a>
    </article>
  );
}
