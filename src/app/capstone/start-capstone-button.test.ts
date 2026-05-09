import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENT_PATH = path.resolve(import.meta.dirname, "start-capstone-button.tsx");
const SOURCE = readFileSync(COMPONENT_PATH, "utf8");

// Source-string smoke per architecture's "no React-component-level tests at
// v1" rule. Mirrors Story 3.3's lesson-complete-button.test.ts.
//
// Story 10.2: the button is a `next/link` to /capstone/setup (Story 6.1's
// tool-selection page). The setup page itself generates a fresh capstone-
// session id on entry, so the button is purely navigational.
describe("<StartCapstoneButton> source-string smoke (Story 10.2)", () => {
  it("declares the 'use client' directive", () => {
    expect(SOURCE).toMatch(/^["']use client["'];?$/m);
  });

  it("does not import from server-only paths", () => {
    expect(SOURCE).not.toMatch(/from ["']@\/lib\/db\//);
    expect(SOURCE).not.toMatch(/from ["']@\/lib\/capstone\//);
    expect(SOURCE).not.toMatch(/from ["']server-only["']/);
    expect(SOURCE).not.toMatch(/from ["']better-sqlite3["']/);
    expect(SOURCE).not.toMatch(/from ["']node:[a-z]+["']/);
  });

  it("renders a Link to /capstone/setup by default", () => {
    expect(SOURCE).toMatch(/from ["']next\/link["']/);
    expect(SOURCE).toMatch(/\/capstone\/setup\b/);
    expect(SOURCE).not.toMatch(/setup-coming-soon/);
  });

  it("does not create a capstone-session row from the button (that lives in /capstone/setup)", () => {
    expect(SOURCE).not.toMatch(/kind:\s*["']capstone-session["']/);
  });

  it("calls /api/progress to mark the lesson complete when invoked from a lesson page", () => {
    // Lesson 6 (capstone hand-off) passes markCompleteSlug="6-…" so
    // clicking Start the capstone IS the completion signal — no
    // separate Mark-complete button on that lesson.
    expect(SOURCE).toMatch(/markCompleteSlug/);
    expect(SOURCE).toMatch(/fetch\(["']\/api\/progress["']/);
    expect(SOURCE).toMatch(/kind:\s*["']lesson["']/);
  });
});
