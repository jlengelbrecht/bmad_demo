import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENT_PATH = path.resolve(import.meta.dirname, "start-capstone-button.tsx");
const SOURCE = readFileSync(COMPONENT_PATH, "utf8");

// Source-string smoke per architecture's "no React-component-level tests at
// v1" rule. Mirrors Story 3.3's lesson-complete-button.test.ts.
//
// Story 10.1 interim: the button is a `next/link` to the placeholder page
// while Epics 5-6 build the real setup wizard. The fetch('/api/progress')
// session-create POST returns when Story 10.2 / Epic 6 repoints the button
// at the wizard and the wizard owns session creation.
describe("<StartCapstoneButton> source-string smoke (Story 10.1 interim)", () => {
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

  it("renders a Link to the setup-coming-soon placeholder by default", () => {
    expect(SOURCE).toMatch(/from ["']next\/link["']/);
    expect(SOURCE).toMatch(/\/capstone\/setup-coming-soon/);
  });

  it("does not call /api/progress (session creation moves to the wizard)", () => {
    expect(SOURCE).not.toMatch(/fetch\(["']\/api\/progress["']/);
    expect(SOURCE).not.toMatch(/kind:\s*["']capstone-session["']/);
  });
});
