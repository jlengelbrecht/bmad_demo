import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "./connection";
import { ProgressUpsertRequest } from "./schemas";
import { getProgress, upsertProgress } from "./progress-db";

const SCHEMA_PATH = path.join(process.cwd(), "src", "db", "schema.sql");
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

  it("updates the same (kind, id) row on a second upsert", () => {
    upsertProgress({ kind: "lesson", id: "lesson-2", completed: true }, db);
    const first = getProgress("lesson", "lesson-2", db)!.completedAt!;

    // Wait at least one millisecond so the second timestamp differs.
    const target = Date.now() + 5;
    while (Date.now() < target) {
      // busy wait
    }

    upsertProgress({ kind: "lesson", id: "lesson-2", completed: true }, db);
    const second = getProgress("lesson", "lesson-2", db)!.completedAt!;

    expect(second).toMatch(ISO_UTC);
    expect(second >= first).toBe(true);

    // And exactly one row exists for that key.
    const count = db
      .prepare(`SELECT COUNT(*) AS n FROM progress WHERE kind = ? AND id = ?`)
      .get("lesson", "lesson-2") as { n: number };
    expect(count.n).toBe(1);
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
  it("schema.sql does not contain a `users` table", () => {
    const schema = readFileSync(SCHEMA_PATH, "utf8");
    // Comments may legitimately mention `users`; assert that the live
    // schema (after stripping `--` line comments) carries no `users` token.
    const stripped = schema
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");
    expect(stripped.toLowerCase()).not.toContain("users");
    expect(stripped.toLowerCase()).not.toContain("sessions");
  });

  it("package.json declares no auth-library dependency", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const banned = ["next-auth", "clerk", "@clerk/nextjs", "lucia", "lucia-auth", "iron-session"];
    for (const name of banned) {
      expect(all).not.toHaveProperty(name);
    }
  });
});
