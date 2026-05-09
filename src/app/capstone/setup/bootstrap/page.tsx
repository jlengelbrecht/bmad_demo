"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { decodeWizardState } from "@/lib/capstone/wizard/state";

type Status = "idle" | "running" | "complete" | "failed";

export default function BootstrapPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");
  const tool = params.get("tool");
  const wizard = params.get("wizard");

  const decoded = useMemo(() => {
    if (!wizard) return null;
    try {
      return decodeWizardState(wizard);
    } catch {
      return null;
    }
  }, [wizard]);

  const [previewLine, setPreviewLine] = useState<string>("");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId || !/^\d{8}T\d{6}Z$/.test(sessionId) || !tool || !decoded) {
      router.replace("/capstone/setup");
    }
  }, [sessionId, tool, decoded, router]);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  if (!decoded) return null;

  const startBootstrap = () => {
    if (status === "running") return;
    setLogLines([]);
    setStatus("running");
    startRef.current = Date.now();
    const qs = new URLSearchParams({
      session: sessionId!,
      tool: tool!,
      chosenDir: decoded.targetDir,
      projectName: decoded.projectName,
      commLang: decoded.commLang,
      docLang: decoded.docLang,
      skill: decoded.skill,
      outputFolder: decoded.outputFolder,
    });
    const es = new EventSource(`/api/capstone/setup/bootstrap?${qs.toString()}`);
    esRef.current = es;
    es.addEventListener("preview", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setPreviewLine(data.command);
    });
    es.addEventListener("stdout", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setLogLines((prev) => [...prev, data.text]);
    });
    es.addEventListener("stderr", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setLogLines((prev) => [...prev, `[stderr] ${data.text}`]);
    });
    es.addEventListener("error", (e) => {
      // Browser native onerror doesn't carry data; named "error" SSE event does.
      const me = e as MessageEvent;
      if (me.data) {
        try {
          const data = JSON.parse(me.data);
          setLogLines((prev) => [...prev, `[error] ${data.message}`]);
        } catch {
          // ignore
        }
      }
    });
    es.addEventListener("done", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setExitCode(data.code);
      setStatus(data.code === 0 ? "complete" : "failed");
      es.close();
    });
  };

  const goNext = () => {
    router.push(`/capstone/setup/bootstrap/complete?session=${sessionId}&tool=${tool}`);
  };

  const command = `npx bmad-method install --directory ${decoded.targetDir} --modules bmm --tools ${tool} ...`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Phase 2 — bootstrap
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The portal will run <code className="font-mono">npx bmad-method install</code> with the wizard answers — no hidden flags. Review the command, then click Run.
        </p>
      </header>

      <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Command preview</h2>
        <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
{previewLine || command}
        </pre>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Run</h2>
        <button
          type="button"
          onClick={startBootstrap}
          disabled={status === "running"}
          className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {status === "running" ? "Running…" : status === "complete" ? "Re-run" : "Confirm and Run"}
        </button>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Status: <span className="font-mono">{status}</span>
          {exitCode !== null ? ` (exit ${exitCode})` : ""}
        </p>
        {status === "running" || logLines.length > 0 ? (
          <pre className="max-h-72 overflow-y-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-200">
{logLines.join("\n") || "Spawning…"}
          </pre>
        ) : null}
        {status === "complete" ? (
          <button
            type="button"
            onClick={goNext}
            className="w-fit rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
          >
            Continue → post-bootstrap explainer
          </button>
        ) : null}
      </section>
    </main>
  );
}
