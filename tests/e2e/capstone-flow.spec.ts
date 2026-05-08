import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

const SCHEMA_PATH = path.resolve(process.cwd(), "src", "db", "schema.sql");

const E2E_DB_PATH = path.resolve(process.cwd(), "data", "e2e-progress.sqlite");
// Matches the BMAD_CAPSTONE_DIR set in playwright.config.ts (Story 4.4
// review patch). The dev server reads this env var at module load and
// scopes all capstone writes here; the e2e tests assert against the
// same path so reads see what the dev server wrote.
const CAPSTONE_TEST_DIR = path.resolve(process.cwd(), "data", "e2e-capstone");

function withDb<T>(fn: (db: Database.Database) => T): T {
  const db = new Database(E2E_DB_PATH);
  try {
    // Apply the schema idempotently so the helper works on a fresh DB
    // (parity with capstone-overview.spec.ts; Story 4.4 review patch).
    db.exec(readFileSync(SCHEMA_PATH, "utf8"));
    return fn(db);
  } finally {
    db.close();
  }
}

function deleteAllCapstoneRows() {
  withDb((db) => {
    db.prepare(`DELETE FROM progress WHERE kind = 'capstone-session'`).run();
    db.prepare(`DELETE FROM progress WHERE kind = 'capstone-step'`).run();
  });
}

function insertActiveSession(id: string) {
  withDb((db) => {
    db.prepare(
      `INSERT OR REPLACE INTO progress (kind, id, completed_at) VALUES ('capstone-session', ?, NULL)`,
    ).run(id);
  });
}

