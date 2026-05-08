import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "./connection";
import { ProgressUpsertRequest } from "./schemas";
import { getProgress, listCompleted, upsertProgress } from "./progress-db";

const SCHEMA_PATH = path.resolve(import.meta.dirname, "..", "..", "db", "schema.sql");
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

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

  it("rejects an unknown `kind`", () => {
    const result = ProgressUpsertRequest.safeParse({
      kind: "capstone-session",
      id: "x",
      completed: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty `id`", () => {
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

  it("rejects an `id` over 200 chars", () => {
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
