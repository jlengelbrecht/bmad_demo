import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { test, expect } from "@playwright/test";

const TARGET_DIR = "/tmp/e2e-pty-target";
const SESSION_ID = "20260509T999999Z";
const DB_PATH = path.resolve("./data/e2e-progress.sqlite");

function cleanFs() {
  rmSync(TARGET_DIR, { recursive: true, force: true });
  // Parent dir must exist so path-validate's resolve doesn't choke.
  mkdirSync(path.dirname(TARGET_DIR), { recursive: true });
}

function clearSessionRows() {
  const db = new Database(DB_PATH);
  db.prepare(
    "DELETE FROM progress WHERE id = ? AND kind IN ('capstone-session', 'capstone-target', 'capstone-tool')",
  ).run(SESSION_ID);
  db.close();
}

function readSessionRows(): Array<{ kind: string; completed_at: string | null }> {
  const db = new Database(DB_PATH);
  const rows = db
    .prepare(
      "SELECT kind, completed_at FROM progress WHERE id = ? ORDER BY kind",
    )
    .all(SESSION_ID) as Array<{ kind: string; completed_at: string | null }>;
  db.close();
  return rows;
}

test.beforeEach(() => {
  cleanFs();
  clearSessionRows();
});

test.afterEach(() => {
  cleanFs();
  clearSessionRows();
});

test.describe("Capstone bootstrap — interactive PTY (fixture-backed)", () => {
  test("happy path: type chosenDir → Open terminal → answer 'y' → exit 0 → session-state rows persisted", async ({ page }) => {
    await page.goto(
      `/capstone/setup/bootstrap?session=${SESSION_ID}&tool=claude-code`,
    );

    await expect(
      page.getByRole("heading", { name: /Phase 2 — bootstrap/ }),
    ).toBeVisible();

    // Step 1: enter target dir; validation debounces on input change.
    const dirInput = page.getByLabel("Absolute path to the new repo", {
      exact: false,
    });
    await dirInput.fill(TARGET_DIR);

    // Wait for the ✓ allowed badge — confirms path-validate round-trip
    // (debounce is 400ms; allow generous timeout for the network hop).
    await expect(page.getByText(/✓ allowed/)).toBeVisible({ timeout: 5_000 });

    // Step 2: open the terminal pane
    await page.getByRole("button", { name: /Open terminal/ }).click();
    await expect(
      page.getByRole("heading", { name: /BMAD install — interactive/ }),
    ).toBeVisible();

    // Wait for the fixture banner via the live xterm buffer
    // (window.__bmadTerm__, exposed by terminal-pane.tsx for tests).
    // The .xterm-rows accessibility mirror lags the canvas renderer.
    const readBuffer = async (): Promise<string> =>
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
      "fake-bmad-install: target=",
    );
    await expect.poll(readBuffer, { timeout: 5_000 }).toContain(
      "Continue? (y/n)",
    );

    // Send the keystroke directly via the keystroke route. xterm focus
    // capture under Playwright is flaky (the canvas-backed renderer's
    // helper-textarea takes focus inconsistently); the route POST is
    // exactly what xterm.onData would produce, so this exercises the
    // same server-side path with deterministic input.
    await page.evaluate(
      ({ ptyId }) =>
        fetch(`/api/capstone/pty/${ptyId}/keystroke`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ keystroke: "y" }),
        }),
      { ptyId: SESSION_ID },
    );

    // Fixture exits 0 → onComplete fires → router pushes to /complete.
    await page.waitForURL(/\/capstone\/setup\/bootstrap\/complete/, {
      timeout: 10_000,
    });

    // Verify the three session-state rows landed in the DB.
    const rows = readSessionRows();
    const kinds = rows.map((r) => r.kind);
    expect(kinds).toContain("capstone-session");
    expect(kinds).toContain("capstone-target");
    expect(kinds).toContain("capstone-tool");
    const targetRow = rows.find((r) => r.kind === "capstone-target");
    expect(targetRow?.completed_at).toBe(TARGET_DIR);
    const toolRow = rows.find((r) => r.kind === "capstone-tool");
    expect(toolRow?.completed_at).toBe("claude-code");
  });

  test("disallowed path keeps the Open terminal button disabled", async ({ page }) => {
    await page.goto(
      `/capstone/setup/bootstrap?session=${SESSION_ID}&tool=claude-code`,
    );
    const dirInput = page.getByLabel("Absolute path to the new repo", {
      exact: false,
    });
    await dirInput.fill("/etc");
    await expect(page.getByText(/✗ blocked/)).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: /Open terminal/ }),
    ).toBeDisabled();
  });
});
