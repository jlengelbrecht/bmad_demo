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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
  });
});

test.describe("/stakeholder excludes lesson navigation (AC2)", () => {
  test("does not render a 'Lesson N of M' indicator", async ({ page }) => {
    await page.goto("/stakeholder");
    // LessonNav's signature element. Stakeholders are not on the lesson sequence.
    await expect(page.getByText(/^Lesson \d+ of \d+$/)).toHaveCount(0);
    // Sanity: page rendered.
    await expect(page.locator("h1")).toContainText("Stakeholder — 15-minute Demo");
  });
});
