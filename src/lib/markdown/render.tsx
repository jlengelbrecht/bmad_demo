import "server-only";

import { parseFrontmatter } from "./frontmatter";
import { renderMarkdownToHtml } from "./pipeline";

type MarkdownProps = {
  source: string;
  sourcePath?: string;
  className?: string;
};

export async function Markdown({ source, sourcePath, className }: MarkdownProps) {
  let body = source;
  try {
    body = parseFrontmatter(source).body;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[markdown] frontmatter parse failed${sourcePath ? ` for ${sourcePath}` : ""}; rendering raw body. ${String(err)}`,
      );
    }
  }
  const html = await renderMarkdownToHtml(body, { sourcePath });
  return (
    <article
      className={className ?? "prose prose-zinc dark:prose-invert max-w-none"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
