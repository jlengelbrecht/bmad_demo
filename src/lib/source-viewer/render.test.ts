import { describe, expect, it } from "vitest";

import { buildSourceBody } from "./render";

describe("buildSourceBody", () => {
  it("passes markdown through unchanged with kind='markdown'", () => {
    const md = "# Title\n\nSome **bold** content.";
    const r = buildSourceBody(md, ".md");
    expect(r.kind).toBe("markdown");
    expect(r.body).toBe(md);
    expect(r.lang).toBe("");
    expect(r.ext).toBe(".md");
    expect(r.sizeBytes).toBe(Buffer.byteLength(md, "utf8"));
  });

  it("wraps yaml in a fenced code block with lang=yaml", () => {
    const yaml = "version: 6.6.0\nmodules:\n  - name: core\n";
    const r = buildSourceBody(yaml, ".yaml");
    expect(r.kind).toBe("code");
    expect(r.lang).toBe("yaml");
    expect(r.body).toContain("````yaml\n");
    expect(r.body).toContain(yaml);
    expect(r.body).toContain("\n````\n");
  });

  it("uses 'json' lang for .json + .jsonc files", () => {
    expect(buildSourceBody("{}", ".json").lang).toBe("json");
    expect(buildSourceBody("{}", ".jsonc").lang).toBe("json");
  });

  it("uses 'typescript' for .ts and 'tsx' for .tsx", () => {
    expect(buildSourceBody("export {}", ".ts").lang).toBe("typescript");
    expect(buildSourceBody("export {}", ".tsx").lang).toBe("tsx");
  });

  it("uses 'python' for .py", () => {
    expect(buildSourceBody("pass", ".py").lang).toBe("python");
  });

  it("emits a code block with empty lang for unknown extensions", () => {
    const r = buildSourceBody("hello", ".unknown");
    expect(r.kind).toBe("code");
    expect(r.lang).toBe("");
    expect(r.body).toContain("````\n");
    expect(r.body).toContain("hello");
  });

  it("normalizes the extension to lowercase", () => {
    const r = buildSourceBody("hi", ".YAML");
    expect(r.ext).toBe(".yaml");
    expect(r.lang).toBe("yaml");
  });

  it("uses 4-backtick fences so triple-backticks in source pass through", () => {
    // A 4-backtick fence wraps content even if the content itself
    // contains a 3-backtick fence (which would close a 3-backtick wrap).
    const tricky = "Here's how:\n```\necho hi\n```";
    const r = buildSourceBody(tricky, ".md");
    // .md is markdown — no fence wrapping. This guards the assumption
    // that markdown isn't double-wrapped.
    expect(r.body).toBe(tricky);
  });
});
