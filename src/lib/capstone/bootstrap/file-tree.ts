import { readdirSync, statSync } from "node:fs";
import path from "node:path";

export interface TreeNode {
  name: string;
  kind: "file" | "dir" | "symlink";
  size?: number;
  children?: TreeNode[];
  /** When kind === 'symlink', the target. */
  symlinkTarget?: string;
}

const EXCLUDES = new Set(["node_modules", ".next", "dist"]);

export function readBootstrappedTree(rootDir: string, maxDepth = 3): TreeNode {
  return walk(rootDir, path.basename(rootDir), 0, maxDepth);
}

function walk(absolutePath: string, name: string, depth: number, maxDepth: number): TreeNode {
  let stat;
  try {
    stat = statSync(absolutePath);
  } catch {
    return { name, kind: "file" };
  }
  if (stat.isSymbolicLink()) {
    return { name, kind: "symlink" };
  }
  if (stat.isFile()) {
    return { name, kind: "file", size: stat.size };
  }
  if (!stat.isDirectory()) {
    return { name, kind: "file" };
  }
  const node: TreeNode = { name, kind: "dir" };
  if (depth >= maxDepth) return node;
  let entries: string[];
  try {
    entries = readdirSync(absolutePath);
  } catch (err) {
    console.warn(`[file-tree] could not read ${absolutePath}: ${(err as Error).message}`);
    return node;
  }
  const children: TreeNode[] = [];
  for (const entry of entries.sort()) {
    if (EXCLUDES.has(entry)) continue;
    if (entry.endsWith(".log")) continue;
    children.push(walk(path.join(absolutePath, entry), entry, depth + 1, maxDepth));
  }
  node.children = children;
  return node;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
