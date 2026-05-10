import { expect, test } from "@playwright/test";

test.describe("lesson route (Story 2.2)", () => {
  test("lesson 1: position 1 of 7, no Previous, Next points to lesson 1.5", async ({ page }) => {
    const response = await page.goto("/lessons/1-what-is-bmad");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("What is BMAD");

    // LessonNav <ol> aria-label is "Lesson N of 7" after the 1.5 insert.
    await expect(page.getByLabel(/Lesson 1 of 7/i).first()).toBeVisible();

    // No Previous affordance → instead the "Start of curriculum" sentinel
    await expect(page.getByText("Start of curriculum").first()).toBeVisible();

    // Next link present, points to lesson 1.5 (the BMAD-ecosystem insert).
    const next = page.getByLabel("Next: Lesson 1.5 — The BMAD ecosystem and installer").first();
    await expect(next).toBeVisible();
    await expect(next).toHaveAttribute("href", "/lessons/1-5-the-bmad-ecosystem");
  });

  test("lesson 3: position 4 of 7, Previous → 2, Next → 4", async ({ page }) => {
    // Note: lesson 3's POSITION shifted from 3-of-6 → 4-of-7 when 1.5
    // landed; its filename slug + content stayed the same.
    const response = await page.goto("/lessons/3-stories-as-tool-agnostic-contract");
    expect(response?.status()).toBe(200);

    await expect(page.getByLabel(/Lesson 4 of 7/i).first()).toBeVisible();

    const prev = page.getByLabel("Previous: Lesson 2 — The artifact chain").first();
    await expect(prev).toBeVisible();
    await expect(prev).toHaveAttribute("href", "/lessons/2-the-artifact-chain");

    const next = page.getByLabel("Next: Lesson 4 — CODEOWNERS and the gate").first();
    await expect(next).toBeVisible();
    await expect(next).toHaveAttribute("href", "/lessons/4-codeowners-and-the-gate");
  });

  test("lesson 6: position 7 of 7, Previous → 5, Next hidden (capstone not yet present)", async ({
    page,
  }) => {
    const response = await page.goto("/lessons/6-from-lessons-to-capstone");
    expect(response?.status()).toBe(200);

    await expect(page.getByLabel(/Lesson 7 of 7/i).first()).toBeVisible();

    const prev = page.getByLabel("Previous: Lesson 5 — Working as a team").first();
    await expect(prev).toBeVisible();

    // Next is hidden → "End of curriculum" sentinel shown instead
    await expect(page.getByText("End of curriculum").first()).toBeVisible();
    // Negative assertion: no Next: link of any kind on lesson 6
    await expect(page.getByLabel(/^Next: /)).toHaveCount(0);
  });

  test("lesson 1.5: positioned between 1 and 2", async ({ page }) => {
    const response = await page.goto("/lessons/1-5-the-bmad-ecosystem");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "The BMAD ecosystem and installer",
    );
    await expect(page.getByLabel(/Lesson 2 of 7/i).first()).toBeVisible();

    const prev = page.getByLabel("Previous: Lesson 1 — What is BMAD").first();
    await expect(prev).toHaveAttribute("href", "/lessons/1-what-is-bmad");

    const next = page.getByLabel("Next: Lesson 2 — The artifact chain").first();
    await expect(next).toHaveAttribute("href", "/lessons/2-the-artifact-chain");
  });

  test("keyboard tab order: header → header-capstone → top-Prev → first nav pill", async ({ page }) => {
    await page.goto("/lessons/3-stories-as-tool-agnostic-contract");

    // Focus the document body so Tab starts from the document beginning.
    await page.evaluate(() => document.body.focus());

    const focusedHref = async () =>
      page.evaluate(() => {
        const el = document.activeElement;
        if (el && el.tagName === "A") return (el as HTMLAnchorElement).getAttribute("href");
        return null;
      });

    // First tab → site header home link
    await page.keyboard.press("Tab");
    expect(await focusedHref()).toBe("/");

    // Second tab → site header Capstone link (added in Story 4.3 for /capstone walkability).
    await page.keyboard.press("Tab");
    expect(await focusedHref()).toBe("/capstone");

    // Third tab → top Previous link
    await page.keyboard.press("Tab");
    expect(await focusedHref()).toBe("/lessons/2-the-artifact-chain");

    // Fourth tab → first numbered pill in the LessonNav <ol> (lesson 1).
    // The pill row inserts six focusable links between Previous and Next.
    await page.keyboard.press("Tab");
    expect(await focusedHref()).toBe("/lessons/1-what-is-bmad");
  });

  test("unknown slug renders the global not-found page", async ({ page }) => {
    const response = await page.goto("/lessons/this-slug-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
  });
});
