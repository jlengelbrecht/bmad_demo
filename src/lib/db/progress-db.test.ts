import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { __resetDbCacheForTests, createDb } from "./connection";
import { CAPSTONE_STEP_NAMES, ProgressUpsertRequest } from "./schemas";
import {
  getCapstoneSessionById,
  getProgress,
  getRecentCapstoneSession,
  isCapstoneSessionActive,
  listCompleted,
  markCapstoneSessionComplete,
  upsertProgress,
} from "./progress-db";

const SCHEMA_PATH = path.resolve(import.meta.dirname, "..", "..", "db", "schema.sql");
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

// Story 4.1 review patch: defensive guard so a future test that forgets
// the explicit-`db` arg pattern hits a clean (or absent) production
// singleton instead of polluting the dev portal's progress.sqlite.
beforeEach(() => {
  __resetDbCacheForTests();
});

describe("schema apply", () => {
  it("applies idempotently — running createDb twice on the same in-memory db is a no-op", () => {
    const db = createDb(":memory:");
    // Re-apply the same schema text manually; the IF NOT EXISTS guard
    // makes this a no-op rather than an error.
    const schema = readFileSync(SCHEMA_PATH, "utf8");
    expect(() => db.exec(schema)).not.toThrow();
    db.close();
  });

  it("creates exactly one table named `progress`", () => {
    const db = createDb(":memory:");
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
      .all() as { name: string }[];
    expect(tables.map((t) => t.name).sort()).toEqual(["progress"]);
    db.close();
  });

  it("rejects non-ISO completed_at values via the CHECK constraint", () => {
    const db = createDb(":memory:");
    expect(() =>
      db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
        "lesson",
        "lesson-1",
        "banana",
      ),
    ).toThrow(/CHECK/);
    db.close();
  });
});

