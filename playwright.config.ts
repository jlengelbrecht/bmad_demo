import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // Story 4.4: workers pinned to 1 because the capstone e2e specs share
  // the same SQLite (`BMAD_DATABASE_PATH=./data/e2e-progress.sqlite`)
  // AND the same on-disk artifact tree (`_bmad-output/capstone/`). Cross-
  // file `fullyParallel: true` lets a beforeEach/afterEach in one spec
  // delete rows another spec just inserted. The whole suite runs in
  // ~6 seconds at workers=1 — the speed loss is acceptable for
  // determinism. When the e2e DB-isolation seam grows (per-worker DB,
  // per-worker capstone dir) workers can climb back.
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
      // Story 4.4: isolate capstone artifact writes the same way.
      // `paths.ts` honors this env var (see Story 4.2) but tests can't
      // rely on it unless it's set BEFORE the dev server starts.
      BMAD_CAPSTONE_DIR: "./data/e2e-capstone",
    },
  },
});
