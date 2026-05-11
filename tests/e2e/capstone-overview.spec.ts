import { readFileSync } from "node:fs";
import path from "node:path";

import { DatabaseSync } from "node:sqlite";
import { expect, test } from "@playwright/test";

// Direct DB access for state seeding/cleanup. The e2e SQLite is isolated
// via BMAD_DATABASE_PATH in playwright.config.ts. Path resolved relative
// to repo root so the test process and the dev server agree on the file.
const E2E_DB_PATH = path.resolve(process.cwd(), "data", "e2e-progress.sqlite");
const SCHEMA_PATH = path.resolve(process.cwd(), "src", "db", "schema.sql");

function withDb<T>(fn: (db: Database.Database) => T): T {
  const db = new DatabaseSync(E2E_DB_PATH);
  try {
    db.exec(readFileSync(SCHEMA_PATH, "utf8"));
    return fn(db);
  } finally {
    db.close();
  }
}

function deleteAllCapstoneSessions() {
  withDb((db) => {
    db.prepare(`DELETE FROM progress WHERE kind = 'capstone-session'`).run();
    db.prepare(`DELETE FROM progress WHERE kind = 'capstone-step'`).run();
  });
}

function insertCapstoneSession(id: string, completedAt: string | null) {
  withDb((db) => {
    db.prepare(
      `INSERT OR REPLACE INTO progress (kind, id, completed_at) VALUES ('capstone-session', ?, ?)`,
    ).run(id, completedAt);
  });
}

// Story 10.2: the textarea-form per-step routes are gone; the
// StartCapstoneButton now links to /capstone/setup (Epic 6's tool-
// selection page).
test.describe("/capstone overview (Story 10.2)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    deleteAllCapstoneSessions();
  });
  test.afterEach(() => {
    deleteAllCapstoneSessions();
  });
  test.afterAll(() => {
    deleteAllCapstoneSessions();
  });

  test("no prior session → 'Ready to start?' panel + button links to /capstone/setup", async ({
    page,
  }) => {
    await page.goto("/capstone");
    await expect(page.getByRole("heading", { name: "Ready to start?" })).toBeVisible();

    const startLink = page.getByRole("link", { name: "Start the capstone" });
    await expect(startLink).toBeVisible();
    await expect(startLink).toHaveAttribute("href", "/capstone/setup");
  });

  test("in-progress session → 'Prior capstone session' panel with start-the-capstone link", async ({
    page,
  }) => {
    const sessionId = "20260507T143022Z";
    insertCapstoneSession(sessionId, null);

    await page.goto("/capstone");
    await expect(page.getByRole("heading", { name: /Prior capstone session/ })).toBeVisible();
    await expect(page.getByText(sessionId, { exact: true })).toBeVisible();

    const startLink = page.getByRole("link", { name: "Start the capstone" });
    await expect(startLink).toBeVisible();
    await expect(startLink).toHaveAttribute("href", "/capstone/setup");
  });

  test("complete session → 'Your last capstone' panel + 'Start a new capstone' link", async ({
    page,
  }) => {
    const sessionId = "20260509T090000Z";
    insertCapstoneSession(sessionId, "2026-05-10T10:00:00Z");

    await page.goto("/capstone");
    await expect(
      page.getByRole("heading", { name: /Your last capstone — 2026-05-10/ }),
    ).toBeVisible();

    const startNewLink = page.getByRole("link", { name: "Start a new capstone" });
    await expect(startNewLink).toBeVisible();
    await expect(startNewLink).toHaveAttribute("href", "/capstone/setup");
  });

  test("?session=<id> overrides getRecentCapstoneSession (URL pin priority)", async ({ page }) => {
    const olderSessionId = "20260101T000000Z";
    const newerSessionId = "20260601T000000Z";
    insertCapstoneSession(olderSessionId, null);
    insertCapstoneSession(newerSessionId, null);

    await page.goto(`/capstone?session=${olderSessionId}`);
    await expect(page.getByText(olderSessionId, { exact: true })).toBeVisible();
    await expect(page.getByText(newerSessionId, { exact: true })).toHaveCount(0);
  });

  test("?session=<unknown-but-well-formed> → 404 (historical session not in DB)", async ({
    page,
  }) => {
    const res = await page.goto("/capstone?session=20990101T000000Z");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/Back to home/i)).toBeVisible();
  });

  test("?session=<malformed> → 404 (regex gate before DB lookup)", async ({ page }) => {
    const res = await page.goto("/capstone?session=not-a-timestamp");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/Back to home/i)).toBeVisible();
  });

  test("Capstone link in site header reaches /capstone from anywhere", async ({ page }) => {
    await page.goto("/lessons/1-what-is-bmad");
    const capstoneLink = page.getByRole("link", { name: "Capstone", exact: true });
    await expect(capstoneLink).toBeVisible();
    await capstoneLink.click();
    await page.waitForURL(/\/capstone$/);
  });
});
