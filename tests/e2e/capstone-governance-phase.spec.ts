import {
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test, expect } from "@playwright/test";

const TARGET_DIR = "/tmp/e2e-governance-target";
const DB_PATH = path.resolve("./data/e2e-progress.sqlite");
const PADDING = "x".repeat(500);

function cleanFs() {
  rmSync(TARGET_DIR, { recursive: true, force: true });
  mkdirSync(TARGET_DIR, { recursive: true });
}

function seedSession(sessionId: string, tool: string) {
  const db = new DatabaseSync(DB_PATH);
  const schemaPath = path.resolve("src", "db", "schema.sql");
  db.exec(readFileSync(schemaPath, "utf8"));
  const upsert = db.prepare(
    `INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)
       ON CONFLICT(kind, id) DO UPDATE SET completed_at = excluded.completed_at`,
  );
  upsert.run("capstone-session", sessionId, null);
  upsert.run("capstone-target", sessionId, TARGET_DIR);
  upsert.run("capstone-tool", sessionId, tool);
  db.close();
}

function clearSession(sessionId: string) {
  const db = new DatabaseSync(DB_PATH);
  db.prepare(
    "DELETE FROM progress WHERE id = ? AND kind IN ('capstone-session', 'capstone-target', 'capstone-tool', 'capstone-step')",
  ).run(sessionId);
  db.close();
}

function writeFile(rel: string, body: string) {
  const abs = path.join(TARGET_DIR, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, body);
}

test.describe("Capstone governance phase — Story 14.1", () => {
  test.beforeEach(() => {
    cleanFs();
  });

  test.afterEach(() => {
    cleanFs();
  });

  test("renders the phase 10 heading + governance teaching primer + launch button", async ({
    page,
  }) => {
    const sessionId = `2026051${Math.floor(Math.random() * 9)}T${String(
      Math.floor(Math.random() * 1_000_000),
    ).padStart(6, "0")}Z`;
    seedSession(sessionId, "claude-code");
    try {
      await page.goto(`/capstone/chat/${sessionId}/governance`);

      // Phase title surfaces governance specifically.
      await expect(
        page.getByRole("heading", { name: /Phase 10 — Governance/ }),
      ).toBeVisible();

      // Teaching primer renders with the governance copy.
      await expect(
        page.getByText(/Codify how your team will work together/, {
          exact: false,
        }),
      ).toBeVisible();
      // The "machine gate" framing for CODEOWNERS specifically — proves
      // the primer's content reached the page, not just the heading.
      await expect(
        page.getByText(/machine gate/, { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByText(/Contributing without AI/, { exact: false }),
      ).toBeVisible();

      // Launch button is present.
      await expect(
        page.getByRole("button", { name: /Open terminal/ }),
      ).toBeVisible();

      // Preview surfaces the SHORT governance label, NOT the multi-paragraph
      // prompt — the prompt is what the AI receives, not what we teach the
      // trainee to read.
      await expect(
        page.getByText(/<governance prompt/, { exact: false }),
      ).toBeVisible();
    } finally {
      clearSession(sessionId);
    }
  });

  test("PTY spawn forwards tool + chosenDir + phase=governance to the spawned process", async ({
    page,
  }) => {
    const sessionId = `2026051${Math.floor(Math.random() * 9)}T${String(
      Math.floor(Math.random() * 1_000_000),
    ).padStart(6, "0")}Z`;
    seedSession(sessionId, "codex");
    try {
      await page.goto(`/capstone/chat/${sessionId}/governance`);
      await page.getByRole("button", { name: /Open terminal/ }).click();
      await expect(
        page.getByRole("heading", { name: /interactive/ }),
      ).toBeVisible();

      const readBuffer = async () =>
        page.evaluate(() => {
          const t = (
            window as unknown as {
              __bmadTerm__?: {
                buffer: {
                  active: { length: number; getLine: (n: number) => unknown };
                };
              };
            }
          ).__bmadTerm__;
          if (!t) return "";
          const out: string[] = [];
          const len = t.buffer.active.length;
          for (let i = 0; i < len; i++) {
            const line = t.buffer.active.getLine(i) as
              | { translateToString: (trim: boolean) => string }
              | undefined;
            if (line) out.push(line.translateToString(true));
          }
          return out.join("\n");
        });

      await expect.poll(readBuffer, { timeout: 10_000 }).toContain(
        `tool=codex`,
      );
      await expect.poll(readBuffer, { timeout: 5_000 }).toContain(
        `phase=governance`,
      );
      await expect.poll(readBuffer, { timeout: 5_000 }).toContain(
        `chosenDir=${TARGET_DIR}`,
      );
    } finally {
      clearSession(sessionId);
    }
  });

  test("phase-done multi-file gate: passes when BOTH .github/CODEOWNERS and CONTRIBUTING.md exist", async ({
    request,
  }) => {
    const sessionId = `2026051${Math.floor(Math.random() * 9)}T${String(
      Math.floor(Math.random() * 1_000_000),
    ).padStart(6, "0")}Z`;
    seedSession(sessionId, "claude-code");
    try {
      writeFile(".github/CODEOWNERS", PADDING);
      writeFile("CONTRIBUTING.md", PADDING);

      const res = await request.post("/api/capstone/phase-done", {
        data: { sessionId, phase: "governance", acknowledged: true },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.valid).toBe(true);
      expect(body.validation.shapeValid).toBe(true);
      expect(body.validation.artifactPath).toContain(".github/CODEOWNERS");
      expect(body.validation.artifactPath).toContain("CONTRIBUTING.md");
      expect(body.nextPhase).toBeNull();
    } finally {
      clearSession(sessionId);
    }
  });

  test("phase-done fails when only CODEOWNERS exists; reason names CONTRIBUTING.md", async ({
    request,
  }) => {
    const sessionId = `2026051${Math.floor(Math.random() * 9)}T${String(
      Math.floor(Math.random() * 1_000_000),
    ).padStart(6, "0")}Z`;
    seedSession(sessionId, "claude-code");
    try {
      writeFile(".github/CODEOWNERS", PADDING);
      // CONTRIBUTING.md intentionally NOT written.

      const res = await request.post("/api/capstone/phase-done", {
        data: { sessionId, phase: "governance", acknowledged: true },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.valid).toBe(false);
      expect(body.validation.reason).toMatch(/CONTRIBUTING\.md not found/);
    } finally {
      clearSession(sessionId);
    }
  });

  test("phase-done fails when only CONTRIBUTING.md exists; reason names CODEOWNERS", async ({
    request,
  }) => {
    const sessionId = `2026051${Math.floor(Math.random() * 9)}T${String(
      Math.floor(Math.random() * 1_000_000),
    ).padStart(6, "0")}Z`;
    seedSession(sessionId, "claude-code");
    try {
      writeFile("CONTRIBUTING.md", PADDING);
      // CODEOWNERS intentionally NOT written.

      const res = await request.post("/api/capstone/phase-done", {
        data: { sessionId, phase: "governance", acknowledged: true },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.valid).toBe(false);
      expect(body.validation.reason).toMatch(/CODEOWNERS not found/);
    } finally {
      clearSession(sessionId);
    }
  });
});
