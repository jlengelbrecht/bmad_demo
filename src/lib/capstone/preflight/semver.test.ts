import { describe, expect, it } from "vitest";

import { meetsMinimum } from "./semver";

describe("meetsMinimum", () => {
  it("equal version meets the requirement", () => {
    expect(meetsMinimum("20.0.0", ">=20.0.0")).toBe(true);
  });

  it("greater versions meet the requirement", () => {
    expect(meetsMinimum("22.1.0", ">=20.0.0")).toBe(true);
    expect(meetsMinimum("20.0.1", ">=20.0.0")).toBe(true);
    expect(meetsMinimum("20.1.0", ">=20.0.0")).toBe(true);
  });

  it("lesser versions do not meet the requirement", () => {
    expect(meetsMinimum("18.20.0", ">=20.0.0")).toBe(false);
    expect(meetsMinimum("19.99.99", ">=20.0.0")).toBe(false);
  });

  it("malformed actual returns false", () => {
    expect(meetsMinimum("not-a-version", ">=20.0.0")).toBe(false);
    expect(meetsMinimum("20.0", ">=20.0.0")).toBe(false);
    expect(meetsMinimum("", ">=20.0.0")).toBe(false);
  });

  it("malformed required returns false (defensive)", () => {
    expect(meetsMinimum("22.0.0", "not-a-range")).toBe(false);
  });
});
