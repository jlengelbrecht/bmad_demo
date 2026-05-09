# Epic 5 + Epic 6 Retrospective — Capstone Runtime + Setup/Bootstrap

**Date:** 2026-05-09
**Epics:** 5 (Capstone Runtime) + 6 (Setup Wizard + Bootstrap), retro'd jointly because they shipped in the same Friday-night autonomous push and share lessons.
**Status:** ✅ All 13 stories `done` (Epic 5 = 5.1–5.7, Epic 6 = 6.1–6.6)
**Format:** Solo-developer retro (theatrical multi-agent dialogue compressed to a useful synthesis)

---

## Delivery Snapshot

| Story | Title | Notes |
|---|---|---|
| 5.1 | `runStreaming` subprocess primitive + tracked-children registry | NFR-S4 invariants 1-7 codified; 13 subprocess tests |
| 5.2 | `ToolAdapter` interface, supporting types, registry | Stub-first pattern; 18 adapter tests |
| 5.3 | claude-code adapter (first concrete proof) | Q-Tech-1 argv verbatim; 22 unit cases; integration spec gated `RUN_ADAPTER_INTEGRATION=1` |
| 5.4 | codex adapter | Pattern-replay from 5.3 |
| 5.5 | github-copilot adapter (third concrete proof — exposed an abstraction seam) | First adapter where `formatUserMessage` returns `""` (argv-driven, not stdin-driven) |
| 5.6 | `POST /api/capstone/setup/preflight` | Environment probe; node/git/npx/tool checks |
| 5.7 | `GET /api/capstone/chat/[sessionId]/stream` + `onSpawn` | SSE Route Handler; first real consumer of `runStreaming`; required `onSpawn` callback to capture child handle for stdin writes |
| 6.1 | `/capstone/setup` tool selection + auth precheck | Three concrete adapter manifests render here |
| 6.2 | `/capstone/setup/wizard` six-step wizard | Multi-step navigation, no real backing yet |
| 6.3 | `path-validate` Route Handler + allowlist module | `BLOCKED_HOME_PREFIXES` + `BLOCKED_ABSOLUTE_PREFIXES` + dotfile-segment heuristic + cwd-self-block |
| 6.4 | `/capstone/setup/bootstrap` page + npx-install streaming endpoint | Two routes (kick-off + stream); `bmad-version.ts` pin lookup |
| 6.5 | abort + cleanup wiring | Tracked-children `findChildren` predicate; `aborted-` sentinel in DB CHECK |
| 6.6 | post-bootstrap pause + "what BMAD just did" explainer | File-tree probe + explainer markdown |

**Test net at end of session:** 362 unit · 27 e2e · lint clean · lint:links clean (Epic 4 close was 132 unit / 23 e2e). Epics 5+6 alone added ~230 unit cases — by far the biggest jump in any single push.

**Lines added across both epics:** ~5,500 production + ~2,400 test (rough numbers from `git diff --stat 013162c..ffa9f6a`).

---

## Follow-through on Epic 3 retro action items

