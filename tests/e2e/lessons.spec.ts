import { expect, test } from "@playwright/test";

test.describe("lesson route (Story 2.2)", () => {
  test("lesson 1: position 1 of 7, no Previous, Next points to lesson 2", async ({ page }) => {
    const response = await page.goto("/lessons/1-what-is-bmad");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("What is BMAD");

    await expect(page.getByLabel(/Lesson 1 of 7/i).first()).toBeVisible();

    await expect(page.getByText("Start of curriculum").first()).toBeVisible();

    const next = page.getByLabel("Next: Lesson 2 — The artifact chain").first();
    await expect(next).toBeVisible();
    await expect(next).toHaveAttribute("href", "/lessons/2-the-artifact-chain");
  });

  test("lesson 3: position 3 of 7, Previous → 2, Next → 4", async ({ page }) => {
    const response = await page.goto("/lessons/3-stories-as-tool-agnostic-contract");
    expect(response?.status()).toBe(200);

    await expect(page.getByLabel(/Lesson 3 of 7/i).first()).toBeVisible();

    const prev = page.getByLabel("Previous: Lesson 2 — The artifact chain").first();
    await expect(prev).toBeVisible();
    await expect(prev).toHaveAttribute("href", "/lessons/2-the-artifact-chain");

    const next = page.getByLabel("Next: Lesson 4 — CODEOWNERS, CONTRIBUTING.md, and the gate").first();
    await expect(next).toBeVisible();
    await expect(next).toHaveAttribute("href", "/lessons/4-codeowners-and-the-gate");
  });

  test("lesson 7: position 7 of 7, Previous → 6, Next hidden (capstone not yet present)", async ({
    page,
  }) => {
    const response = await page.goto("/lessons/7-from-lessons-to-capstone");
    expect(response?.status()).toBe(200);

    await expect(page.getByLabel(/Lesson 7 of 7/i).first()).toBeVisible();

    const prev = page
      .getByLabel("Previous: Lesson 6 — The BMAD ecosystem and installer")
      .first();
    await expect(prev).toBeVisible();

    await expect(page.getByText("End of curriculum").first()).toBeVisible();
    await expect(page.getByLabel(/^Next: /)).toHaveCount(0);
  });

  test("lesson 6 (the BMAD ecosystem) sits between 5 and 7", async ({ page }) => {
    const response = await page.goto("/lessons/6-the-bmad-ecosystem-and-installer");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "The BMAD ecosystem and installer",
    );
    await expect(page.getByLabel(/Lesson 6 of 7/i).first()).toBeVisible();

    const prev = page.getByLabel("Previous: Lesson 5 — Working as a team").first();
    await expect(prev).toHaveAttribute("href", "/lessons/5-working-as-a-team");

    const next = page
      .getByLabel("Next: Lesson 7 — From lessons to capstone")
      .first();
    await expect(next).toHaveAttribute("href", "/lessons/7-from-lessons-to-capstone");
  });

  test("keyboard tab order: header brand → audience-entries → capstone → theme-toggle → top-Prev → first nav pill", async ({ page }) => {
    await page.goto("/lessons/3-stories-as-tool-agnostic-contract");

    // Focus the document body so Tab starts from the document beginning.
    await page.evaluate(() => document.body.focus());

    const focusedDescriptor = async () =>
      page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        if (el.tagName === "A") {
          return {
            kind: "link",
            href: (el as HTMLAnchorElement).getAttribute("href"),
          };
        }
        if (el.tagName === "BUTTON") {
          return {
            kind: "button",
            label: el.getAttribute("aria-label") ?? el.textContent?.trim(),
          };
        }
        return { kind: el.tagName.toLowerCase() };
      });

    // The site header (post Story 11.1 partial — theme toggle landed)
    // lays out: brand link → 3 audience-entry links → capstone → 3
    // theme-toggle buttons → (then page content starts).
    const expected: (
      | { kind: "link"; href: string }
      | { kind: "button"; label: string }
    )[] = [
      { kind: "link", href: "/" },
      { kind: "link", href: "/start-here" },
      { kind: "link", href: "/stakeholder" },
      { kind: "link", href: "/facilitator" },
      { kind: "link", href: "/capstone" },
      { kind: "button", label: "Theme: Light" },
      { kind: "button", label: "Theme: Dark" },
      { kind: "button", label: "Theme: Auto" },
      // Then the lesson page's top Previous link
      { kind: "link", href: "/lessons/2-the-artifact-chain" },
      // Then the first numbered pill in the LessonNav <ol>
      { kind: "link", href: "/lessons/1-what-is-bmad" },
    ];
    for (const want of expected) {
      await page.keyboard.press("Tab");
      const got = await focusedDescriptor();
      expect(got).toMatchObject(want);
    }
  });

  test("unknown slug renders the global not-found page", async ({ page }) => {
    const response = await page.goto("/lessons/this-slug-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
  });
});
