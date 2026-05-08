import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "./frontmatter";
import { renderMarkdownToHtml } from "./pipeline";

describe("renderMarkdownToHtml — GFM", () => {
  it("renders a GFM table to <table>", async () => {
    const html = await renderMarkdownToHtml("| a | b |\n|---|---|\n| 1 | 2 |\n");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>a</th>");
    expect(html).toContain("<td>2</td>");
  });

  it("renders a GFM footnote with a backreference link", async () => {
    const html = await renderMarkdownToHtml("Text[^1]\n\n[^1]: footnote body\n");
    expect(html).toMatch(/href="#user-content-fn-1"/);
    expect(html).toContain("footnote body");
  });

  it("renders a fenced code block with rehype-pretty-code styling", async () => {
    const html = await renderMarkdownToHtml("```ts\nconst x = 1;\n```\n");
    expect(html).toMatch(/<pre[^>]*>/);
    expect(html).toMatch(/<code[^>]*>/);
    expect(html).toMatch(/data-language="ts"/);
  });
});

describe("renderMarkdownToHtml — headings", () => {
  it("adds slug ids and a prepended autolink anchor with aria-label", async () => {
    const html = await renderMarkdownToHtml("## Foo Bar Baz\n");
    expect(html).toContain('id="foo-bar-baz"');
    expect(html).toMatch(/<a[^>]*aria-label="Permalink to this section"[^>]*>/);
    expect(html).toMatch(/<a[^>]*class="heading-anchor"[^>]*>/);
  });
});

describe("renderMarkdownToHtml — relative links preserved verbatim", () => {
  it("does not rewrite a deep relative path", async () => {
    const html = await renderMarkdownToHtml("[X](../a/b.md)\n");
    expect(html).toContain('href="../a/b.md"');
  });

  it("does not rewrite a dot-prefixed path like .github/CODEOWNERS", async () => {
    const html = await renderMarkdownToHtml("[CODEOWNERS](.github/CODEOWNERS)\n");
    expect(html).toContain('href=".github/CODEOWNERS"');
  });

  it("leaves absolute and anchor links unchanged", async () => {
    const html = await renderMarkdownToHtml("[abs](/x) [anchor](#sec) [ext](https://example.com)\n");
    expect(html).toContain('href="/x"');
    expect(html).toContain('href="#sec"');
    expect(html).toContain('href="https://example.com"');
  });
});

describe("parseFrontmatter", () => {
  it("returns parsed YAML and the body when frontmatter is present", () => {
    const input = "---\ntitle: Foo\nreviewedAt: 2026-01-15\n---\n# heading\n\nbody\n";
    const { frontmatter, body } = parseFrontmatter(input);
    expect(frontmatter.title).toBe("Foo");
    expect(frontmatter.reviewedAt).toBeInstanceOf(Date);
    expect(body.startsWith("# heading")).toBe(true);
  });

  it("returns an empty record + full source when frontmatter is missing", () => {
    const input = "# heading\n\nno frontmatter here\n";
    const { frontmatter, body } = parseFrontmatter(input);
    expect(frontmatter).toEqual({});
    expect(body).toBe(input);
  });
});
