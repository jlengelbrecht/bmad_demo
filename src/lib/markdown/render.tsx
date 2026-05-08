import { parseFrontmatter } from "./frontmatter";
import { renderMarkdownToHtml } from "./pipeline";

type MarkdownProps = {
  source: string;
  sourcePath?: string;
  className?: string;
};

export async function Markdown({ source, sourcePath, className }: MarkdownProps) {
  const { body } = parseFrontmatter(source);
  const html = await renderMarkdownToHtml(body, { sourcePath });
  return (
    <article
      className={className ?? "prose prose-zinc dark:prose-invert max-w-none"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