function cleanupSessionDir(sessionId: string) {
  const dir = path.join(CAPSTONE_TEST_DIR, sessionId);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

test.describe("/capstone/[step] per-step page (Story 4.4)", () => {
  // Same DB-shared, single-tree concerns as capstone-overview.spec.ts —
  // run serially to avoid cross-test interference.
  test.describe.configure({ mode: "serial" });

  const TEST_SESSION = "19990101T100000Z";

  test.beforeEach(() => {
    deleteAllCapstoneRows();
    cleanupSessionDir(TEST_SESSION);
  });
  test.afterEach(() => {
    deleteAllCapstoneRows();
    cleanupSessionDir(TEST_SESSION);
  });

  test("invalid step → 404", async ({ page }) => {
    const res = await page.goto("/capstone/foobar");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/Back to home/i)).toBeVisible();
  });

  test("no active session → redirected to /capstone overview", async ({ page }) => {
    // No `?session=` and no recent session in the DB. The redirect target
    // is the overview page; what the overview displays depends on DB
    // state (parallel-file tests may seed sessions), so we assert only
    // the redirect, not the no-session panel.
    await page.goto("/capstone/brief");
    await page.waitForURL(/\/capstone$/);
  });

  test("active session: brief renders with form, save advances to /capstone/epic", async ({
    page,
  }) => {
    insertActiveSession(TEST_SESSION);

    await page.goto(`/capstone/brief?session=${TEST_SESSION}`);
    await expect(page.getByRole("heading", { name: "Product Brief" })).toBeVisible();

    // Story 4.4 review patch: textarea aria-label is now the step title.
    const textarea = page.getByRole("textbox", { name: "Product Brief" });
    await expect(textarea).toBeVisible();
    await textarea.fill("# My Brief\n\nThis is the brief content.");

    const saveBtn = page.getByRole("button", { name: "Save and continue" });
    await expect(saveBtn).toBeVisible();

    // Wait for the artifact-save POST to land before assertion races.
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().endsWith("/api/capstone/save") && res.request().method() === "POST",
    );
    await saveBtn.click();
    const saveRes = await responsePromise;
    expect(saveRes.status()).toBe(200);

    await page.waitForURL(`**/capstone/epic?session=${TEST_SESSION}`);
    await expect(page.getByRole("heading", { name: "Epic Outline" })).toBeVisible();
  });

  test("preloaded content: revisiting a saved step shows the saved content in the textarea", async ({
    page,
  }) => {
    insertActiveSession(TEST_SESSION);

    // First visit: save brief content.
    await page.goto(`/capstone/brief?session=${TEST_SESSION}`);
    const textarea1 = page.getByRole("textbox", { name: "Product Brief" });
    await textarea1.fill("First draft of the brief.");
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().endsWith("/api/capstone/save") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save and continue" }).click();
    await responsePromise;
    await page.waitForURL(`**/capstone/epic?session=${TEST_SESSION}`);

    // Navigate back to brief — the form should preload with the saved text.
    await page.goto(`/capstone/brief?session=${TEST_SESSION}`);
    const textarea2 = page.getByRole("textbox", { name: "Product Brief" });
    await expect(textarea2).toHaveValue("First draft of the brief.");
  });

  test("final-step save fires session-complete POST and redirects to overview's complete branch", async ({
    page,
  }) => {
    insertActiveSession(TEST_SESSION);

    await page.goto(`/capstone/adr?session=${TEST_SESSION}`);
    await expect(page.getByRole("heading", { name: "Architecture Decision Record" })).toBeVisible();

    const textarea = page.getByRole("textbox", { name: "Architecture Decision Record" });
    await textarea.fill("# Decision\n\nWe chose option A.");

    // Final step uses "Save and finish" label (not "Save and continue").
    const saveBtn = page.getByRole("button", { name: "Save and finish" });
    await expect(saveBtn).toBeVisible();

    // Two POSTs fire: artifact save, then session-complete.
    const savePromise = page.waitForResponse(
      (res) =>
        res.url().endsWith("/api/capstone/save") && res.request().method() === "POST",
    );
    const completePromise = page.waitForResponse(
      (res) =>
        res.url().endsWith("/api/progress") &&
        res.request().method() === "POST" &&
        (() => {
          try {
            const body = res.request().postDataJSON() as {
              kind?: string;
              completed?: boolean;
            };
            return body.kind === "capstone-session" && body.completed === true;
          } catch {
            return false;
          }
        })(),
    );
    await saveBtn.click();
    await savePromise;
    await completePromise;

    await page.waitForURL(`**/capstone?session=${TEST_SESSION}`);
    await expect(page.getByRole("heading", { name: /Your last capstone —/ })).toBeVisible();

    // The artifact-path list shows `<dir>/adr.md` (just-saved) and `(not yet saved)` for the others.
    const adrPath = path.join(CAPSTONE_TEST_DIR, TEST_SESSION, "adr.md");
    await expect(page.getByText(adrPath)).toBeVisible();
    // The other 4 steps weren't saved through the UI in this test, so they show "(not yet saved)".
    await expect(page.getByText(/\(not yet saved\)/)).toHaveCount(4);
  });

  test("full happy path: walk all 5 steps brief→epic→story-1→story-2→adr → complete (Story 4.4 review patch)", async ({
    page,
  }) => {
    insertActiveSession(TEST_SESSION);

    const stepFlow: { step: string; heading: string; nextLabel: string }[] = [
      { step: "brief", heading: "Product Brief", nextLabel: "Save and continue" },
      { step: "epic", heading: "Epic Outline", nextLabel: "Save and continue" },
      { step: "story-1", heading: "User Story #1", nextLabel: "Save and continue" },
      { step: "story-2", heading: "User Story #2", nextLabel: "Save and continue" },
      { step: "adr", heading: "Architecture Decision Record", nextLabel: "Save and finish" },
    ];

    await page.goto(`/capstone/brief?session=${TEST_SESSION}`);

    for (let i = 0; i < stepFlow.length; i++) {
      const { step, heading, nextLabel } = stepFlow[i];
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();

      const textarea = page.getByRole("textbox", { name: heading });
      await textarea.fill(`# ${heading}\n\nContent for ${step}.`);

      const savePromise = page.waitForResponse(
        (res) =>
          res.url().endsWith("/api/capstone/save") && res.request().method() === "POST",
      );
      await page.getByRole("button", { name: nextLabel }).click();
      const saveRes = await savePromise;
      expect(saveRes.status()).toBe(200);

      // After the 5th step, expect the final-step session-complete POST + redirect to /capstone.
      if (i === stepFlow.length - 1) {
        await page.waitForURL(`**/capstone?session=${TEST_SESSION}`);
      } else {
        const nextStep = stepFlow[i + 1].step;
        await page.waitForURL(`**/capstone/${nextStep}?session=${TEST_SESSION}`);
      }
    }

    // Story 4.4 review patch: verify all 5 artifact files exist on disk
    // (independent of what the page renders — true filesystem assertion).
    for (const { step } of stepFlow) {
      const filePath = path.join(CAPSTONE_TEST_DIR, TEST_SESSION, `${step}.md`);
      expect(existsSync(filePath), `${filePath} should exist on disk`).toBe(true);
    }

    // Overview's complete branch shows "Your last capstone".
    await expect(page.getByRole("heading", { name: /Your last capstone —/ })).toBeVisible();
  });

  test("resume mid-session: visiting /capstone with brief+epic saved shows 'Continue with story-1' link (Story 4.4 review patch)", async ({
    page,
  }) => {
    // Seed a partial session: row + 2 saved steps via direct DB.
    // (The artifact files don't need to exist on disk for the
    // overview's resume-link logic — that branches purely on
    // `completedStepsForSession`.)
    insertActiveSession(TEST_SESSION);
    withDb((db) => {
      const insert = db.prepare(
        `INSERT OR REPLACE INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`,
      );
      insert.run("capstone-step", `${TEST_SESSION}/brief`, "2026-05-08T10:00:00Z");
      insert.run("capstone-step", `${TEST_SESSION}/epic`, "2026-05-08T10:01:00Z");
    });

    await page.goto("/capstone");
    const continueLink = page.getByRole("link", { name: /Continue with story-1/ });
    await expect(continueLink).toBeVisible();
    await expect(continueLink).toHaveAttribute(
      "href",
      `/capstone/story-1?session=${TEST_SESSION}`,
    );
  });

  test("URL-pinned COMPLETE session redirects to /capstone overview's complete branch (Story 4.4 review patch)", async ({
    page,
  }) => {
    // Seed a complete session.
    withDb((db) => {
      db.prepare(
        `INSERT OR REPLACE INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`,
      ).run("capstone-session", TEST_SESSION, "2026-05-10T10:00:00Z");
    });

    // Per-step page should redirect to /capstone?session=<id>, not render the form.
    await page.goto(`/capstone/brief?session=${TEST_SESSION}`);
    await page.waitForURL(`**/capstone?session=${TEST_SESSION}`);
    await expect(page.getByRole("heading", { name: /Your last capstone —/ })).toBeVisible();
    // Form should NOT be visible (we're on the overview, not the per-step page).
    await expect(page.getByRole("textbox", { name: "Product Brief" })).toHaveCount(0);
  });

  test("save error keeps form mounted with content preserved", async ({ page }) => {
    insertActiveSession(TEST_SESSION);

    // Stub the artifact-save endpoint to return 500 — verifies the form
    // doesn't navigate and doesn't reset the typed content on failure.
    await page.route("**/api/capstone/save", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "Internal error" }),
        });
      }
      return route.continue();
    });

    await page.goto(`/capstone/brief?session=${TEST_SESSION}`);
    const textarea = page.getByRole("textbox", { name: "Product Brief" });
    await textarea.fill("This content should survive a failed save.");
    await page.getByRole("button", { name: "Save and continue" }).click();

    // URL should NOT have advanced to /capstone/epic.
    await expect(page).toHaveURL(`/capstone/brief?session=${TEST_SESSION}`);
    // Content is still in the textarea.
    await expect(textarea).toHaveValue("This content should survive a failed save.");
    // Error message visible.
    await expect(page.getByText(/Couldn.t save/)).toBeVisible();
  });
});
