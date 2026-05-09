# `src/lib/capstone/preflight/`

Phase 0 environment checks — node / git / npx — that gate the rebuilt
capstone before tool selection loads. See PRD §FR-3.3.

`runPreflightChecks()` returns `{ checks, allGreen }` with one row per
probe; the Route Handler at `src/app/api/capstone/setup/preflight/route.ts`
is a thin wrapper that adds the JSON envelope. Probes run in parallel.
