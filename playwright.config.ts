import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // Workers pinned to 1 because the capstone e2e specs share the same
  // SQLite (`BMAD_DATABASE_PATH=./data/e2e-progress.sqlite`). Cross-file
  // `fullyParallel: true` would let a beforeEach/afterEach in one spec
  // delete rows another spec just inserted. When the e2e DB-isolation
  // seam grows (per-worker DB) workers can climb back.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Isolate the e2e SQLite from the dev portal's progress so
      // mark-complete tests don't pollute real trainee state.
      BMAD_DATABASE_PATH: "./data/e2e-progress.sqlite",
      // Substitute the real `npx bmad-method install` with a
      // deterministic prompt+exit fixture. Used by the
      // capstone-bootstrap-pty.spec.ts e2e to drive the PTY round-trip
      // without invoking real npm I/O. Resolved absolute so the dev
      // server can spawn it regardless of cwd.
      CAPSTONE_PTY_FIXTURE_SCRIPT: `${process.cwd()}/tests/fixtures/pty-fake-bmad-install.mjs`,
      // Substitute the real per-tool AI CLI (claude / codex / copilot)
      // with a banner-and-exit fixture. Used by the
      // capstone-chat-phase-pty.spec.ts e2e to verify the chat-phase
      // PTY spawn route routes the right inputs without invoking real
      // LLM CLIs (which would consume credits and need real auth).
      CAPSTONE_CHAT_PTY_FIXTURE_SCRIPT: `${process.cwd()}/tests/fixtures/pty-fake-chat-phase.mjs`,
    },
  },
});
