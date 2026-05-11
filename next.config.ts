import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/**
 * Repo root resolved from this config file's own location, so Turbopack
 * doesn't guess the workspace root by walking up looking for a
 * `package-lock.json`. The default behavior bit a Mac trainee whose
 * home directory had a stray `~/package-lock.json` from an earlier
 * `npm install` — Turbopack picked the home dir as root and every
 * route 404'd. Pinning here means the lockfile-walk heuristic never
 * runs.
 */
const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: REPO_ROOT,
  },
};

export default nextConfig;
