import { existsSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { Element, Root } from "hast";

type DevLinkCheckOptions = {
  sourcePath?: string;
};

const warned = new Set<string>();

function isRelativeHref(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("#") || href.startsWith("/") || href.startsWith("mailto:")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false;
  return true;
}

export const devLinkCheck: Plugin<[DevLinkCheckOptions?], Root> = (options = {}) => {
  const { sourcePath } = options;

  return (tree) => {
    if (process.env.NODE_ENV === "production") return;
    if (!sourcePath) return;

    const sourceDir = path.dirname(sourcePath);

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const href = node.properties?.href;
      if (typeof href !== "string" || !isRelativeHref(href)) return;

      const cleaned = href.split("#")[0].split("?")[0];
      if (!cleaned) return;

      const target = path.resolve(sourceDir, cleaned);
      if (existsSync(target)) return;

      const key = `${sourcePath}::${cleaned}`;
      if (warned.has(key)) return;
      warned.add(key);
      console.warn(
        `[markdown] missing relative-link target: "${cleaned}" referenced from ${sourcePath}`,
      );
    });
  };
};
