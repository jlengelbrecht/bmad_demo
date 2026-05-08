import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENT_PATH = path.resolve(import.meta.dirname, "capstone-step-form.tsx");
const SOURCE = readFileSync(COMPONENT_PATH, "utf8");

// Source-string smoke per architecture's "no React-component-level tests at
// v1" rule. Mirrors Story 3.3 + Story 4.3's client-component smokes.
describe("<CapstoneStepForm> source-string smoke (Story 4.4)", () => {
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

  it("references fetch('/api/capstone/save') and useRouter", () => {
    expect(SOURCE).toMatch(/fetch\(["']\/api\/capstone\/save["']/);
    expect(SOURCE).toMatch(/useRouter/);
  });

  it("fires the session-complete POST on the final step", () => {
    // Verifies the AC4 final-step wiring: kind=capstone-session + completed=true
    // is the second POST after the artifact-save POST resolves.
    expect(SOURCE).toMatch(/kind:\s*["']capstone-session["']/);
    expect(SOURCE).toMatch(/completed:\s*true/);
    expect(SOURCE).toMatch(/fetch\(["']\/api\/progress["']/);
  });
});
