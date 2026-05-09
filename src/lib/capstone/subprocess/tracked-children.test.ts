import type { ChildProcess } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

import {
  __resetForTests,
  getAll,
  track,
  untrack,
} from "./tracked-children";

afterEach(() => {
  __resetForTests();
});

function fakeChild(): ChildProcess {
  // Minimal stand-in — the registry treats children as opaque keys.
  // Cast through unknown so we don't have to fabricate the full ChildProcess shape.
  return {} as unknown as ChildProcess;
}

describe("tracked-children registry", () => {
  it("starts empty", () => {
    expect(getAll().size).toBe(0);
  });

  it("track adds the child", () => {
    const c = fakeChild();
    track(c);
    expect(getAll().size).toBe(1);
    expect(getAll().has(c)).toBe(true);
  });

  it("track is idempotent (Set semantics)", () => {
    const c = fakeChild();
    track(c);
    track(c);
    expect(getAll().size).toBe(1);
  });

  it("untrack removes the child", () => {
    const c = fakeChild();
    track(c);
    untrack(c);
    expect(getAll().size).toBe(0);
  });

  it("untrack on a missing child is a no-op", () => {
    untrack(fakeChild());
    expect(getAll().size).toBe(0);
  });

  it("__resetForTests clears the set", () => {
    track(fakeChild());
    track(fakeChild());
    __resetForTests();
    expect(getAll().size).toBe(0);
  });

  it("module surface includes track, untrack, getAll, findChildren, __resetForTests", async () => {
    const mod = await import("./tracked-children");
    expect(Object.keys(mod).sort()).toEqual(
      [
        "__resetForTests",
        "findChildren",
        "getAll",
        "track",
        "untrack",
      ].sort(),
    );
  });
});
