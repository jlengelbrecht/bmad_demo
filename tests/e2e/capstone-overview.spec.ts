import { readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

// Direct DB access for state seeding/cleanup. The e2e SQLite is isolated
// via BMAD_DATABASE_PATH in playwright.config.ts. Path resolved relative
// to repo root so the test process and the dev server agree on the file.
const E2E_DB_PATH = path.resolve(process.cwd(), "data", "e2e-progress.sqlite");
const SCHEMA_PATH = path.resolve(process.cwd(), "src", "db", "schema.sql");

function withDb<T>(fn: (db: Database.Database) => T): T {
  const db = new Database(E2E_DB_PATH);
  try {
    // Apply the schema idempotently in case the test runs before the dev
    // server has touched the DB (first-test-of-the-suite case).
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

function insertCapstoneStep(sessionId: string, step: string, completedAt: string) {
  withDb((db) => {
    db.prepare(
      `INSERT OR REPLACE INTO progress (kind, id, completed_at) VALUES ('capstone-step', ?, ?)`,
    ).run(`${sessionId}/${step}`, completedAt);
  });
}

test.describe("/capstone overview (Story 4.3)", () => {
  // Tests in this describe write to the same e2e SQLite via the seeding
  // helpers. Serial mode prevents cross-test interleaving — other tests'
  // INSERTs landing between this test's `deleteAllCapstoneSessions` and
  // `page.goto` would confuse the no-session and complete-session branches.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    deleteAllCapstoneSessions();
  });
  // Story 4.3 review patch: scrub on test end too so a failed test in this
  // describe doesn't leave rows in the e2e DB for unrelated specs to find.
  test.afterEach(() => {
    deleteAllCapstoneSessions();
  });
  test.afterAll(() => {
    deleteAllCapstoneSessions();
  });

  test("no prior session → 'Start your capstone' panel + start button navigates to /capstone/brief?session=<id>", async ({
    page,
  }) => {
    await page.goto("/capstone");
    await expect(page.getByRole("heading", { name: "Start your capstone" })).toBeVisible();
    // Scope-explainer paragraph is on the page-level header (not in the
    // no-session panel itself). Asserting on the heading + button is
    // sufficient to lock the no-session render.

    const startBtn = page.getByRole("button", { name: "Start your capstone" });
    await expect(startBtn).toBeVisible();

    // The start button POSTs to /api/progress and then navigates. Wait for
    // the response so the navigation isn't a race.
    const responsePromise = page.waitForResponse(
      (res) => res.url().endsWith("/api/progress") && res.request().method() === "POST",
    );
    await startBtn.click();
    await responsePromise;

    await page.waitForURL(/\/capstone\/brief\?session=\d{8}T\d{6}Z$/);
  });

  test("in-progress session → 'Resume your capstone' panel with 'Continue with brief' link", async ({
    page,
  }) => {
    const sessionId = "20260507T143022Z";
    insertCapstoneSession(sessionId, null);

    await page.goto("/capstone");
    await expect(page.getByRole("heading", { name: /Resume your capstone/ })).toBeVisible();

    const continueLink = page.getByRole("link", { name: /Continue with brief/ });
    await expect(continueLink).toBeVisible();
    await expect(continueLink).toHaveAttribute("href", `/capstone/brief?session=${sessionId}`);
  });

  test("in-progress session with brief + epic saved → 'Continue with story-1'", async ({
    page,
  }) => {
    const sessionId = "20260508T120000Z";
    insertCapstoneSession(sessionId, null);
    insertCapstoneStep(sessionId, "brief", "2026-05-08T12:01:00Z");
    insertCapstoneStep(sessionId, "epic", "2026-05-08T12:02:00Z");

    await page.goto("/capstone");
    const continueLink = page.getByRole("link", { name: /Continue with story-1/ });
    await expect(continueLink).toBeVisible();
    await expect(continueLink).toHaveAttribute("href", `/capstone/story-1?session=${sessionId}`);
  });

  test("complete session → 'Your last capstone' panel + path code-block + 'Start a new capstone' button", async ({
    page,
  }) => {
    const sessionId = "20260509T090000Z";
    insertCapstoneSession(sessionId, "2026-05-10T10:00:00Z");
    // Mark all 5 steps complete so the step list shows ✓ for each.
    for (const step of ["brief", "epic", "story-1", "story-2", "adr"]) {
      insertCapstoneStep(sessionId, step, "2026-05-10T09:30:00Z");
    }

    await page.goto("/capstone");
    await expect(page.getByRole("heading", { name: /Your last capstone — 2026-05-10/ })).toBeVisible();
    // AC4: the on-disk path must be visible on the complete branch so the
    // trainee knows where to find their artifacts. (Story 4.3 review patch.)
    // exact:true so we don't match the per-file paths in the artifact list
    // added by Story 4.4 (each contains the dir as a substring).
    await expect(
      page.getByText(`_bmad-output/capstone/${sessionId}/`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Start a new capstone" })).toBeVisible();
    // All 5 steps should show as completed in the step list.
    for (const step of ["brief", "epic", "story-1", "story-2", "adr"]) {
      await expect(
        page.getByRole("listitem", { name: new RegExp(`${step}, completed`) }),
      ).toBeVisible();
    }
    // No "Continue with..." link on a complete session.
    await expect(page.getByRole("link", { name: /Continue with/ })).toHaveCount(0);
  });

  test("?session=<id> overrides getRecentCapstoneSession (URL pin priority)", async ({ page }) => {
    // Two sessions in the DB: an OLDER one (queried via URL) and a NEWER one
    // (which would be `getRecentCapstoneSession`'s pick if no URL param). The
    // page must render the URL-pinned older session, not the newer one.
    const olderSessionId = "20260101T000000Z";
    const newerSessionId = "20260601T000000Z";
    insertCapstoneSession(olderSessionId, null);
    insertCapstoneSession(newerSessionId, null);

    await page.goto(`/capstone?session=${olderSessionId}`);
    // Visible session id is the older one — proves URL override won.
    // exact: true so we don't match the path code-block which also contains
    // the session id as a substring.
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
    // exact: true so we match only the header's "Capstone" link, not any
    // lesson-content links whose accessible name happens to contain
    // "Capstone" (e.g., a phrase like "the capstone harness").
    const capstoneLink = page.getByRole("link", { name: "Capstone", exact: true });
    await expect(capstoneLink).toBeVisible();
    await capstoneLink.click();
    await page.waitForURL(/\/capstone$/);
  });
});
