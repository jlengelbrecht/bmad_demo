import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { devLinkCheck } from "./dev-link-check";

type RenderOptions = {
  sourcePath?: string;
};

export async function renderMarkdownToHtml(
  body: string,
  { sourcePath }: RenderOptions = {},
): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "prepend",
      properties: {
        className: ["heading-anchor"],
        "aria-label": "Permalink to this section",
      },
      content: { type: "text", value: "#" },
    })
    .use(rehypePrettyCode, {
      theme: "github-dark-dimmed",
      keepBackground: true,
    })
    .use(devLinkCheck, { sourcePath })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(body);

  return String(file);
}
