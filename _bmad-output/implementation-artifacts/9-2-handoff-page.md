# Story 9.2: End-of-capstone handoff page

**Epic:** 9 — Handoff
**Story Key:** 9-2-handoff-page
**Status:** done

## Story

As the developer landing the trainee-facing end-of-capstone surface,
I want `/capstone/handoff/[sessionId]/page.tsx` to render a celebratory completion screen showing the produced HANDOFF.md, mark the capstone session complete in SQLite, and surface the optional push-to-remote helper as documented in HANDOFF.md (per End-1 — push is optional homework, NOT a capstone gate),
So that the trainee experiences a clear "done" moment with the artifacts they produced visible — and the path forward (push, share with team, run BMAD natively) is explicit instead of dropping them into a blank screen.

## Acceptance Criteria

**AC1 — Page exists at `src/app/capstone/handoff/[sessionId]/page.tsx`**
- Server Component. Reads `[sessionId]`. Validates the session is at Phase 8 complete (Phase 9 ready) — if not, redirect to `/capstone/chat/<sessionId>/<phase-still-incomplete>`.
- On first visit (when HANDOFF.md doesn't exist in CHOSEN_DIR), automatically POSTs to Story 9.1's generator and waits. (Server-side fetch from the page's render path; no client-side flicker.)
- After generation, marks the session complete via `markCapstoneSessionComplete(sessionId)` (Story 4.1's helper).
- Renders five regions:
  1. **Celebratory header** — "🎉 Capstone complete — your team-ready BMAD repo is at `<chosenDir>`" (the emoji is the only one used in the rendered output; the codebase-wide no-emoji-in-files rule is honored — this emoji is in a markdown TEMPLATE the trainee sees, not in committed code, and is the trainee's vibe-marker). On reflection: replace with a non-emoji "✓ Capstone complete" since this is rendered in the portal's own UI which is committed code. AMENDED: use plain "✓".
  2. **Artifacts list** — file paths + sizes for the produced artifacts (brief/PRD/architecture/epics/adr/story-1.1/HANDOFF.md). Linkified to `<chosenDir>/<file>`; click opens the file in trainee's editor (note: the link is `file://` per OS convention; some browsers block it but it surfaces the path for copy-paste).
  3. **HANDOFF.md preview** — rendered markdown of the generated HANDOFF.md (via the existing `<Markdown>` Server Component). Includes the post-capstone checklist + push instructions inline.
  4. **Push-helper interactive panel** — a disclosure: "Want help pushing to your team's GitHub org?" that shows the literal git commands from HANDOFF.md with a "Copy" button per command. Trainee fills in `<your-org>/<repo-name>` placeholders themselves; portal does NOT execute push (per End-1: push is the trainee's action, on their auth, in their terminal).
  5. **Back-to-portal nav** — "Back to capstone overview" → `/capstone`. The capstone session shows as completed in the overview.

**AC2 — `/capstone` overview page is updated to show completed sessions**
- Story 4.3 created the `/capstone` overview page (resume-or-start). Story 9.2 extends it: completed sessions appear in a "Past sessions" list with status `Complete`, the chosenDir path, the date completed, and a "View handoff" link to `/capstone/handoff/<sessionId>`.
- The list is paginated only if >5 sessions exist (rare for v1; documented).

**AC3 — Trainee can re-render HANDOFF.md from the page**
- A "Regenerate handoff" button in the celebratory header POSTs Story 9.1's generator. Useful if the trainee updated their CHOSEN_DIR (e.g., made changes after capstone) and wants the artifacts list refreshed.
- Spinner while in flight; full-page revalidate on success.

**AC4 — Vitest unit coverage**
- `handoff/[sessionId]/page.test.ts`: invalid sessionId → 404; pre-Phase-9 session → redirect; first visit auto-generates HANDOFF.md (mocks Story 9.1's generator); subsequent visits skip auto-generation; renders all five regions.
- `/capstone/page.test.ts` extension (Story 4.3 update): completed sessions appear in past-sessions list.

**AC5 — Playwright e2e at `tests/e2e/capstone-handoff-page.spec.ts`**
- Drives the full happy path: bootstrap → 6 phases → Phase 8 advance → lands on `/capstone/handoff/<id>` → HANDOFF.md rendered → "Regenerate" works → "Back to capstone overview" lands at `/capstone` with the session in past-sessions.
- Asserts the session row in SQLite has `completed_at !== null` (verified via test-only DB read).

**AC6 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Page Server Component (AC1)** — `handoff/[sessionId]/page.tsx`. Auto-generate-on-first-visit. Mark session complete.
- [ ] **Task 2 — Push-helper panel** — Client Component with copy-button per command. No actual subprocess invocation.
- [ ] **Task 3 — `/capstone` overview extension (AC2)** — past-sessions list. Story 4.3's existing logic widens.
- [ ] **Task 4 — "Regenerate handoff" button (AC3)** — Client Component triggering re-POST.
- [ ] **Task 5 — Vitest unit coverage (AC4)**.
- [ ] **Task 6 — Playwright e2e (AC5)**.
- [ ] **Task 7 — Quad gate clean (AC6)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 378 — `capstone/handoff/[sessionId]/page.tsx` verbatim.
- §"Frontend Architecture → Capstone resume mechanism" line 246 — past-session enumeration is part of the resume flow.

**PRD references:**
- FR-3.24 line 558 — HANDOFF.md doc + push instructions.
- FR-6.7 line 603 — same.

**Brainstorm references:**
- End-1 line 207 — push to remote = optional homework; portal does NOT execute push.
- End-3 lines 213-215 — handoff one-pager.

**Why portal does NOT execute push:**

Pushing to a remote requires the trainee's GitHub auth. The portal makes ZERO portal-originated remote calls (NFR-S1). Push is the trainee's action, in their terminal, with their credentials. The handoff page surfaces the commands; the trainee runs them. Per End-1's anti-portal-as-team-actor stance.

**Why auto-generate on first visit:**

The trainee's "I'm done" beat is clicking phase-done on Phase 8. Forcing them to ALSO click "Generate handoff" would add an unnecessary step. The auto-generate keeps the moment clean: phase-done click → land on celebratory page with everything ready.

**Why "Regenerate" button:**

Trainees who keep working in CHOSEN_DIR after capstone (extending their stories, etc.) may want a fresh HANDOFF.md reflecting current state. One button, idempotent. Documented in this story's Dev Notes.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/app/capstone/handoff/[sessionId]/page.tsx`
- `src/app/capstone/handoff/[sessionId]/page.test.ts`
- `src/app/capstone/handoff/[sessionId]/push-helper-panel.tsx`
- `src/app/capstone/handoff/[sessionId]/regenerate-button.tsx`
- `tests/e2e/capstone-handoff-page.spec.ts`
- `_bmad-output/implementation-artifacts/9-2-handoff-page.md` (this file)

**Expected modified files:**
- `src/app/capstone/page.tsx` (Story 4.3 — extends with past-sessions list)
- `src/app/capstone/page.test.ts`

## Change Log

- 2026-05-08 — Story file authored from FR-3.24/FR-6.7 + brainstorm End-1/3 + architecture lines 246/378.
