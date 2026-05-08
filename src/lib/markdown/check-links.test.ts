import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { checkLinks } from "./check-links";

describe("checkLinks", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), "check-links-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns no problems when all relative links resolve to existing files", async () => {
    writeFileSync(path.join(tmp, "a.md"), "[to b](./b.md) and [to c](./c.md)\n");
    writeFileSync(path.join(tmp, "b.md"), "[back to a](./a.md)\n");
    writeFileSync(path.join(tmp, "c.md"), "Hello\n");

    const result = await checkLinks([tmp]);
    expect(result.problems).toEqual([]);
    expect(result.filesScanned).toBe(3);
    expect(result.linksScanned).toBe(3);
  });

  it("reports broken relative links with file, line, and href", async () => {
    writeFileSync(path.join(tmp, "a.md"), "intro\n\n[gone](./missing.md)\n");

    const result = await checkLinks([tmp]);
    expect(result.problems).toHaveLength(1);
    const problem = result.problems[0];
    expect(problem.file).toBe(path.join(tmp, "a.md"));
    expect(problem.href).toBe("./missing.md");
    expect(problem.line).toBe(3);
  });

  it("does not flag external URLs (http, https, mailto)", async () => {
    writeFileSync(
      path.join(tmp, "a.md"),
      "[ext](https://example.com) [http](http://example.com) [mail](mailto:hi@example.com)\n",
    );

    const result = await checkLinks([tmp]);
    expect(result.problems).toEqual([]);
    expect(result.linksScanned).toBe(0);
  });

  it("does not flag anchor-only fragments", async () => {
    writeFileSync(path.join(tmp, "a.md"), "[top](#intro) [section](#some-heading)\n");

    const result = await checkLinks([tmp]);
    expect(result.problems).toEqual([]);
    expect(result.linksScanned).toBe(0);
  });

  it("does not flag site-absolute paths (defers to runtime routing)", async () => {
    writeFileSync(path.join(tmp, "a.md"), "[home](/) [start](/start-here)\n");

    const result = await checkLinks([tmp]);
    expect(result.problems).toEqual([]);
    expect(result.linksScanned).toBe(0);
  });

  it("decodes URI-encoded relative paths before checking existence", async () => {
    writeFileSync(path.join(tmp, "foo bar.md"), "exists\n");
    writeFileSync(path.join(tmp, "a.md"), "[encoded](./foo%20bar.md)\n");

    const result = await checkLinks([tmp]);
    expect(result.problems).toEqual([]);
    expect(result.linksScanned).toBe(1);
  });

  it("strips fragments and query strings before resolving relative paths", async () => {
    writeFileSync(path.join(tmp, "target.md"), "ok\n");
    writeFileSync(
      path.join(tmp, "a.md"),
      "[anchored](./target.md#some-heading) [queried](./target.md?x=1)\n",
    );

    const result = await checkLinks([tmp]);
    expect(result.problems).toEqual([]);
    expect(result.linksScanned).toBe(2);
  });

  it("walks markdown files alphabetically", async () => {
    writeFileSync(path.join(tmp, "z.md"), "[broken](./missing-z.md)\n");
    writeFileSync(path.join(tmp, "a.md"), "[broken](./missing-a.md)\n");
    writeFileSync(path.join(tmp, "m.md"), "[broken](./missing-m.md)\n");

    const result = await checkLinks([tmp]);
    expect(result.problems.map((p) => path.basename(p.file))).toEqual(["a.md", "m.md", "z.md"]);
  });

  it("recurses into subdirectories", async () => {
    const subdir = path.join(tmp, "labs");
    writeFileSync(path.join(tmp, "a.md"), "root\n");
    mkdirSync(subdir);
    writeFileSync(path.join(subdir, "nested.md"), "[to root](../a.md)\n");

    const result = await checkLinks([tmp]);
    expect(result.filesScanned).toBe(2);
    expect(result.problems).toEqual([]);
  });
});
