# Story 11.5: Bootstrap surface visual components (`<CommandPreview>`, `<ProgressStreamPanel>`, `<FileTree>`)

**Epic:** 11 — UI Polish + Theming
**Story Key:** 11-5-bootstrap-surface-visual-components
**Status:** ready-for-dev

## Story

As the developer landing the visual layer for the capstone bootstrap surface (Epic 6's Stories 6.4 + 6.6),
I want three custom components vendored at `src/components/capstone-bootstrap/*.tsx` — `<CommandPreview>`, `<ProgressStreamPanel>`, `<FileTree>` — built against the foundation tokens (Story 11.1) and ready for Stories 6.4/6.6 to wire,
So that Story 6.4's authoring focuses on the SSE bootstrap orchestration and Story 6.6's on the post-bootstrap explainer; visual contract stays in 11.5.

**Sequencing:** Lands AFTER Story 11.1 (foundation). Lands BEFORE Stories 6.4 + 6.6 (which consume these components).

## Acceptance Criteria

**AC1 — `<CommandPreview>` at `src/components/capstone-bootstrap/command-preview.tsx`**
- Props: `{ command: string, args: Array<string | { flag: string } | { value: string }>, className?: string }`. The `args` prop is structured (not just a string list) so the renderer can syntax-highlight flags vs values.
- Layout: `<div class="bg-surface-sunken border border-border rounded-md p-4 font-mono text-sm leading-relaxed text-text-primary overflow-x-auto relative group">`
  - Inner: rendered command text. Each arg rendered with appropriate token color:
    - Plain string: `text-text-primary`.
    - `{ flag: '...' }` (e.g., `--directory`): `text-info`.
    - `{ value: '...' }` (e.g., `~/projects/my-repo`): `text-success`.
  - Backslash + newline rendered between args for readability (matches the visualizer's command preview).
  - Trailing copy button: `<Button variant="ghost" size="sm" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-fast"><Copy class="w-3.5 h-3.5" /></Button>`. Click copies the rendered command string (without coloring) to clipboard via `navigator.clipboard.writeText(...)`.
- Variants:
  - Default: as above.
  - Compact: single-line; no line breaks; no per-arg coloring (just monospace text). Used in inline contexts where the command is reference-only.
- Reduced-motion: copy-button reveal becomes instant.

**AC2 — `<ProgressStreamPanel>` at `src/components/capstone-bootstrap/progress-stream-panel.tsx`**
Per `ux-design.md` §"Component Strategy → `<ProgressStreamPanel>`":
- Props:
  ```ts
  interface ProgressStreamPanelProps {
    title: string;                          // "Bootstrapping your team repo at ~/projects/checkout-redesign/"
    subtitle?: string;                      // "Running the BMAD installer. Total time ≈ 30-90 seconds."
    progress: number;                       // 0-100; 100 = complete
    elapsedMs: number;                      // for the status row
    streamLines: Array<{ stream: 'stdout' | 'stderr', text: string, timestamp: string }>;
    status: 'running' | 'success' | 'error' | 'aborted';
    onAbort?: () => void;
    onShowFullOutput?: () => void;
    onRetry?: () => void;
    children?: ReactNode;                   // for embedding the <CommandPreview>
  }
  ```
- Layout (per visualizer Mockup 4):
  - Outer: `<div class="bg-surface border border-border rounded-md p-6 space-y-4">`.
  - Header: `<h3 class="text-lg font-semibold text-text-primary">{title}</h3>` + subtitle in `text-text-secondary`.
  - Optional `{children}` slot for `<CommandPreview>`.
  - Progress bar (Story 11.1's `<Progress>` foundation): `<Progress value={progress} class="h-1" />` — animated shimmer when status is `'running'` (a `data-state="active"` attribute drives the shimmer keyframe).
  - Status row: `<div class="flex justify-between text-sm text-text-secondary"><span>{statusText}</span><span>{formatElapsed(elapsedMs)}</span></div>` where `statusText` is `'Installing BMAD scaffolding... ' + progress + '%'` (running) / `'Completed in ' + formatElapsed(elapsedMs)` (success) / `'Failed'` (error) / `'Cancelled'` (aborted).
  - Stream output panel: `<pre class="bg-surface-sunken border border-border rounded-md p-3 font-mono text-xs leading-relaxed max-h-[160px] overflow-y-auto" aria-live="polite">`. Each line: `<span class="text-text-secondary [&[data-stream=stderr]]:text-warning">[{timestamp}] {stream}: {text}</span><br />`.
  - Footer button row: `<div class="flex gap-2 pt-2">`
    - "Show full output" → calls `onShowFullOutput`.
    - When status is `'running'` AND `onAbort` is provided: `<Button variant="ghost" class="text-error">Abort & clean up</Button>`.
    - When status is `'error'` AND `onRetry` is provided: `<Button variant="secondary">Retry</Button>`.
- Reduced-motion: progress-bar shimmer becomes static.

**AC3 — `<FileTree>` at `src/components/capstone-bootstrap/file-tree.tsx`**
Per `ux-design.md` §"Component Strategy → `<FileTree>`":
- Props:
  ```ts
  type FileNode = {
    name: string;
    type: 'file' | 'dir';
    sizeBytes?: number;     // files only
    children?: FileNode[];  // dirs only
    target?: string;        // symlinks rendered as "<name> -> <target>"
  };
  interface FileTreeProps {
    root: FileNode;
    maxDepth?: number;      // default 3
    initialCollapsed?: string[]; // dir names to default-collapse, e.g. ['.git']
    className?: string;
  }
  ```
- Layout: recursive list rendering with indentation by depth.
- Each entry:
  - File: `<li class="flex items-center gap-1.5 py-0.5 text-sm font-mono"><FileIcon class="w-3.5 h-3.5 text-text-muted" /><span>{name}</span><span class="text-xs text-text-muted ml-auto">{formatSize(sizeBytes)}</span></li>`.
  - Dir: `<li>` containing a `<button>` toggle (Radix Collapsible) showing the dir name + caret + child count; when expanded, recursively renders children indented.
  - Symlink: rendered as file with a subtle arrow + target: `<span>{name}</span><span class="text-text-muted">→ {target}</span>`.
- Excluded patterns (per spec): `node_modules/`, `.next/`, `*.log` rendered grayed-out OR omitted entirely (default: omitted; configurable via prop in v1.1).
- Permission errors during traversal: not relevant for the visual component — the parent (Story 6.6) handles fs traversal and passes a clean `root` tree as a prop.
- Reduced-motion: collapsible expand/collapse becomes instant per the global rule.

**AC4 — Vitest unit coverage**
- One test file per component.
- `<CommandPreview>`: render with mixed args; assert flag args have `text-info` class; value args have `text-success` class; copy button click invokes `navigator.clipboard.writeText` (mocked) with the unstyled text.
- `<ProgressStreamPanel>`: render with each status; assert appropriate buttons render conditionally (Abort only when running + onAbort provided; Retry only when error + onRetry provided); progress-bar value matches prop.
- `<FileTree>`: render a 3-level deep fixture tree; assert depth limit respected; assert `.git/` is collapsed by default when in `initialCollapsed` prop; assert symlinks render with arrow.

**AC5 — Visualizer-fidelity Playwright spec**
- `tests/e2e/bootstrap-surface-visuals.spec.ts` — uses a test-only route at `/__test__/bootstrap-visuals` (env-var-gated, same pattern as Story 11.4's chat-visuals route).
- Asserts each component renders correctly in light + dark themes with sample props.

**AC6 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — `<CommandPreview>` (AC1)** — structured args + per-arg coloring + copy button.
- [ ] **Task 2 — `<ProgressStreamPanel>` (AC2)** — composed layout consuming Story 11.1's `<Progress>`.
- [ ] **Task 3 — `<FileTree>` (AC3)** — recursive renderer with depth limit + symlink + Radix Collapsible per dir.
- [ ] **Task 4 — Vitest unit coverage (AC4)**.
- [ ] **Task 5 — Test-only route + Playwright spec (AC5)**.
- [ ] **Task 6 — Quad gate clean (AC6)**.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 388 — `src/components/` for shared components.

**PRD references:**
- FR-3.9 line 528 — install-command transparency.
- FR-3.13 line 535 — post-bootstrap pause + file tree + git log + verbose-output panel.
- FR-3.20 line 545 — streaming + cancel.

**Design spec references:**
- §"Component Strategy → Load-bearing custom components → `<ProgressStreamPanel>`" — full spec.
- §"Component Strategy → 14 remaining custom components" — `<CommandPreview>` + `<FileTree>` one-line specs.
- §"UX Consistency Patterns → Feedback Patterns → Status row" — guides the progress bar + status row composition.
- Visualizer Mockup 4 — exact rendered design.

**Why structured `args` prop (not a single command string):**

Per-arg syntax highlighting (flag in info color, value in success color) is the spec's lock for `<CommandPreview>`. Passing a single string would force the component to parse argv at render time, which is fragile (paths with spaces, escape characters). Structured props move the parsing to the caller (Story 6.4), where the argv is already structured because that story authored it.

**Why `<FileTree>` is recursive client-rendering:**

The tree could be flat-rendered server-side, but the Radix Collapsible per-dir folding requires client interactivity. Component is a Client Component. Server-side fetch of the tree (Story 6.6) → JSON-serialized prop → client-side recursive render.

**Defensible deviations:**
- The "Abort & clean up" button's destructive variant is rendered as `variant="ghost"` with `text-error` rather than `variant="destructive"` — visually less heavy in this in-progress context (where the trainee is in a run-flow, not a confirmation gate). The TYPED-CONFIRM modal for abort (Story 6.5) uses the full `destructive` variant. Two visual weights for two contexts.

**No-egress / runtime-fs sanity:**
- Components render based on props; no network or fs touches. NFR-S1 holds.
- The clipboard write in `<CommandPreview>` is a browser API call; not a network request.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/components/capstone-bootstrap/command-preview.tsx` + `.test.tsx`
- `src/components/capstone-bootstrap/progress-stream-panel.tsx` + `.test.tsx`
- `src/components/capstone-bootstrap/file-tree.tsx` + `.test.tsx`
- `src/components/capstone-bootstrap/README.md` (one-line pointer)
- `src/app/__test__/bootstrap-visuals/page.tsx` (env-var-gated test route)
- `tests/e2e/bootstrap-surface-visuals.spec.ts`
- `_bmad-output/implementation-artifacts/11-5-bootstrap-surface-visual-components.md` (this file)

## Change Log

- 2026-05-08 — Story file authored from `ux-design.md` §"Component Strategy" + visualizer Mockup 4 + FR-3.9/3.13.