describe("upsertProgress", () => {
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    db = createDb(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("inserts a row with a fresh ISO 8601 UTC completed_at when completed=true", () => {
    upsertProgress({ kind: "lesson", id: "lesson-1", completed: true }, db);
    const row = getProgress("lesson", "lesson-1", db);
    expect(row).not.toBeNull();
    expect(row!.completedAt).toMatch(ISO_UTC);
  });

  it("updates the same (kind, id) row on a second upsert (no duplicate row)", () => {
    upsertProgress({ kind: "lesson", id: "lesson-2", completed: true }, db);
    upsertProgress({ kind: "lesson", id: "lesson-2", completed: true }, db);

    // Only one row exists for that key.
    const count = db
      .prepare(`SELECT COUNT(*) AS n FROM progress WHERE kind = ? AND id = ?`)
      .get("lesson", "lesson-2") as { n: number };
    expect(count.n).toBe(1);

    // And its completed_at is still a fresh ISO string.
    expect(getProgress("lesson", "lesson-2", db)!.completedAt).toMatch(ISO_UTC);
  });

  it("clears completed_at to NULL when completed=false (mark-incomplete)", () => {
    upsertProgress({ kind: "lab", id: "solo", completed: true }, db);
    expect(getProgress("lab", "solo", db)!.completedAt).toMatch(ISO_UTC);

    upsertProgress({ kind: "lab", id: "solo", completed: false }, db);
    expect(getProgress("lab", "solo", db)!.completedAt).toBeNull();
  });

  it("returns null from getProgress for a missing row", () => {
    expect(getProgress("lesson", "does-not-exist", db)).toBeNull();
  });
});

describe("listCompleted", () => {
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    db = createDb(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("returns an empty set when nothing is completed", () => {
    expect(listCompleted("lesson", db).size).toBe(0);
  });

  it("returns the ids of completed rows for the given kind", () => {
    upsertProgress({ kind: "lesson", id: "lesson-1", completed: true }, db);
    upsertProgress({ kind: "lesson", id: "lesson-3", completed: true }, db);
    upsertProgress({ kind: "lab", id: "solo", completed: true }, db);

    const lessons = listCompleted("lesson", db);
    expect(lessons.has("lesson-1")).toBe(true);
    expect(lessons.has("lesson-3")).toBe(true);
    expect(lessons.has("solo")).toBe(false);
    expect(lessons.size).toBe(2);
  });

  it("excludes rows where completed_at IS NULL (mark-incomplete)", () => {
    upsertProgress({ kind: "lesson", id: "lesson-1", completed: true }, db);
    upsertProgress({ kind: "lesson", id: "lesson-2", completed: true }, db);
    upsertProgress({ kind: "lesson", id: "lesson-1", completed: false }, db);

    const lessons = listCompleted("lesson", db);
    expect(lessons.has("lesson-1")).toBe(false);
    expect(lessons.has("lesson-2")).toBe(true);
    expect(lessons.size).toBe(1);
  });
});

describe("ProgressUpsertRequest (Zod)", () => {
  it("accepts a well-formed lesson request", () => {
    const result = ProgressUpsertRequest.safeParse({
      kind: "lesson",
      id: "lesson-1",
      completed: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a well-formed lab request", () => {
    const result = ProgressUpsertRequest.safeParse({
      kind: "lab",
      id: "solo",
      completed: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a well-formed capstone-session request (Story 4.1)", () => {
    const result = ProgressUpsertRequest.safeParse({
      kind: "capstone-session",
      id: "20260507T143022Z",
      completed: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a well-formed capstone-step request (Story 4.1)", () => {
    const result = ProgressUpsertRequest.safeParse({
      kind: "capstone-step",
      id: "20260507T143022Z/brief",
      completed: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown `kind`", () => {
    const result = ProgressUpsertRequest.safeParse({
      kind: "bogus",
      id: "x",
      completed: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty `id` (lesson)", () => {
    const result = ProgressUpsertRequest.safeParse({
      kind: "lesson",
      id: "",
      completed: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only `id` (after trim)", () => {
    const result = ProgressUpsertRequest.safeParse({
      kind: "lesson",
      id: "   ",
      completed: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an `id` over 200 chars (lesson)", () => {
    const result = ProgressUpsertRequest.safeParse({
      kind: "lesson",
      id: "x".repeat(201),
      completed: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-boolean `completed`", () => {
    const result = ProgressUpsertRequest.safeParse({
      kind: "lesson",
      id: "lesson-1",
      completed: "yes",
    });
    expect(result.success).toBe(false);
  });

  describe("capstone id format (Story 4.1)", () => {
    it("rejects capstone-session id with dashes/colons (full ISO)", () => {
      const result = ProgressUpsertRequest.safeParse({
        kind: "capstone-session",
        id: "2026-05-07T14:30:22Z",
        completed: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects capstone-session id with milliseconds", () => {
      const result = ProgressUpsertRequest.safeParse({
        kind: "capstone-session",
        id: "20260507T143022.123Z",
        completed: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects capstone-session id without trailing Z", () => {
      const result = ProgressUpsertRequest.safeParse({
        kind: "capstone-session",
        id: "20260507T143022",
        completed: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects capstone-step id with unknown step name", () => {
      const result = ProgressUpsertRequest.safeParse({
        kind: "capstone-step",
        id: "20260507T143022Z/foo",
        completed: true,
      });
      expect(result.success).toBe(false);
    });

    it("rejects capstone-step id missing the slash separator", () => {
      const result = ProgressUpsertRequest.safeParse({
        kind: "capstone-step",
        id: "20260507T143022Zbrief",
        completed: true,
      });
      expect(result.success).toBe(false);
    });

    it("rejects capstone-step id missing the session prefix", () => {
      const result = ProgressUpsertRequest.safeParse({
        kind: "capstone-step",
        id: "/brief",
        completed: true,
      });
      expect(result.success).toBe(false);
    });

    it("accepts each canonical capstone-step name", () => {
      // Iterates over CAPSTONE_STEP_NAMES so the test stays in sync with
      // the regex's source of truth (single literal list — Story 4.1
      // review patch).
      for (const step of CAPSTONE_STEP_NAMES) {
        const result = ProgressUpsertRequest.safeParse({
          kind: "capstone-step",
          id: `20260507T143022Z/${step}`,
          completed: true,
        });
        expect(result.success, `step ${step} should parse`).toBe(true);
      }
    });
  });
});

describe("forward-compat: schema absorbs Story-3.1-shaped rows (Story 4.1 AC2)", () => {
  it("re-applies schema.sql against a DB seeded with lesson/lab rows (completed + mark-incomplete) without throwing or losing rows", () => {
    const db = createDb(":memory:");
    // Use `new Date().toISOString()` so the seed values match what the
    // production producer (`upsertProgress`) writes — including any
    // millisecond precision the runtime adds (Story 4.1 review patch).
    const insertedLesson = new Date().toISOString();
    const insertedLab = new Date(Date.now() + 1).toISOString();

    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "lesson",
      "lesson-1",
      insertedLesson,
    );
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "lab",
      "solo",
      insertedLab,
    );
    // Story 3.1's mark-incomplete contract: a row with `completed_at = NULL`.
    // This shape must survive the schema re-apply too.
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "lesson",
      "lesson-2",
      null,
    );

    // Re-apply the schema text. The IF NOT EXISTS guard makes this a
    // no-op for the table; existing rows must not be lost.
    const schema = readFileSync(SCHEMA_PATH, "utf8");
    expect(() => db.exec(schema)).not.toThrow();

    const lessonRow = db
      .prepare(`SELECT completed_at FROM progress WHERE kind = ? AND id = ?`)
      .get("lesson", "lesson-1") as { completed_at: string };
    const labRow = db
      .prepare(`SELECT completed_at FROM progress WHERE kind = ? AND id = ?`)
      .get("lab", "solo") as { completed_at: string };
    const incompleteRow = db
      .prepare(`SELECT completed_at FROM progress WHERE kind = ? AND id = ?`)
      .get("lesson", "lesson-2") as { completed_at: string | null };

    expect(lessonRow.completed_at).toBe(insertedLesson);
    expect(labRow.completed_at).toBe(insertedLab);
    expect(incompleteRow.completed_at).toBeNull();
    db.close();
  });
});

describe("getRecentCapstoneSession (Story 4.1)", () => {
  let db: ReturnType<typeof createDb>;
  beforeEach(() => {
    db = createDb(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  it("returns null on a fresh DB", () => {
    expect(getRecentCapstoneSession(db)).toBeNull();
  });

  it("returns the latest session by id DESC ordering", () => {
    const insert = db.prepare(
      `INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`,
    );
    insert.run("capstone-session", "20260507T143022Z", null);
    insert.run("capstone-session", "20260508T090000Z", null);
    insert.run("capstone-session", "20260506T120000Z", null);

    const row = getRecentCapstoneSession(db);
    expect(row).not.toBeNull();
    expect(row!.id).toBe("20260508T090000Z");
    expect(row!.completedAt).toBeNull();
  });

  it("ignores non-capstone-session rows", () => {
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "lesson",
      "lesson-1",
      "2026-05-08T00:00:00Z",
    );
    expect(getRecentCapstoneSession(db)).toBeNull();
  });

  it("returns the ISO timestamp on a completed session", () => {
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "capstone-session",
      "20260507T143022Z",
      "2026-05-08T00:00:00Z",
    );
    const row = getRecentCapstoneSession(db);
    expect(row!.completedAt).toBe("2026-05-08T00:00:00Z");
  });

  it("returns the most recent session when ALL are completed (locks the Story 4.3 caller's must-check-completedAt contract)", () => {
    // Story 4.1 review patch: `getRecentCapstoneSession` does NOT filter
    // for active rows. Story 4.3's `/capstone` overview branches on
    // `completedAt !== null` to render the "Your last capstone" panel.
    // This test locks the semantic so a future "filter to active only"
    // refactor doesn't silently break the complete-session branch.
    const insert = db.prepare(
      `INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`,
    );
    insert.run("capstone-session", "20260506T120000Z", "2026-05-06T13:00:00Z");
    insert.run("capstone-session", "20260508T090000Z", "2026-05-08T10:00:00Z");

    const row = getRecentCapstoneSession(db);
    expect(row).not.toBeNull();
    expect(row!.id).toBe("20260508T090000Z");
    expect(row!.completedAt).toBe("2026-05-08T10:00:00Z");
  });
});

describe("getCapstoneSessionById (Story 4.1 / 4.3)", () => {
  let db: ReturnType<typeof createDb>;
  beforeEach(() => {
    db = createDb(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  it("returns null for a non-existent session", () => {
    expect(getCapstoneSessionById("20260507T143022Z", db)).toBeNull();
  });

  it("returns the active row when present", () => {
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "capstone-session",
      "20260507T143022Z",
      null,
    );
    const row = getCapstoneSessionById("20260507T143022Z", db);
    expect(row).toEqual({ id: "20260507T143022Z", completedAt: null });
  });

  it("returns the completed row with its ISO timestamp", () => {
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "capstone-session",
      "20260507T143022Z",
      "2026-05-08T00:00:00Z",
    );
    const row = getCapstoneSessionById("20260507T143022Z", db);
    expect(row).toEqual({
      id: "20260507T143022Z",
      completedAt: "2026-05-08T00:00:00Z",
    });
  });

  it("does not return a row of a different kind even if the id matches", () => {
    // A row with the same id but kind='capstone-step' should not match.
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "capstone-step",
      "20260507T143022Z",
      null,
    );
    expect(getCapstoneSessionById("20260507T143022Z", db)).toBeNull();
  });
});

describe("isCapstoneSessionActive (Story 4.1)", () => {
  let db: ReturnType<typeof createDb>;
  beforeEach(() => {
    db = createDb(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  it("returns true for an in-progress session", () => {
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "capstone-session",
      "20260507T143022Z",
      null,
    );
    expect(isCapstoneSessionActive("20260507T143022Z", db)).toBe(true);
  });

  it("returns false after the session is marked complete", () => {
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "capstone-session",
      "20260507T143022Z",
      null,
    );
    markCapstoneSessionComplete("20260507T143022Z", db);
    expect(isCapstoneSessionActive("20260507T143022Z", db)).toBe(false);
  });

  it("returns false for a row inserted directly with completed_at NOT NULL (does not depend on markCapstoneSessionComplete)", () => {
    // Story 4.1 review patch: the previous "false on completed" case
    // routed through `markCapstoneSessionComplete`. A regression that
    // dropped `AND completed_at IS NULL` from the WHERE would still pass
    // because the helper's own filter would no-op. Insert a completed
    // row directly to lock the active-vs-complete distinction at the
    // SQL layer.
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "capstone-session",
      "20260507T143022Z",
      "2026-05-08T00:00:00Z",
    );
    expect(isCapstoneSessionActive("20260507T143022Z", db)).toBe(false);
  });

  it("returns false for a non-existent session id", () => {
    expect(isCapstoneSessionActive("20260507T143022Z", db)).toBe(false);
  });
});

describe("markCapstoneSessionComplete (Story 4.1)", () => {
  let db: ReturnType<typeof createDb>;
  beforeEach(() => {
    db = createDb(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  it("flips an active session to complete and returns updated:true", () => {
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "capstone-session",
      "20260507T143022Z",
      null,
    );
    const result = markCapstoneSessionComplete("20260507T143022Z", db);
    expect(result.updated).toBe(true);

    const row = getCapstoneSessionById("20260507T143022Z", db);
    expect(row!.completedAt).toMatch(ISO_UTC);
  });

  it("no-ops on an already-complete session and returns updated:false", () => {
    db.prepare(`INSERT INTO progress (kind, id, completed_at) VALUES (?, ?, ?)`).run(
      "capstone-session",
      "20260507T143022Z",
      "2026-05-08T00:00:00Z",
    );
    const result = markCapstoneSessionComplete("20260507T143022Z", db);
    expect(result.updated).toBe(false);

    // Original timestamp must not have been overwritten.
    const row = getCapstoneSessionById("20260507T143022Z", db);
    expect(row!.completedAt).toBe("2026-05-08T00:00:00Z");
  });

  it("no-ops on a missing session and returns updated:false", () => {
    const result = markCapstoneSessionComplete("20260507T143022Z", db);
    expect(result.updated).toBe(false);
  });
});

describe("no auth surface", () => {
  it("schema.sql does not contain a `users` or `sessions` table (after stripping comments)", () => {
    const schema = readFileSync(SCHEMA_PATH, "utf8");
    // Strip block comments first, then line comments, so legitimate prose
    // mentions in the header don't false-positive.
    const noBlocks = schema.replace(/\/\*[\s\S]*?\*\//g, "");
    const noLines = noBlocks
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");
    // Word-boundary match so 'paused_users_count' or similar future column
    // names don't accidentally trip the smoke.
    expect(noLines.toLowerCase()).not.toMatch(/\busers\b/);
    expect(noLines.toLowerCase()).not.toMatch(/\bsessions\b/);
  });

  it("package.json declares no auth-library dependency", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const banned = [
      "next-auth",
      "@auth/core",
      "clerk",
      "@clerk/nextjs",
      "@clerk/clerk-sdk-node",
      "lucia",
      "lucia-auth",
      "iron-session",
      "auth0",
      "@auth0/nextjs-auth0",
      "passport",
      "better-auth",
      "@supabase/auth-helpers-nextjs",
      "firebase",
      "firebase-auth",
    ];
    for (const name of banned) {
      expect(all).not.toHaveProperty(name);
    }
  });
});
