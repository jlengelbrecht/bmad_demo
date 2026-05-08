# Deferred Work

## Deferred from: code review of 1-1-scaffold-nextjs-app (2026-05-07)

- **Default home page boilerplate** (`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` Geist-vs-Arial mismatch, `metadata.title = "Create Next App"`) — Story 1.2 replaces the home page with three audience-entry cards.
- **AGENTS.md placeholder content** (refs `node_modules/next/dist/docs/` which doesn't ship in npm package) — Epic 6 customizes AGENTS.md per AC7.
- **tsconfig + eslint exclude/ignore for `_bmad/`, `_bmad-output/`, `training/`** — preventive; address when curriculum content lands in Epic 6.
- **`.gitignore` glob `_bmad-output/capstone/[0-9]*/` brittleness** — works for UTC-timestamp session ids per architecture; re-validate when Capstone harness lands in Epic 4.
- **`next/font/google` build-time fetch vs NFR-S1** — `next/font` self-hosts at runtime so NFR-S1 holds; verify in Epic 5 no-egress E2E test.
- **Port 3000 hardcoded in AC2 smoke** — `next dev` auto-fallback to 3001+ would silently skip the smoke; address in Epic 5 CI tests.
- **`next-env.d.ts` references types generated only after first `next dev`/`next build`** — affects clean-clone `tsc --noEmit` in CI; resolve in Epic 5 by running `next build` once before typecheck.
