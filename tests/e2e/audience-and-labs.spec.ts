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

test.describe("/stakeholder — guided tour", () => {
  test("renders the tour shell + first panel + tour-nav controls", async ({ page }) => {
    await page.goto("/stakeholder");
    // No lesson-nav chrome — tour is its own surface.
    await expect(page.getByRole("navigation", { name: /Lesson navigation/ })).toHaveCount(0);
    await expect(page.getByText(/^Lesson \d+ of \d+$/)).toHaveCount(0);
    // Page heading + first-panel content.
    await expect(page.locator("h1")).toContainText("Stakeholder demo");
    await expect(page.getByText(/01 \/ The problem/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /AI-generated code is shipping/ }),
    ).toBeVisible();
    // Tour-nav controls.
    await expect(page.getByRole("button", { name: /← Previous/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Next →/ })).toBeEnabled();
    await expect(page.getByRole("navigation", { name: /Tour navigation/ })).toBeVisible();
  });

  test("Next advances panels; End key jumps to last panel; CTA visible on the final panel", async ({ page }) => {
    await page.goto("/stakeholder");
    const next = page.getByRole("button", { name: /Next →/ });
    const prev = page.getByRole("button", { name: /← Previous/ });
    await next.click();
    await expect(page.getByText(/02 \/ The contract/i)).toBeVisible();
    await expect(prev).toBeEnabled();
    await page.keyboard.press("End");
    await expect(page.getByText(/06 \/ Adoption/i)).toBeVisible();
    await expect(next).toBeDisabled();
    await expect(page.getByRole("link", { name: /Open the capstone/ })).toBeVisible();
  });

  test("governance panel deep-links point at real /source/ paths in this repo", async ({ page }) => {
    await page.goto("/stakeholder");
    await page.keyboard.press("4");
    const codeownersLink = page.getByRole("link", { name: /\.github\/CODEOWNERS/ });
    await expect(codeownersLink).toBeVisible();
    await expect(codeownersLink).toHaveAttribute(
      "href",
      "/source/.github/CODEOWNERS",
    );
    const contributingLink = page.getByRole("link", { name: /CONTRIBUTING\.md/ });
    await expect(contributingLink).toBeVisible();
    await expect(contributingLink).toHaveAttribute(
      "href",
      "/source/CONTRIBUTING.md",
    );
  });
});
