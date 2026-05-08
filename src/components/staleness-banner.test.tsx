import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StalenessBanner, classifyStaleness } from "./staleness-banner";

const NOW = new Date("2026-05-08T00:00:00Z");

describe("classifyStaleness", () => {
  it("returns kind:'fresh' for a date inside the 120-day window", () => {
    const v = classifyStaleness("2026-04-01", NOW);
    expect(v.kind).toBe("fresh");
    if (v.kind !== "fresh") return;
    expect(v.daysAgo).toBe(37);
  });

  it("returns kind:'stale' at exactly 120 days", () => {
    const v = classifyStaleness("2026-01-08", NOW);
    expect(v.kind).toBe("stale");
    if (v.kind !== "stale") return;
    expect(v.daysAgo).toBe(120);
  });

  it("returns kind:'fresh' at 119 days (boundary just inside)", () => {
    const v = classifyStaleness("2026-01-09", NOW);
    expect(v.kind).toBe("fresh");
    if (v.kind !== "fresh") return;
    expect(v.daysAgo).toBe(119);
  });

  it("returns kind:'stale' for a date well past the threshold", () => {
    const v = classifyStaleness("2025-01-01", NOW);
    expect(v.kind).toBe("stale");
  });

  it("returns kind:'unknown' for missing reviewedAt", () => {
    expect(classifyStaleness(undefined, NOW)).toEqual({ kind: "unknown" });
  });

  it("returns kind:'unknown' for unparseable reviewedAt", () => {
    expect(classifyStaleness("not-a-date", NOW)).toEqual({ kind: "unknown" });
  });

  it("returns kind:'unknown' for non-ISO loose forms ('2026-1-5', '2026/01/05')", () => {
    expect(classifyStaleness("2026-1-5", NOW).kind).toBe("unknown");
    expect(classifyStaleness("2026/01/05", NOW).kind).toBe("unknown");
  });

  it("returns kind:'unknown' for the literal '0' (regression: V8 parses this to year 2000)", () => {
    expect(classifyStaleness("0", NOW).kind).toBe("unknown");
  });

  it("returns kind:'unknown' for a future-dated reviewedAt (typo guard)", () => {
    expect(classifyStaleness("2099-01-01", NOW).kind).toBe("unknown");
  });
});

describe("<StalenessBanner /> render", () => {
  it("renders 'flagged as stale' for a date >120 days old", () => {
    const html = renderToStaticMarkup(<StalenessBanner reviewedAt="2025-01-01" now={NOW} />);
    expect(html).toContain("flagged as stale");
    expect(html).toContain("Last reviewed 2025-01-01");
    // Tight assertion on the visible "Stale" label, not the substring inside "flagged as stale".
    expect(html).toMatch(/<span[^>]*>Stale<\/span>/);
  });

  it("uses role=\"alert\" on the warning branches so SR convey urgency", () => {
    const html = renderToStaticMarkup(<StalenessBanner reviewedAt="2025-01-01" now={NOW} />);
    expect(html).toContain('role="alert"');
  });

  it("renders the neutral 'Last reviewed' line for a fresh date", () => {
    const html = renderToStaticMarkup(<StalenessBanner reviewedAt="2026-04-01" now={NOW} />);
    expect(html).toContain("Last reviewed 2026-04-01");
    expect(html).not.toContain("flagged as stale");
  });

  it("uses role=\"status\" for the fresh branch (polite, not interruptive)", () => {
    const html = renderToStaticMarkup(<StalenessBanner reviewedAt="2026-04-01" now={NOW} />);
    expect(html).toContain('role="status"');
  });

  it("renders the unknown-branch warning when reviewedAt is missing", () => {
    const html = renderToStaticMarkup(<StalenessBanner reviewedAt={undefined} now={NOW} />);
    expect(html).toContain("No review date — treat as stale");
    expect(html).toMatch(/<span[^>]*>Stale<\/span>/);
  });

  it("renders the unknown-branch warning when reviewedAt is unparseable", () => {
    const html = renderToStaticMarkup(<StalenessBanner reviewedAt="garbage" now={NOW} />);
    expect(html).toContain("No review date — treat as stale");
  });

  it("renders the unknown-branch warning for a future-dated reviewedAt", () => {
    const html = renderToStaticMarkup(<StalenessBanner reviewedAt="2099-01-01" now={NOW} />);
    expect(html).toContain("No review date — treat as stale");
  });
});
