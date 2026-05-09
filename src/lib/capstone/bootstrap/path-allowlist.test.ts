import path from "node:path";
import { describe, expect, it } from "vitest";

import { isPathAllowed } from "./path-allowlist";

const HOME = "/home/devbox";
const CWD = "/var/home/devbox/repos/bmad_demo";

describe("isPathAllowed", () => {
  it("allows ~/projects/my-app", () => {
    const r = isPathAllowed("~/projects/my-app", HOME, CWD);
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.resolved).toBe(path.join(HOME, "projects", "my-app"));
  });

  it("blocks ~ exactly", () => {
    const r = isPathAllowed("~", HOME, CWD);
    expect(r.allowed).toBe(false);
  });

  it("blocks ~/.ssh", () => {
    expect(isPathAllowed("~/.ssh", HOME, CWD).allowed).toBe(false);
    expect(isPathAllowed("~/.ssh/keys", HOME, CWD).allowed).toBe(false);
  });

  it("blocks /etc and subdirs", () => {
    expect(isPathAllowed("/etc", HOME, CWD).allowed).toBe(false);
    expect(isPathAllowed("/etc/hosts", HOME, CWD).allowed).toBe(false);
  });

  it("blocks paths under the portal's cwd", () => {
    expect(isPathAllowed(CWD, HOME, CWD).allowed).toBe(false);
    expect(isPathAllowed(`${CWD}/sub`, HOME, CWD).allowed).toBe(false);
  });

  it("blocks dotfile-style directory names", () => {
    expect(isPathAllowed("/home/devbox/.cache/x", HOME, CWD).allowed).toBe(false);
    expect(isPathAllowed("/home/devbox/projects/.hidden/x", HOME, CWD).allowed).toBe(
      false,
    );
  });

  it("blocks NUL bytes / oversized strings", () => {
    expect(isPathAllowed("/tmp/has\0nul", HOME, CWD).allowed).toBe(false);
    const huge = "/" + "a".repeat(5000);
    expect(isPathAllowed(huge, HOME, CWD).allowed).toBe(false);
  });

  it("blocks empty string", () => {
    expect(isPathAllowed("", HOME, CWD).allowed).toBe(false);
  });
});
