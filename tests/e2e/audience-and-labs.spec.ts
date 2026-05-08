import { expect, test } from "@playwright/test";

test.describe("lab route (Story 2.3)", () => {
  test("/labs/solo renders its markdown with HTTP 200", async ({ page }) => {
    const response = await page.goto("/labs/solo");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toContainText("Solo lab");
  });

  test("/labs/sync renders", async ({ page }) => {
    const response = await page.goto("/labs/sync");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toContainText("Full-team sync lab");
  });

  test("/labs/async-story-review renders", async ({ page }) => {
    const response = await page.goto("/labs/async-story-review");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toContainText("Async cross-team story review lab");
  });

  test("unknown lab slug renders the global not-found page", async ({ page }) => {
    const response = await page.goto("/labs/this-slug-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Not found");
  });
});

test.describe("/stakeholder excludes lesson navigation (AC2)", () => {
  test("renders no LessonNav region (structural guard, not text-based)", async ({ page }) => {
    await page.goto("/stakeholder");
    // Structural guard: LessonNav exposes itself via aria-label="Lesson navigation (top|bottom)".
    await expect(page.getByRole("navigation", { name: /Lesson navigation/ })).toHaveCount(0);
    // Belt-and-suspenders: the position indicator's literal label string is also absent.
    await expect(page.getByText(/^Lesson \d+ of \d+$/)).toHaveCount(0);
    // Sanity: page rendered.
    await expect(page.locator("h1")).toContainText("Stakeholder — 15-minute Demo");
  });
});
