// Source-string smoke verifying the client component honors AC6:
// it does NOT import from `src/lib/db/*`, and it carries the `"use client"`
// directive at the top. Component behavior is exercised end-to-end via
// Playwright in `tests/e2e/mark-complete.spec.ts` (architecture decision:
// no React-component-level Vitest tests at v1).

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENT_PATH = path.resolve(import.meta.dirname, "lesson-complete-button.tsx");
const source = readFileSync(COMPONENT_PATH, "utf8");

describe("LessonCompleteButton — source-string contract", () => {
  it("declares the 'use client' directive at the top", () => {
    expect(source).toMatch(/^["']use client["'];?\s*$/m);
  });

  it("does not import from @/lib/db/*", () => {
    expect(source).not.toMatch(/from\s+["']@\/lib\/db/);
  });

  it("does not import server-only code that shouldn't ship to the client", () => {
    expect(source).not.toContain('"server-only"');
    expect(source).not.toContain("better-sqlite3");
    expect(source).not.toMatch(/from\s+["']node:/);
  });

  it("uses fetch for the network call (not a server-side helper)", () => {
    expect(source).toContain("fetch(");
    expect(source).toContain("/api/progress");
  });
});
