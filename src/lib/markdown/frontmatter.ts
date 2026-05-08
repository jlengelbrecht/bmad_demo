import matter from "gray-matter";

export type ParsedMarkdown = {
  frontmatter: Record<string, unknown>;
  body: string;
};

export function parseFrontmatter(source: string): ParsedMarkdown {
  const parsed = matter(source);
  const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
  return { frontmatter, body: parsed.content };
}
