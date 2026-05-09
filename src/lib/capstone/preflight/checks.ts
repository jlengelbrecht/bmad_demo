import { tmpdir } from "node:os";

import { runStreaming } from "../subprocess/run-streaming";
import { meetsMinimum } from "./semver";

const PROBE_TIMEOUT_MS = 5_000;

export type PreflightStatus = "green" | "red";

export interface PreflightCheck {
  name: "node" | "git" | "npx";
  status: PreflightStatus;
  requiredVersion: string;
  actualVersion?: string;
  hint?: string;
}

export interface PreflightResult {
  checks: PreflightCheck[];
  allGreen: boolean;
}

interface ProbeSpec {
  name: PreflightCheck["name"];
  cmd: string;
  args: string[];
  required: string;
  /** Regex returning a 3-capture-group version match (X.Y.Z). */
  versionRe: RegExp;
  /** Hint text used on red rows; prefixed dynamically with the actual-vs-required summary. */
  installHint: string;
}

const PROBES: ProbeSpec[] = [
  {
    name: "node",
    cmd: "node",
    args: ["--version"],
    required: ">=20.0.0",
    versionRe: /v?(\d+)\.(\d+)\.(\d+)/,
    installHint:
      "Node 20+ is required. Install from https://nodejs.org/ or via your version manager (nvm, asdf, fnm).",
  },
  {
    name: "git",
    cmd: "git",
    args: ["--version"],
    required: ">=2.30.0",
    versionRe: /git\s+version\s+(\d+)\.(\d+)\.(\d+)/i,
    installHint:
      "Git 2.30+ is required. Install from https://git-scm.com/ or via your package manager.",
  },
  {
    name: "npx",
    cmd: "npx",
    args: ["--version"],
    required: ">=10.0.0",
    versionRe: /(\d+)\.(\d+)\.(\d+)/,
    installHint:
      "npx 10+ is required (npm 10+ ships it). Install from https://nodejs.org/ — npx comes with npm.",
  },
];

async function runProbe(spec: ProbeSpec): Promise<PreflightCheck> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  let actual: string | null = null;
  let exitCode: number | null = null;
  let timedOut = false;
  try {
    for await (const ev of runStreaming({
      cmd: spec.cmd,
      args: spec.args,
      cwd: tmpdir(),
      signal: ctrl.signal,
    })) {
      if (ev.kind === "stdout-line" && actual === null) {
        const m = spec.versionRe.exec(ev.text);
        if (m) actual = `${m[1]}.${m[2]}.${m[3]}`;
      } else if (ev.kind === "exit") {
        exitCode = ev.code;
        if (ev.signal === "SIGTERM" || ev.signal === "SIGKILL") timedOut = true;
      }
    }
  } catch {
    return {
      name: spec.name,
      status: "red",
      requiredVersion: spec.required,
      hint: spec.installHint,
    };
  } finally {
    clearTimeout(timer);
  }

  if (timedOut) {
    return {
      name: spec.name,
      status: "red",
      requiredVersion: spec.required,
      hint: `${spec.installHint} (probe timed out — is the binary responsive?)`,
    };
  }
  if (exitCode !== 0) {
    return {
      name: spec.name,
      status: "red",
      requiredVersion: spec.required,
      hint: `${spec.installHint} (unexpected exit code — try running \`${spec.cmd} ${spec.args.join(" ")}\` in your terminal)`,
    };
  }
  if (!actual) {
    return {
      name: spec.name,
      status: "red",
      requiredVersion: spec.required,
      hint: spec.installHint,
    };
  }
  if (!meetsMinimum(actual, spec.required)) {
    return {
      name: spec.name,
      status: "red",
      requiredVersion: spec.required,
      actualVersion: actual,
      hint: `${spec.cmd} ${actual} found; required: ${spec.required}. ${spec.installHint}`,
    };
  }
  return {
    name: spec.name,
    status: "green",
    requiredVersion: spec.required,
    actualVersion: actual,
  };
}

export async function runPreflightChecks(): Promise<PreflightResult> {
  const checks = await Promise.all(PROBES.map(runProbe));
  return {
    checks,
    allGreen: checks.every((c) => c.status === "green"),
  };
}
