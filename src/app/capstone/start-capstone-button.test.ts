import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENT_PATH = path.resolve(import.meta.dirname, "start-capstone-button.tsx");
const SOURCE = readFileSync(COMPONENT_PATH, "utf8");

// Source-string smoke per architecture's "no React-component-level tests at
// v1" rule. Mirrors Story 3.3's lesson-complete-button.test.ts.
describe("<StartCapstoneButton> source-string smoke (Story 4.3)", () => {
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

  it("references fetch('/api/progress') and useRouter", () => {
    expect(SOURCE).toMatch(/fetch\(["']\/api\/progress["']/);
    expect(SOURCE).toMatch(/useRouter/);
  });

  it("posts the kind=capstone-session shape with completed:false (start-session)", () => {
    expect(SOURCE).toMatch(/kind:\s*["']capstone-session["']/);
    expect(SOURCE).toMatch(/completed:\s*false/);
  });
});
