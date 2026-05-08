import { expect, test } from "@playwright/test";

test.describe("lesson route (Story 2.2)", () => {
  test("lesson 1: position 1 of 6, no Previous, Next points to lesson 2", async ({ page }) => {
    const response = await page.goto("/lessons/1-what-is-bmad");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("What is BMAD");
    await expect(page.getByText(/Lesson 1 of 6/i).first()).toBeVisible();

    // No Previous affordance → instead the "Start of curriculum" sentinel
    await expect(page.getByText("Start of curriculum").first()).toBeVisible();

    // Next link present, points to lesson 2
    const next = page.getByLabel("Next: Lesson 2 — The artifact chain").first();
    await expect(next).toBeVisible();
    await expect(next).toHaveAttribute("href", "/lessons/2-the-artifact-chain");
  });

  test("lesson 3: position 3 of 6, Previous → 2, Next → 4", async ({ page }) => {
    const response = await page.goto("/lessons/3-stories-as-tool-agnostic-contract");
    expect(response?.status()).toBe(200);

    await expect(page.getByText(/Lesson 3 of 6/i).first()).toBeVisible();

    const prev = page.getByLabel("Previous: Lesson 2 — The artifact chain").first();
    await expect(prev).toBeVisible();
    await expect(prev).toHaveAttribute("href", "/lessons/2-the-artifact-chain");

    const next = page.getByLabel("Next: Lesson 4 — CODEOWNERS and the gate").first();
    await expect(next).toBeVisible();
    await expect(next).toHaveAttribute("href", "/lessons/4-codeowners-and-the-gate");
  });

  test("lesson 6: position 6 of 6, Previous → 5, Next hidden (capstone not yet present)", async ({
    page,
  }) => {
    const response = await page.goto("/lessons/6-from-lessons-to-capstone");
    expect(response?.status()).toBe(200);

    await expect(page.getByText(/Lesson 6 of 6/i).first()).toBeVisible();

    const prev = page.getByLabel("Previous: Lesson 5 — Working as a team").first();
    await expect(prev).toBeVisible();

    // Next is hidden → "End of curriculum" sentinel shown instead
    await expect(page.getByText("End of curriculum").first()).toBeVisible();
  });

  test("unknown slug renders the global not-found page", async ({ page }) => {
    const response = await page.goto("/lessons/this-slug-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
  });
});
