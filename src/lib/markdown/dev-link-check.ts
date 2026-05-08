import { existsSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { Element, Root } from "hast";

type DevLinkCheckOptions = {
  sourcePath?: string;
  warned?: Set<string>;
};

function isRelativeHref(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("#") || href.startsWith("/")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false;
  return true;
}

function normalizeHref(href: string): string {
  const stripped = href.split("#")[0].split("?")[0];
  if (!stripped) return "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(stripped);
  } catch {
    decoded = stripped;
  }
  return decoded.replace(/\\/g, "/");
}

export const devLinkCheck: Plugin<[DevLinkCheckOptions?], Root> = (options = {}) => {
  const { sourcePath, warned } = options;

  return (tree) => {
    if (process.env.NODE_ENV === "production") return;
    if (!sourcePath) return;
    if (!path.isAbsolute(sourcePath)) {
      throw new Error(
        `[markdown] devLinkCheck requires an absolute sourcePath; got ${JSON.stringify(sourcePath)}`,
      );
    }

    const sourceDir = path.dirname(sourcePath);

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const href = node.properties?.href;
      if (typeof href !== "string" || !isRelativeHref(href)) return;

      const cleaned = normalizeHref(href);
      if (!cleaned) return;

      const target = path.resolve(sourceDir, cleaned);
      if (existsSync(target)) return;

      const key = `${sourcePath}::${cleaned}`;
      if (warned?.has(key)) return;
      warned?.add(key);
      console.warn(
        `[markdown] missing relative-link target: "${cleaned}" referenced from ${sourcePath}`,
      );
    });
  };
};
