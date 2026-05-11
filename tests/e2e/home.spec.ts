import { expect, test } from "@playwright/test";

test.describe("home page (Story 1.2)", () => {
  test("renders the hero headline and three audience cards", async ({ page }) => {
    await page.goto("/");

    // Post-Epic-11 hero: "Adopt BMAD as a team — without the guesswork."
    // The exact wording is curriculum content; assert containment of the
    // load-bearing brand phrase rather than the literal headline.
    await expect(page.locator("h1")).toContainText(/BMAD/);

    // Audience cards' aria-labels were tightened to "<Title> (<time>)"
    // (audience type lives on a separate badge); match by title only so
    // the assertion stays robust against future copy edits.
    const trainee = page.getByRole("link", { name: /^Start Here/ });
    const stakeholder = page.getByRole("link", { name: /^15-minute Demo/ });
    const facilitator = page.getByRole("link", { name: /^Workshop Guide/ });

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
      page.getByLabel("Start Here (~3 hours · self-paced)"),
    ).toBeVisible();
    await expect(
      page.getByLabel("15-minute Demo (15 minutes)"),
    ).toBeVisible();
    await expect(
      page.getByLabel("Workshop Guide (~30 min prep · half-day delivery)"),
    ).toBeVisible();
  });

  test("clicking the trainee card client-routes to /start-here", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /^Start Here/ }).click();
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
      h1: "Stakeholder demo",
      title: "Stakeholder demo · BMAD Demo",
    },
    {
      path: "/facilitator",
      h1: "Facilitator — Workshop Guide",
      title: "Facilitator — Workshop Guide · BMAD Demo",
    },
  ]) {
    test(`${path} renders with the expected h1 and title`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.locator("h1")).toContainText(h1);
    });
  }
});
