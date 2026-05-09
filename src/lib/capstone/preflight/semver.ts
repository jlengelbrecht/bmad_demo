/**
 * Compares an `actual` version string (e.g., `'22.1.0'`) against a
 * `>=X.Y.Z` `required` range. Inline because the three preflight
 * checks (node, git, npx) all use the `>=` form; the rule of three
 * for promoting `semver` as a dep isn't tripped here yet.
 *
 * Returns `false` if `actual` is malformed; otherwise the obvious
 * lexicographic-by-segment greater-or-equal comparison.
 */
export function meetsMinimum(actual: string, required: string): boolean {
  const reqMatch = /^>=\s*(\d+)\.(\d+)\.(\d+)/.exec(required.trim());
  if (!reqMatch) return false;
  const want = [Number(reqMatch[1]), Number(reqMatch[2]), Number(reqMatch[3])];

  const segs = actual.split(".").map((s) => Number.parseInt(s, 10));
  if (segs.length !== 3 || segs.some((n) => Number.isNaN(n))) return false;

  for (let i = 0; i < 3; i++) {
    if (segs[i] > want[i]) return true;
    if (segs[i] < want[i]) return false;
  }
  return true;
}
