import { expect, test } from "@playwright/test";

test.describe("home page (Story 1.2)", () => {
  test("renders the BMAD Demo heading and three audience cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toHaveText("BMAD Demo");

    const trainee = page.getByRole("link", { name: /Trainee — Start Here/ });
    const stakeholder = page.getByRole("link", { name: /Stakeholder — 15-minute Demo/ });
    const facilitator = page.getByRole("link", { name: /Facilitator — Workshop Guide/ });

    await expect(trainee).toBeVisible();
    await expect(stakeholder).toBeVisible();
    await expect(facilitator).toBeVisible();

    await expect(trainee).toHaveAttribute("href", "/start-here");
    await expect(stakeholder).toHaveAttribute("href", "/stakeholder");
    await expect(facilitator).toHaveAttribute("href", "/facilitator");
  });

  test("each audience card carries a composite aria-label with the time investment", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByLabel("Trainee — Start Here (~3 hours · self-paced)")
    ).toBeVisible();
    await expect(page.getByLabel("Stakeholder — 15-minute Demo (15 minutes)")).toBeVisible();
    await expect(
      page.getByLabel("Facilitator — Workshop Guide (~30 min prep · half-day delivery)")
    ).toBeVisible();
  });

  test("clicking the trainee card client-routes to /start-here", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Trainee — Start Here/ }).click();
    await expect(page).toHaveURL("/start-here");
    // Markdown rendering prepends a `#` anchor link inside the heading; assert containment.
    await expect(page.locator("h1")).toContainText("Trainee — Start Here");
  });
});

test.describe("audience-entry routes (Story 2.3)", () => {
  for (const { path, h1, title } of [
    {
      path: "/start-here",
      h1: "Trainee — Start Here",
      title: "Trainee — Start Here · BMAD Demo",
    },
    {
      path: "/stakeholder",
      h1: "Stakeholder — 15-minute Demo",
      title: "Stakeholder — 15-minute Demo · BMAD Demo",
    },
    {
      path: "/facilitator",
      h1: "Facilitator — Workshop Guide",
      title: "Facilitator — Workshop Guide · BMAD Demo",
    },
  ]) {
    test(`${path} renders its markdown via <Markdown> with the expected h1 and title`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.locator("h1")).toContainText(h1);
    });
  }
});
