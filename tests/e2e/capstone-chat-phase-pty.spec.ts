import { mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test, expect } from "@playwright/test";

const TARGET_DIR = "/tmp/e2e-chat-pty-target";
const DB_PATH = path.resolve("./data/e2e-progress.sqlite");

function cleanFs() {
  rmSync(TARGET_DIR, { recursive: true, force: true });
  mkdirSync(TARGET_DIR, { recursive: true });
}

function seedSession(sessionId: string, tool: string) {
  const db = new DatabaseSync(DB_PATH);
  // Apply schema if not already (idempotent — the dev server's first
  // request applies it too, but the e2e seed runs before any HTTP).
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
    "DELETE FROM progress WHERE id = ? AND kind IN ('capstone-session', 'capstone-target', 'capstone-tool')",
  ).run(sessionId);
  db.close();
}

test.describe("Capstone chat phase — interactive PTY (fixture-backed)", () => {
  test.beforeEach(() => {
    cleanFs();
  });

  test.afterEach(() => {
    cleanFs();
  });

  // Reads the live xterm buffer that terminal-pane.tsx exposes on
  // window.__bmadTerm__ for tests. The .xterm-rows accessibility mirror
  // lags the canvas renderer.
  const readBufferOf = async (page: import("@playwright/test").Page) =>
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

  for (const { tool, displayName, previewMatch } of [
    {
      tool: "claude-code",
      displayName: "Claude Code",
      previewMatch: /claude --dangerously-skip-permissions/,
    },
    {
      tool: "codex",
      displayName: "Codex",
      previewMatch: /codex --dangerously-bypass-approvals-and-sandbox/,
    },
    {
      tool: "github-copilot",
      displayName: "GitHub Copilot",
      previewMatch: /copilot --allow-all-tools -i/,
    },
  ]) {
    test(`tool=${tool}: chat-phase pane renders the per-tool preview + auto-runs the BMAD slash command via PTY`, async ({
      page,
    }) => {
      const sessionId = `2026050${Math.floor(Math.random() * 9)}T${String(
        Math.floor(Math.random() * 1_000_000),
      ).padStart(6, "0")}Z`;
      seedSession(sessionId, tool);
      try {
        await page.goto(`/capstone/chat/${sessionId}/brief`);

        await expect(
          page.getByRole("heading", { name: /Phase 3 — Brief/ }),
        ).toBeVisible();

        // The "what the portal will run" preview block surfaces the
        // per-tool launch command — proves getLaunchCommand drives the UI.
        await expect(page.getByText(previewMatch)).toBeVisible();
        // Green "auto-run" banner is visible because all three tools
        // are autoRun=true post-PTY-pivot.
        await expect(
          page.getByText(/will execute BMAD's/, { exact: false }),
        ).toBeVisible();
        // Tool display name surfaces in the header copy.
        await expect(
          page.getByText(displayName, { exact: false }).first(),
        ).toBeVisible();

        // Click "Open terminal" → spawns the chat PTY, which under
        // CAPSTONE_CHAT_PTY_FIXTURE_SCRIPT runs the fixture script and
        // emits the recognizable banner.
        await page.getByRole("button", { name: /Open terminal/ }).click();
        await expect(
          page.getByRole("heading", { name: /interactive/ }),
        ).toBeVisible();

        // Wait for the fixture's banner — proves the route forwarded
        // chosenDir + tool + phase to the spawned process.
        await expect
          .poll(() => readBufferOf(page), { timeout: 10_000 })
          .toContain(`tool=${tool}`);
        await expect
          .poll(() => readBufferOf(page), { timeout: 5_000 })
          .toContain(`phase=brief`);
        await expect
          .poll(() => readBufferOf(page), { timeout: 5_000 })
          .toContain(`chosenDir=${TARGET_DIR}`);
      } finally {
        clearSession(sessionId);
      }
    });
  }

  test("seed missing → /capstone/chat/<id>/brief renders the unavailable copy (no chosenDir/tool rows)", async ({
    page,
  }) => {
    const sessionId = "20260509T123456Z";
    // Make sure no rows exist
    clearSession(sessionId);
    await page.goto(`/capstone/chat/${sessionId}/brief`);
    await expect(
      page.getByRole("heading", { name: /Capstone chat unavailable/ }),
    ).toBeVisible();
  });
});