| # | Action | Status |
|---|---|---|
| A1 | Shared FS helper extraction | ❌ **Not addressed** — Epic 6's bootstrap module re-used the file-walking pattern (`file-tree.ts`, `build-install-command.ts`, `path-allowlist.ts`); the helper still hasn't been extracted. Defensible — the shapes diverged enough that one helper would have been Procrustean — but worth re-evaluating now that the patterns are visible. |
| A3 | Architecture↔epics drift sweep | ✅ **Done** — Story 10.1b landed an architecture-doc drift fix pass for Epic 5+ contracts. Subprocess discipline + threat model + Capstone Runtime sections were added in `59eaa69`. |
| B1 | "Production-build robustness" patches require evidence before landing | ✅ **Held** — no review-patch-introduced regressions this push. The reverse problem appeared instead (see What didn't, item 3). |
| B2 | E2E body-matching helpers | ⏳ **N/A this push** — no new progress-write callers landed in Epics 5+6; capstone progress writes happen via `recordCapstoneToolSessionId` and `recordCapstoneTargetDir` which don't go through `POST /api/progress`. |
| B3 | Epic 2 retroactive retro | ❌ **Skipped** — superseded by the urgency of the Friday push. Lessons from Epic 2 are now further from view. Carry forward as low-priority. |

**Net:** 1 done, 1 partial, 3 unaddressed. Lower follow-through than Epic 3 retro — explained by the autonomous-push mode (see Patterns).

---

## What went well

**1. NFR-S4 invariants 1–7 codified, not commented at.**
Story 5.1's `run-streaming.ts` lists the seven invariants in the function-level docstring AND each invariant has a numbered comment at the line that enforces it. Stories 5.7, 6.4, 6.5, plus the test-gate code in phase-done all consume `runStreaming` without re-implementing pipe-draining or signal handling. The primitive paid for itself within the same epic.

**2. Stub-first adapter rollout was the right shape.**
Story 5.2 landed the interface with three throwing stubs that named which story would replace them (`'Adapter codex not yet implemented — see Story 5.4'`). Stories 5.3/5.4/5.5 then promoted them one at a time. By 5.5 (github-copilot) the abstraction had been exercised three times across two genuinely different tool surfaces (Claude Code = stdin-driven JSON stream, Copilot = argv-driven with a `.github/` primer file). The `formatUserMessage() === ""` opt-out was discovered during 5.5, not invented up front. Architecture's "rule of three" honored.

**3. Path allowlist module composable across surfaces.**
`path-allowlist.ts` is plain functions over `(rawPath, homedir, cwd)`. Three Route Handlers use it (`path-validate`, `bootstrap`, and now `chat-stream` after the post-push fix). Pure-function shape made the Story 5.7 fix mechanical: import + call + branch on result. No "platform service" layer needed.

**4. Real adapter manifests rendered the wizard correctly first try.**
Story 6.1 reads `adapter.manifest` directly to render the tool-pick step. Because Stories 5.3/5.4/5.5 had landed real manifests with real install hints, Story 6.1's UI had real content to render at first paint — no placeholder-then-replace cycle. The seam between Epic 5 (manifests) and Epic 6 (UI) was thinner than the epic boundary suggested.

**5. Tracked-children registry's metadata seam landed at the right time.**
Story 5.1 added `metadata?: ChildMetadata` reserved for a "future Story 6.5" use case (abort by tag). Story 6.5 actually used it — `findChildren(meta => meta?.kind === 'bootstrap')`. The reservation wasn't speculative; it shipped on its expected schedule. Worth distinguishing this from premature abstraction.

**6. Cross-platform NFR-S7 honored in path-allowlist.**
Architecture said "macOS/Linux/WSL2"; `BLOCKED_HOME_PREFIXES` covers `Library` (macOS) alongside `.ssh`/`.aws`/`.config`. The dotfile-style segment heuristic catches the long tail without an exhaustive enumeration. Tests on `/tmp/has\0nul` and 4097-char paths pin both NUL and length bounds.

**7. Quad gate stayed green throughout the push.**
Despite ~5,500 lines of new production code across 13 stories, the gate didn't go red between commits. The `if-test-fails-stop` discipline held — confirmed by walking each commit's footer line, all of which include a green-gate report.

---

## What didn't go well

**1. Dev Agent Records empty for ten of thirteen stories.**
Stories 5.1, 5.2, 5.3 have full Implementation Plan / Debug Log / Completion Notes. Stories 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6 all show the placeholder `_To be filled in by the dev agent at implementation time._`. This is the **largest process drift in the project so far** — the autonomous push optimized for code-output throughput and skipped the agent record. Consequence: this retro had to lean on commit messages and the structural walkthrough rather than the dev's own narration of struggle/breakthrough/decision. The story files exist; their reflective sections don't.

**2. Quad gate did not catch four real bugs that the post-push walkthrough did.**
- `import.meta.dirname` undefined under Turbopack — broke chat-stream module evaluation in dev (HTTP 500). Vitest populates `import.meta.dirname`, so unit tests passed. **Same bug pattern Epic 3 retro flagged in `connection.ts`** — yet four production sites (claude-code, codex, github-copilot, handoff/render) shipped without the fallback.
- `<form encType="application/json">` on the handoff page (Story 9.2) — silently posts urlencoded; the route's `req.json()` always 400'd. No e2e covered the handoff page.
- `legacyStepName('dev-story-1.1')` collapsed onto `adr` row (Story 7a.3) — completing the dev story silently overwrote the ADR completion. Tests passed because both rows are valid.
- chat-stream Route Handler (Story 5.7) accepted arbitrary absolute `chosenDir` and wrote `.github/copilot-instructions.md` there without re-checking the allowlist. The wizard validated upstream; the Route Handler didn't.

All four were fixed on `fix/checkpoint-walkthrough-punchlist` (commits `416f566` + `0b18594`), with Playwright-driven verification of the handoff button and curl checks of the allowlist guard. **The retro lesson:** the quad gate is necessary but insufficient. Dev-server smoke + at least one real-browser walkthrough per epic catches a different failure class.

**3. E2E specs deferred wholesale.**
Nine planned Playwright specs (chat-stream, tool-selection, wizard, path-picker, bootstrap, abort, complete, chat-page, dev-story phase) were deferred this session. The unit suite covers Route Handlers + reducers; the e2es land "when we wire the stub-adapter env-var path." Right call given push constraints, but the four bugs above all live in surfaces an e2e would have walked. The `import.meta.dirname` bug specifically would have failed any e2e that actually loaded the chat page in dev.

**4. The Story 5.7 sessionId regex was permissive in a way no test covered.**
`^(new|[a-zA-Z0-9_-]+)$` accepted `"foo-bar-baz"` as a sessionId, which was used as a directory name (`data/capstone-sessions/foo-bar-baz/`). Path traversal was blocked by the regex (no `.` or `/`), but the inconsistency with `phase-done` and `handoff` (both `^\d{8}T\d{6}Z$`) meant the chat-stream route could mint arbitrary session directories. The Story 5.7 tests asserted `^(new|...)` worked but didn't gate against the wider variant. Tightened post-walkthrough.

**5. Adapter integration tests are env-gated and still unrun.**
Stories 5.3, 5.4, 5.5 each landed an `*.integration.test.ts` gated on `RUN_ADAPTER_INTEGRATION=1` plus a real binary. None has actually executed. The unit tests stub `runStreaming`, so what we've verified is "the adapter parses what we *think* the tool emits." The first time a real `claude` / `codex` / `gh copilot` binary speaks to these adapters, we'll discover whether Q-Tech-1's argv shape and the JSON event vocabularies match reality. CI matrix entry + binary availability is the gate.

**6. Bootstrap integration test (Story 6.4) likewise unrun.**
`RUN_BOOTSTRAP_INTEGRATION=1` would actually invoke `npx bmad-method install` against a tmp dir. Currently mocked. The bmad-version pin lookup, the install command builder, the streaming-output parser, and the npx-stub fixture in `tests/fixtures/` are all proven against a stub. The first real npx run against a clean directory is a future surprise generator.

**7. Native folder dialog (Story 6.3) is a documented placeholder.**
The `/api/capstone/setup/native-folder-dialog/route.ts` was on the file list of Story 6.3 but the actual osascript / zenity invocation was deferred. Trainees on macOS/Linux currently type the path; the native dialog is on the deferred list. Acceptable for v1; called out so it doesn't quietly miss the v1.1 cut.

**8. Session-lock helpers + heartbeat (Story 6.1 AC6) not wired.**
Two-tab lock semantics need session heartbeats + TTL eviction. The schema's `capstone-session-lock` kind exists; the helpers don't. A trainee who opens the wizard in two tabs gets two parallel sessions. Low risk for solo-trainee usage, but architecturally promised.

---

## Patterns + lessons

| Pattern | Where it surfaced | Take-away |
|---|---|---|
| Autonomous push trades introspection for throughput | 10/13 Dev Agent Records empty | When running multi-story push, pre-commit a "fill the agent record" step or accept that the next retro will lean on commit messages — but don't pretend you'll fill them later. You won't. |
| Same Turbopack `import.meta.dirname` bug shipped in 4 new files after Epic 3 retro flagged the pattern | claude-code.ts, codex.ts, github-copilot.ts, handoff/render.ts | A retro lesson without a lint rule or template doesn't propagate. Either add an ESLint rule banning unguarded `import.meta.dirname` in App-Router server modules, or template the fallback in CLAUDE.md. |
| Quad gate is necessary but insufficient | The four post-push bugs | Add "drive at least one new surface in a real browser before declaring an epic done" to the discipline. Vitest passing ≠ browser working. |
| Stub-first abstraction discovers seams the spec doesn't | Story 5.5's `formatUserMessage() === ""` opt-out for argv-driven Copilot | The third concrete proof is what exposes the abstraction's blind spots. Architecture's "rule of three" is empirically right. |
| Reserved-for-future seams are OK if the future story actually uses them | `metadata?: ChildMetadata` reserved in 5.1, used in 6.5 | Distinguishable from premature abstraction by checking the spec — was the use case named in the reserved field's docstring? Yes here. |
| Unsatisfiable shape requirements waste gate cycles | `dev-story-1.1` shape gate requires `.bmad/story-1.1-tests.txt` (nothing writes it) | When a gate requires an artifact, also identify the writer; or drop the shape requirement and gate on the runtime check (here, npm test exit code) |
| Permissive regex at the route boundary creates downstream divergence | Story 5.7's `^(new|[a-zA-Z0-9_-]+)$` vs phase-done's `^\d{8}T\d{6}Z$` | When the same logical id flows through multiple Route Handlers, they should share a regex (or a Zod schema). Inconsistency is a smell even when not exploitable. |
| Allowlist re-checks must happen at every Route Handler that consumes the path | Story 5.7 missed it; wizard validated upstream | "Validation is the job of the boundary that uses the data, not the boundary that received it." Every Route Handler that writes under `chosenDir` must re-call `isPathAllowed`. |

---

## Action items

### Carried forward
| # | Action | Status |
|---|---|---|
| A1 | Shared FS helper extraction | **Re-evaluate, don't auto-carry** — bootstrap modules' shapes diverged enough that one helper would have been Procrustean. Drop unless the next epic surfaces a true repeat. |
| B3 | Epic 2 retro retroactively | **Drop** — too far in the past to be useful. |

### New from Epic 5+6
| # | Action | Owner | Where it lands |
|---|---|---|---|
| C1 | Lint rule (or template snippet in CLAUDE.md) banning unguarded `import.meta.dirname` in App-Router server modules under `src/app/`, `src/lib/capstone/adapters/`, and `src/lib/capstone/handoff/` | Amelia | Before Epic 11 starts touching any new server modules |
| C2 | "Browser walkthrough before epic-done" checklist item: drive at least one new surface end-to-end in a real browser (Playwright MCP or manual) before marking the epic complete | Amelia | Apply at Epic 11 close; document in the next session-state file |
| C3 | When running an autonomous push that sequences ≥ N stories, either fill Dev Agent Records as you go OR commit to a synthesized "push journal" at the end of the push | Amelia | Apply at next autonomous push |
| C4 | Wire the env-gated adapter integration tests into CI (Vela + GitHub Actions matrix entry) once at least one real binary is available on the CI runner | Amelia | Cross-cuts Epic 11 work; can land independently |
| C5 | Run the bootstrap integration test (Story 6.4) at least once manually against a clean tmp dir on the dev box, to surface whatever the npx-stub doesn't model | Amelia | Pre-handoff smoke; before any v1 demo |
| C6 | Decide v1 fate of native folder dialog (Story 6.3) and session-lock helpers (Story 6.1 AC6) — either schedule into Epic 11 or defer to a `v1.1` queue file | Amelia / {user_name} | Epic 11 kickoff |
| C7 | When two Route Handlers handle the "same logical id" (capstone session id), share the regex via a Zod schema in `src/lib/db/schemas.ts`. Audit other id types (`CAPSTONE_TOOL_SESSION_ID` etc.) for similar duplication | Amelia | Opportunistic; surface during Epic 11 work |

### From the post-push structural walkthrough (already shipped)
All four walkthrough findings landed on branch `fix/checkpoint-walkthrough-punchlist` (commits `416f566` + `0b18594`):
- Item 1: handoff form switched to client-side fetch + `router.refresh()`
- Item 2: `dev-story-1.1` no longer collides with `adr` step row
- Item 3: chat-stream re-checks allowlist
- Item 4: `dev-story-1.1` shape gate dropped (test gate is the gate)
- Item 5: dead `void readFileSync` deleted
- Item 6: `runTestGate` collected output sliding-windowed
- Items 7–10: HMR exit-listener leak, dup-`exit` guard in run-streaming, tool-default-lying, sessionId regex tightened
- Bonus: `import.meta.dirname` Turbopack fallback applied to four production files

Branch is ready for merge to `main` at the user's discretion.

---

## Significant discovery — does it require updating Epic 11?

**Likely no, but worth confirming.** Epic 11 (UI polish + theming, 7 stories) is design-system work — foundation tokens, audience cards rewrite, lesson typography, chat surface visuals, bootstrap surface visuals, motion system, design QA. It does not introduce new Route Handlers, new subprocess consumers, or new path-validation surfaces. The four post-push bugs were all in functional surfaces, not visual-design surfaces.

**But:** Epic 11 will *touch* the chat surface visuals (Story 11.4) and bootstrap surface visuals (Story 11.5). When those land, re-run the chat-stream and bootstrap routes in a real browser end-to-end (per action item C2), not just verify visuals against snapshots.

---

## Epic 11 prep

**Epic 11 — UI polish + theming.** Stories per `epics.md`:
- 11.1: Foundation tokens + theme
- 11.2: Audience cards + home rewrite
- 11.3: Lesson typography pass
- 11.4: Chat surface visual components
- 11.5: Bootstrap surface visual components
- 11.6: Motion system implementation
- 11.7: Design system QA

**Dependencies on Epics 5+6 (and the surrounding work):**
- ✅ Chat thread component (Story 7a.1's `chat-thread.tsx`) is reachable end-to-end after the punch-list fixes — Epic 11.4 can iterate on real markup, not placeholder
- ✅ Bootstrap page + bootstrap-runner (Story 6.4) are real surfaces that Epic 11.5 can theme directly
- ✅ Wizard (Story 6.2) renders all six steps with real adapter manifests — Epic 11 has a target
- 🔶 Handoff page (Story 9.2) was broken pre-fix; now functional. If Epic 11 wants to touch its visuals, it will be on a working base.

**Likely friction points (predictions to revisit at Epic 11 retro):**
- The Cargill-skinnable theming choice (per project memory) means tokens need to be parameterized at a layer above raw Tailwind. CSS variables + a Tailwind plugin shape vs theming via class swap — Story 11.1 is the design-decision moment.
- Motion system (Story 11.6) on top of streaming UI (chat thread, bootstrap log tail) is non-trivial — animations on a `<pre>` that grows by line could fight with auto-scroll. Worth a spike.
- "Design system QA" (Story 11.7) is the natural home for the Epic 11 axe + contrast pass that's been deferred since Epic 1.

**Critical-path items before Story 11.1 kickoff:**
- **Merge `fix/checkpoint-walkthrough-punchlist` to `main`.** Epic 11's chat-surface and bootstrap-surface stories should be working from a known-good functional base.
- **(Optional) Address C5** — at least one manual bootstrap-integration run before Epic 11 visually iterates on the bootstrap page.

---

## Readiness assessment

| Dimension | Status |
|---|---|
| Story completion | ✅ All 13 Epic 5+6 stories `done` |
| Tests | ✅ 362/362 unit + 27/27 e2e + lint + lint:links all green (post fix branch) |
| Functional surfaces driven in browser | ⚠️ Handoff verified post-fix; chat-stream verified via curl + module-eval check; remaining surfaces (wizard, bootstrap, abort, complete) NOT driven in this session — see C2 |
| Deployment | ✅ Local-only by architecture; `npm run dev` works; quick smoke landed Page Title + zero console errors on `/`, `/capstone`, `/capstone/handoff/<seeded>` |
| Stakeholder acceptance | ✅ Solo-developer / Cargill internal use per project memory; no external stakeholder |
| Technical health | 🔶 Outstanding deferred items have explicit homes (adapter integration, bootstrap integration, native dialog, session-lock heartbeat); none block Epic 11 visual-design work |
| Documentation | 🔶 Story files complete BUT 10/13 lack Dev Agent Record contents — a real-but-quiet documentation debt. Captured as action item C3. |

**No epic update required for Epic 11.** Visual-design work proceeds on a functional foundation that — after the punch-list merge — is verifiably working end-to-end on at least the handoff surface.

---

## Closing

Epics 5 and 6 doubled the codebase and tripled the test suite in a single push. The autonomous mode delivered the throughput it promised, at the cost of in-process introspection (10/13 empty Dev Agent Records) and a class of bugs that the quad gate was structurally incapable of catching (`import.meta.dirname` under Turbopack, broken HTML form encoding, schema-row collisions, missing re-validation at Route Handler boundaries). The structural walkthrough caught all of them; the Playwright drive validated the handoff fix end-to-end and surfaced the chat-stream module-evaluation 500 that the unit gate had missed entirely.

**The most actionable lesson:** "the quad gate stayed green" is a different statement from "the system works." Add a real-browser smoke per epic (action item C2) and retire `import.meta.dirname` foot-guns at the lint layer (C1). Then the next autonomous push won't bequeath a punch list to its successor.

Onward to Epic 11 — but merge the fix branch first.
