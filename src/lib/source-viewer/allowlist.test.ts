import { describe, expect, it } from "vitest";

import {
  __ALLOWLIST_FOR_TESTS,
  isAllowedSourcePath,
} from "./allowlist";

const REPO_ROOT = "/var/home/devbox/repos/bmad_demo";

describe("isAllowedSourcePath", () => {
  describe("allowed paths", () => {
    it.each(__ALLOWLIST_FOR_TESTS.files)(
      "allows the exact-match file %s",
      (file) => {
        const r = isAllowedSourcePath(file, REPO_ROOT);
        expect(r.allowed).toBe(true);
      },
    );

    it("allows files under _bmad/", () => {
      const r = isAllowedSourcePath("_bmad/_config/manifest.yaml", REPO_ROOT);
      expect(r.allowed).toBe(true);
    });

    it("allows files under _bmad-output/", () => {
      const r = isAllowedSourcePath(
        "_bmad-output/planning-artifacts/architecture.md",
        REPO_ROOT,
      );
      expect(r.allowed).toBe(true);
    });

    it("allows files under .claude/skills/", () => {
      const r = isAllowedSourcePath(
        ".claude/skills/bmad-product-brief/SKILL.md",
        REPO_ROOT,
      );
      expect(r.allowed).toBe(true);
    });

    it("returns the resolved absolute path under repoRoot", () => {
      const r = isAllowedSourcePath(
        "_bmad-output/planning-artifacts/prd.md",
        REPO_ROOT,
      );
      if (!r.allowed) throw new Error("expected allowed");
      expect(r.absolutePath).toBe(
        `${REPO_ROOT}/_bmad-output/planning-artifacts/prd.md`,
      );
    });
  });

  describe("blocked paths", () => {
    it("rejects empty path", () => {
      const r = isAllowedSourcePath("", REPO_ROOT);
      expect(r.allowed).toBe(false);
    });

    it("rejects absolute paths", () => {
      const r = isAllowedSourcePath("/etc/passwd", REPO_ROOT);
      expect(r.allowed).toBe(false);
      if (!r.allowed) expect(r.reason).toMatch(/absolute/);
    });

    it("rejects path-traversal segments", () => {
      const r = isAllowedSourcePath("_bmad/../etc/passwd", REPO_ROOT);
      expect(r.allowed).toBe(false);
      if (!r.allowed) expect(r.reason).toMatch(/traversal/);
    });

    it("rejects path-traversal segments via backslash", () => {
      const r = isAllowedSourcePath("_bmad\\..\\etc", REPO_ROOT);
      expect(r.allowed).toBe(false);
    });

    it("rejects paths outside the allowlist", () => {
      const r = isAllowedSourcePath("src/lib/db/connection.ts", REPO_ROOT);
      expect(r.allowed).toBe(false);
      if (!r.allowed) expect(r.reason).toMatch(/allowlist/);
    });

    it("rejects node_modules even though they're under repoRoot", () => {
      const r = isAllowedSourcePath(
        "node_modules/next/package.json",
        REPO_ROOT,
      );
      expect(r.allowed).toBe(false);
    });

    it("rejects .env files even at repo root", () => {
      const r = isAllowedSourcePath(".env", REPO_ROOT);
      expect(r.allowed).toBe(false);
    });

    it("rejects unknown root directories", () => {
      const r = isAllowedSourcePath("etc/passwd", REPO_ROOT);
      expect(r.allowed).toBe(false);
    });

    it("rejects partial-prefix matches that don't actually fall under an allowed root", () => {
      // ".claude" alone is NOT allowed; ".claude/skills/" IS.
      const r = isAllowedSourcePath(".claude/settings.json", REPO_ROOT);
      expect(r.allowed).toBe(false);
    });
  });
});
