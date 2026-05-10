import "server-only";

/**
 * Map a file extension to a code-fence language hint. Everything not
 * here renders as a plain code block (no syntax highlighting).
 */
const EXT_TO_LANG: Record<string, string> = {
  ".md": "markdown",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".json": "json",
  ".jsonc": "json",
  ".toml": "toml",
  ".py": "python",
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".sh": "bash",
  ".csv": "csv",
  ".html": "html",
  ".css": "css",
};

export type SourceRenderKind = "markdown" | "code";

export type SourceRenderResult = {
  kind: SourceRenderKind;
  /** Body to feed `<Markdown source={body} />`. */
  body: string;
  /** Original file size in bytes, for the page header. */
  sizeBytes: number;
  /** File extension (lowercased, with leading dot, or empty string). */
  ext: string;
  /** Detected code-fence language for non-markdown files. Empty for markdown. */
  lang: string;
};

/**
 * Build the body that gets passed to `<Markdown>`:
 *   - `.md` files render as themselves (their fences and frontmatter
 *     pass through the existing pipeline).
 *   - Other text files are wrapped in a fenced code block with a `lang`
 *     hint so `rehype-pretty-code` highlights them.
 *
 * No special-casing for binary files — caller is expected to have
 * verified the file is readable text via the allowlist (we only allow
 * directories whose contents we know are text).
 */
export function buildSourceBody(
  contents: string,
  ext: string,
): SourceRenderResult {
  const sizeBytes = Buffer.byteLength(contents, "utf8");
  const lowerExt = ext.toLowerCase();
  if (lowerExt === ".md") {
    return {
      kind: "markdown",
      body: contents,
      sizeBytes,
      ext: lowerExt,
      lang: "",
    };
  }
  const lang = EXT_TO_LANG[lowerExt] ?? "";
  // Fence the contents. Use four backticks in case the file itself
  // contains triple-backtick fences (markdown source files typically
  // don't reach this branch but defense-in-depth).
  const fence = "````";
  const body = `${fence}${lang}\n${contents}\n${fence}\n`;
  return {
    kind: "code",
    body,
    sizeBytes,
    ext: lowerExt,
    lang,
  };
}
