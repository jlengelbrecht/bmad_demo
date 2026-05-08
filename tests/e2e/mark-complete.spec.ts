import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// These tests interact with the e2e SQLite isolated via BMAD_DATABASE_PATH
// in playwright.config.ts. Each test cleans up its own state (toggles back
// to the baseline at the end) so the e2e DB stays predictable across runs.

/**
 * Click a mark-complete button and wait for THIS click's `/api/progress`
 * POST response to land. The body match (`kind` + `id`) avoids resolving on
 * a stray POST from an unrelated test or a future feature that also writes
 * progress in the same browser context.
 */
async function clickAndWaitForPersist(
  page: Page,
  button: ReturnType<Page["getByRole"]>,
  expected: { kind: string; id: string },
) {
  const responsePromise = page.waitForResponse((res) => {
    if (!res.url().endsWith("/api/progress")) return false;
    if (res.request().method() !== "POST") return false;
    let body: { kind?: string; id?: string } | null = null;
    try {
      body = res.request().postDataJSON() as { kind?: string; id?: string };
    } catch {
      return false;
    }
    return body?.kind === expected.kind && body?.id === expected.id;
  });
  await button.click();
  const res = await responsePromise;
  expect(res.status()).toBe(200);
}

test.describe("mark-complete (Story 3.3)", () => {
  test("lesson: click toggles button + persists across reload + toggles off", async ({ page }) => {
    const slug = "2-the-artifact-chain";
    await page.goto(`/lessons/${slug}`);

    const markBtn = page.getByRole("button", { name: "Mark complete" });
    await expect(markBtn).toBeVisible();

    // Click → optimistic update + persists.
    await clickAndWaitForPersist(page, markBtn, { kind: "lesson", id: slug });
    const completedBtn = page.getByRole("button", { name: /Completed/ });
    await expect(completedBtn).toBeVisible();
    await expect(completedBtn).toHaveText(/Completed/);

    // Reload — the Server Component reads progress server-side.
    await page.reload();
    await expect(page.getByRole("button", { name: /Completed/ })).toBeVisible();

    // Cleanup: toggle off.
    await clickAndWaitForPersist(
      page,
      page.getByRole("button", { name: /Completed/ }),
      { kind: "lesson", id: slug },
    );
    await expect(page.getByRole("button", { name: "Mark complete" })).toBeVisible();
  });

  test("lab: 'Mark this lab as run' toggles + persists", async ({ page }) => {
    const slug = "solo";
    await page.goto(`/labs/${slug}`);

    const markBtn = page.getByRole("button", { name: "Mark this lab as run" });
    await expect(markBtn).toBeVisible();

    await clickAndWaitForPersist(page, markBtn, { kind: "lab", id: slug });
    await expect(page.getByRole("button", { name: /Lab marked run/ })).toBeVisible();

    // Reload + persistence.
    await page.reload();
    await expect(page.getByRole("button", { name: /Lab marked run/ })).toBeVisible();

    // Cleanup.
    await clickAndWaitForPersist(
      page,
      page.getByRole("button", { name: /Lab marked run/ }),
      { kind: "lab", id: slug },
    );
    await expect(page.getByRole("button", { name: "Mark this lab as run" })).toBeVisible();
  });

  test("LessonNav shows checkmark on completed lesson pills", async ({ page }) => {
    // Mark lesson 1 complete.
    await page.goto("/lessons/1-what-is-bmad");
    await clickAndWaitForPersist(
      page,
      page.getByRole("button", { name: "Mark complete" }),
      { kind: "lesson", id: "1-what-is-bmad" },
    );
    await expect(page.getByRole("button", { name: /Completed/ })).toBeVisible();

    // Navigate to lesson 3; the nav pill for lesson 1 should carry the
    // 'completed' state in its accessible name.
    await page.goto("/lessons/3-stories-as-tool-agnostic-contract");
    const lesson1Pill = page
      .getByRole("link", { name: /Lesson 1 — What is BMAD, completed/ })
      .first();
    await expect(lesson1Pill).toBeVisible();

    // Cleanup: unmark lesson 1.
    await page.goto("/lessons/1-what-is-bmad");
    await clickAndWaitForPersist(
      page,
      page.getByRole("button", { name: /Completed/ }),
      { kind: "lesson", id: "1-what-is-bmad" },
    );
    await expect(page.getByRole("button", { name: "Mark complete" })).toBeVisible();
  });

  test("optimistic revert: stubbed 500 reverts the button + surfaces an error", async ({
    page,
  }) => {
    // Intercept the POST and return a 500 — verifies the optimistic-revert
    // semantics in AC2 without coupling to a real failure mode.
    await page.route("**/api/progress", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "Internal error" }),
        });
      }
      return route.continue();
    });

    await page.goto("/lessons/4-codeowners-and-the-gate");
    const markBtn = page.getByRole("button", { name: "Mark complete" });
    await expect(markBtn).toBeVisible();
    await markBtn.click();

    // Button reverts to the "Mark complete" state…
    await expect(page.getByRole("button", { name: "Mark complete" })).toBeVisible();
    // …and an inline error message surfaces.
    await expect(page.getByText(/Couldn.t save/)).toBeVisible();
  });
});
