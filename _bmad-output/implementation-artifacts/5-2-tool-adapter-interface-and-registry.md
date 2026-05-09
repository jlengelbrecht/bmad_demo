# Story 5.2: `ToolAdapter` interface, supporting types, and adapter registry

**Epic:** 5 — Capstone Runtime Foundation
**Story Key:** 5-2-tool-adapter-interface-and-registry
**Status:** ready-for-dev

## Story

As the developer landing the AI Tool Abstraction Layer (PRD §FR-3.25 / architecture §"Capstone Runtime → AI Tool Abstraction Layer"),
I want the `ToolAdapter` interface, its supporting types, and a registry module that exposes adapters as `Map<id, ToolAdapter>`,
So that the three concrete adapter stories (5.3 claude-code, 5.4 codex, 5.5 github-copilot) implement against a stable, reviewed contract — and the setup wizard (Epic 6) plus chat-stream Route Handler (Story 5.7) can consume "the list of supported tools" as a single import without each call site re-deriving it.

## Acceptance Criteria

**AC1 — `src/lib/capstone/adapters/types.ts` exports the `ToolAdapter` interface verbatim from architecture lines 257-260**
- The exported interface matches the architecture's hybrid declarative-manifest + imperative-method shape:
  ```ts
  export type ToolId = 'claude-code' | 'codex' | 'github-copilot';

  export interface ToolManifest {
    id: ToolId;
    displayName: string;
    cliBinary: string;
    minVersion: string;        // semver range (e.g., '>=2.1.0')
    docsUrl: string;
    supportedOS: ('darwin' | 'linux')[];
  }

  export type CapstonePhase =
    | 'brief'
    | 'prd'
    | 'architecture'
    | 'epics-and-stories'
    | 'adr'
    | 'dev-story-1.1';

  export interface ChatSpawnOpts {
    chosenDir: string;        // CHOSEN_DIR (the trainee's bootstrapped repo)
    sessionId: string;        // tool-native session id (or '' on first turn)
    primerPath: string;       // absolute path to the per-phase primer file
    userMessage: string;      // the trainee's typed message for this turn
    phase: CapstonePhase;
  }

  export type ChatStreamEvent =
    | { kind: 'session-init'; sessionId: string }    // first turn captures tool-native session id
    | { kind: 'message-delta'; text: string }        // partial text chunk for the current assistant turn
    | { kind: 'tool-call'; description: string }     // "▶ reading brief.md..." (anti-magic chat — FR-3.17)
    | { kind: 'message-end' }                        // assistant finished its turn
    | { kind: 'error'; message: string };

  export interface ToolAdapter {
    manifest: ToolManifest;
    detectInstalled(): Promise<boolean>;
    detectAuthenticated(): Promise<boolean>;
    buildSpawnArgs(opts: ChatSpawnOpts): { cmd: string; args: string[]; env?: NodeJS.ProcessEnv };
    parseStreamChunk(raw: string): ChatStreamEvent[];
    formatUserMessage(text: string): string;
    buildPrimer(phase: CapstonePhase): string;
  }
  ```
- The deviations from the architecture's interface signature (which writes `string[]` for `buildSpawnArgs`'s return) are:
  - Return shape is `{ cmd, args, env? }` not `string[]` — adapters need to control both the binary path AND environment (e.g., `claude-code` accepts `ANTHROPIC_API_KEY`, `codex` accepts `OPENAI_API_KEY`, `github-copilot` accepts `GH_TOKEN`). Returning argv only would force adapters to mutate `process.env`, which violates module purity and breaks test isolation. The expanded return shape is documented in the file's header comment AND in this story's Dev Notes as a defensible-deviation note.
  - `ToolId` is the literal-string union not the architecture's "claude-code | codex | github-copilot" inline; the architecture's text matches exactly.
- All exported types include a one-sentence JSDoc comment explaining the field's purpose; no implementation details, just contract.

**AC2 — `src/lib/capstone/adapters/index.ts` is the registry module**
- Exports a single named function: `getAdapterRegistry(): Map<ToolId, ToolAdapter>`.
- The map is constructed lazily on first call (memoized at module scope) — re-imports return the same map instance.
- The map is constructed by importing the three concrete adapter modules `claude-code.ts`, `codex.ts`, `github-copilot.ts` and reading their default-exported `ToolAdapter` instance.
- **Critically: stories 5.3 / 5.4 / 5.5 don't exist yet.** Story 5.2 lands the registry behind a "stub-adapters mode" that satisfies the type system without a concrete implementation:
  - At Story-5.2 implementation time, `claude-code.ts` / `codex.ts` / `github-copilot.ts` exist as **stub modules** that export a `ToolAdapter` whose every imperative method throws `Error('Adapter <id> not yet implemented — see Story 5.<N>')`.
  - The `manifest` field is fully populated (with verbatim values from architecture's "v1 Supported Tools" table at lines 266-269) so the registry's *static* surface is real even before the imperative surface is.
  - This lets Epic-6 / Story-5.7 stories land against the registry's shape without waiting on 5.3/5.4/5.5.
- Also exports a small helper `getAdapterById(id: ToolId): ToolAdapter` that throws if the id is not in the registry (defensive — TS narrowing means this should be unreachable in well-typed callers).

**AC3 — `src/lib/capstone/adapters/index.ts` is import-discipline-clean**
- No imports from `next/*`, `react`, `react-dom`, or `@/app/*`. The adapter registry is server-only library code; pulling in framework runtimes here would leak through to Server Components that import it.
- A Vitest smoke test (`index.smoke.test.ts`) asserts the import discipline by reading the file's source text and grepping for forbidden import patterns. Mirrors the pattern from Story 3.2's route-handler architecture-lock smoke.

**AC4 — Each stub adapter conforms to the interface**
- `claude-code.ts`, `codex.ts`, `github-copilot.ts` each `export default` a fully-typed `ToolAdapter` value.
- The `manifest` is populated per architecture's v1 Supported Tools table:
  - **claude-code:** `{ id: 'claude-code', displayName: 'Claude Code', cliBinary: 'claude', minVersion: '>=2.1.0', docsUrl: 'https://docs.claude.com/en/docs/claude-code', supportedOS: ['darwin','linux'] }`
  - **codex:** `{ id: 'codex', displayName: 'Codex (OpenAI)', cliBinary: 'codex', minVersion: '>=0.50.0', docsUrl: 'https://developers.openai.com/codex/cli', supportedOS: ['darwin','linux'] }`
  - **github-copilot:** `{ id: 'github-copilot', displayName: 'GitHub Copilot CLI', cliBinary: 'copilot', minVersion: '>=1.0.42', docsUrl: 'https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli', supportedOS: ['darwin','linux'] }`
  - The `minVersion` ranges are conservative defaults — the concrete adapter stories may tighten them based on actual `--version` output observed during their integration tests. The Story 5.2 stub manifests exist to unblock downstream type-checking, not to lock production minVersions.
- Each stub method throws with a message of the shape `'Adapter <id> not yet implemented — see Story 5.<N>'` where `<N>` is `3` for claude-code, `4` for codex, `5` for github-copilot.

**AC5 — Vitest coverage at `src/lib/capstone/adapters/index.test.ts`**
- `getAdapterRegistry returns a Map with exactly three entries keyed by ToolId values 'claude-code', 'codex', 'github-copilot'`.
- `getAdapterRegistry returns the same Map instance on repeated calls` (memoization smoke).
- `getAdapterById('claude-code') returns the claude-code adapter; its manifest.cliBinary === 'claude'`. (Same for the other two.)
- `getAdapterById with a fabricated invalid id throws with a clear message including the offending id`. (Type-cast required to call this — the test casts `as ToolId` to bypass TS so we can prove the runtime guard.)
- For each of the three stubs: `await adapter.detectInstalled()` rejects with the stub-error message; `adapter.buildSpawnArgs(...)` throws with the stub-error message. (Validates the stubs really do throw — protects against a future refactor that silently wires them to a no-op.)

**AC6 — Module surface smokes**
- A test asserts `adapters/index.ts` exports exactly `getAdapterRegistry` and `getAdapterById` (uses `Object.keys(...).sort()` against an `import * as registry`).
- A test asserts `adapters/types.ts` exports the named types/interfaces enumerated in AC1; types-only smoke uses `tsc --noEmit` against a synthetic test fixture file that imports each name (the file lives at `adapters/types.surface.test-d.ts` if `vitest-tsd` is in scope; otherwise the smoke is a `tsc --noEmit` step in CI's lint phase).
- A test asserts `adapters/types.ts` has zero runtime exports (i.e., `import * as Types from './types'` yields an empty object) — types-only file.

**AC7 — Lint, typecheck, quad gate**
- `npm run lint` clean.
- `tsc --noEmit` clean.
- `npm run test:unit` 100% green (existing tests + the new index/smoke specs).
- `npm run test:e2e` continues to pass (no e2e changes).
- `npm run lint:links` clean.

## Tasks/Subtasks

- [ ] **Task 1 — Scaffold `src/lib/capstone/adapters/` (AC1, AC2, AC4)** — create `types.ts`, `index.ts`, `claude-code.ts`, `codex.ts`, `github-copilot.ts`, plus the test files (`index.test.ts`, `index.smoke.test.ts`). Add a one-line `adapters/README.md` pointing readers at architecture §"Capstone Runtime → AI Tool Abstraction Layer" lines 254-269 + the per-tool implementation notes in lines 266-269.

- [ ] **Task 2 — `types.ts` first (AC1)** — write the type/interface block verbatim per AC1's signature. Include a 6-line header comment block explaining: (a) this is types-only (no runtime exports); (b) the `buildSpawnArgs` return-shape deviation from the architecture (object instead of `string[]`); (c) the `ChatStreamEvent` discriminated union maps to FR-3.17's anti-magic-chat surface (tool-call traces visible). Lock JSDoc on each public type/interface.

- [ ] **Task 3 — Stub adapter modules (AC4)** — implement `claude-code.ts`, `codex.ts`, `github-copilot.ts` with default-exported `ToolAdapter` values whose manifests are fully populated per AC4 and whose imperative methods all throw the stub-error pattern. Each file's header comment links to the future-implementation story.

- [ ] **Task 4 — Registry module (AC2, AC3)** — implement `index.ts` with `getAdapterRegistry()` (memoized) and `getAdapterById(id)`. Memoization uses a module-scope `let _registry: Map<ToolId, ToolAdapter> | null = null` plus a guard. The `Map` is built by destructuring the three default exports. The `getAdapterById` throws `Error('Unknown tool id: ' + id + ' — registered ids: claude-code, codex, github-copilot')`.

- [ ] **Task 5 — Vitest coverage (AC5, AC6)** — implement the seven cases in AC5 plus the three module-surface smokes in AC6. Use `vi.mock` only if necessary (the stubs throw real errors, so live calls are sufficient — `await expect(adapter.detectInstalled()).rejects.toThrow(/not yet implemented/)`). The "memoization smoke" uses `Object.is` to compare two registry references.

- [ ] **Task 6 — Import-discipline smoke (AC3)** — a test that reads `adapters/index.ts`, `claude-code.ts`, `codex.ts`, `github-copilot.ts`, and `types.ts` via `fs.readFileSync` and asserts none contain `from 'next` , `from 'react'`, `from '@/app/`. Mirrors Story 3.2's pattern; one paragraph in the test file explains the rationale (server-only library, must not pull framework runtime).

- [ ] **Task 7 — Quad gate clean (AC7)** — run `npm run lint`, `tsc --noEmit`, `npm run test:unit`, `npm run test:e2e`, `npm run lint:links`. The types-only surface in `types.ts` should produce zero `dist`/`build` output if accidentally compiled; confirm no lingering JS emit.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"Capstone Runtime → AI Tool Abstraction Layer" lines 254-262 — the `ToolAdapter` interface verbatim and the registry pattern (`Map<id, ToolAdapter>`).
- §"v1 Supported Tools" lines 266-269 — manifest values for claude-code / codex / github-copilot. AC4 lifts these directly.
- §"Folder Layout" lines 396-399 — `src/lib/capstone/adapters/{index.ts, types.ts, claude-code.ts, codex.ts, github-copilot.ts}` paths verbatim.
- §"API & Communication Patterns" line 232 — the chat-stream Route Handler at `/api/capstone/chat/[sessionId]/stream` is the eventual primary consumer; the `ChatSpawnOpts` shape needs to carry everything the Route Handler can produce from the URL/body + session state.

**PRD references** (`_bmad-output/planning-artifacts/prd.md`):
- FR-3.25 (v1 supported tools) line 562 — locks the three-tool set; AC1's `ToolId` literal union matches.
- FR-3.4 (curated v1 list with detection badges) line 520 — motivates `detectInstalled()` returning `Promise<boolean>` (not richer enum) — wizard renders ✓/✗ on the boolean.
- FR-3.5 (auth pre-check) line 521 — motivates `detectAuthenticated()`.
- FR-3.15 (chat surface proxies the AI tool) line 540 — motivates `buildSpawnArgs` + `parseStreamChunk` + `formatUserMessage`.
- FR-3.16 (cross-phase context = files on disk) line 541 — motivates `buildPrimer(phase)` returning per-phase markdown that instructs the agent to read prior artifacts from CHOSEN_DIR.
- FR-3.17 (anti-magic chat — tool calls visible) line 542 — motivates the `tool-call` variant of `ChatStreamEvent`.

**Brainstorm references** (`_bmad-output/brainstorming/brainstorming-session-2026-05-08-1953.md`):
- "2 adapters at v1, not 1" creative breakthrough (line 543) — motivates landing all three concrete adapters in Epic 5 so the abstraction is real, not aspirational. Story 5.2 is the contract; 5.3/5.4/5.5 are the proofs.
- F-CRIT-1 (adapter sandboxing) line 232 — surfaces in `buildSpawnArgs`'s job to inject the tool-native `--add-dir <CHOSEN_DIR>` (or equivalent) for each tool. Story 5.2 captures it via `ChatSpawnOpts.chosenDir`.

**Research references** (`_bmad-output/research/q-tech-decisions-2026-05-08.md`):
- Q-Tech-8 (adapter format) lines 347-383 — the hybrid manifest + class shape; AC1 implements this.
- Q-Tech-2/3/9 (per-tool CLI surfaces) lines 67-167 — the manifest values for cliBinary, minVersion, docsUrl trace to specific evidence rows in this section.
- Q-Tech-9 closing note (per-tool primer translation) — "per-adapter `buildPrimer()` method" is verbatim the contract this story locks at AC1.

**Defensible deviations from architecture verbatim:**

1. **`buildSpawnArgs` returns `{ cmd, args, env? }` not `string[]`.** Adapters control both the binary path AND tool-specific environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GH_TOKEN`). The architecture's interface in lines 257-260 shows `string[]`, but the same architecture's "per-tool implementation notes" (lines 267-269) reference `--bare`, `-C <CHOSEN_DIR>`, `--resume <session>` — ALL of which require the adapter to also know which env vars to pass. Returning argv-only would force adapters to mutate `process.env` (purity violation, test-isolation breakage) or expose env via a separate method (interface bloat). The structured-object return is the smallest honest contract. Architecture-doc edit is recommended after Story 5.2 lands; tracked as a follow-up.

2. **`ChatStreamEvent` is a discriminated union, not the architecture's unspecified type.** The architecture references `ChatStreamEvent` in `parseStreamChunk(raw: string): ChatStreamEvent[]` but doesn't define the type. Story 5.2 invents the shape with five variants (`session-init`, `message-delta`, `tool-call`, `message-end`, `error`) drawn from FR-3.17 (tool calls visible) and Q-Tech-1's stream-json events for Claude Code (`system/init`, `assistant/message_start`, `assistant/content_block_delta`, `assistant/message_stop`). The variants are deliberately tool-agnostic — Copilot's plain-text streaming (per Q-Tech research) maps to a sequence of `message-delta` events without `tool-call` events. Stories 5.3/5.4/5.5 may discover additional variants needed; if so, they extend the union via a story-specific addendum (rule of three before pre-emptive expansion).

3. **`ToolId` is a literal union, not an arbitrary string.** Locking three values means TypeScript catches typos at the registry call site (`getAdapterById('claude-coded')` is a compile error). v1.1 (per PRD §Growth Features line 160) may add OpenCode / Gemini; that's a one-line widen of the union and a registry add.

**Why stub adapters in Story 5.2 instead of waiting until 5.3/5.4/5.5:**

The session-state document (lines 119-129) commits Epic 5 to ship all three adapters, but the work is parallelizable: the contract (5.2) needs to land first so 5.3/5.4/5.5 have something to implement against. By landing fully-typed stubs in 5.2, downstream stories (Epic 6's wizard, Story 5.7's chat-stream Route Handler) can develop against the registry's *static* surface (`getAdapterRegistry()` returns three known ids; each manifest is queryable) without being blocked on the imperative surfaces. The stub-error messages identify the responsible story so a developer who hits one knows where the implementation lives.

**Why `getAdapterById` exists when TS narrowing should make it unreachable:**

Two reasons. (1) Runtime defense — if someone passes a string parsed from a URL or DB row that bypasses the type system, the explicit throw beats a silent `undefined` propagation. (2) Test affordance — AC5's "fabricated invalid id" case proves the guard works; without `getAdapterById`, the test would have to reach into the Map directly, which couples test to implementation detail.

**Test approach:**

- All cases run via Vitest with the Node environment. No DOM/JSX in this story.
- The import-discipline smoke uses `fs.readFileSync` over the source files at test time. Mirrors the pattern from Story 3.2's route-handler architecture-lock smoke. No new dev-dependency.
- The "stubs throw" test uses `await expect(adapter.detectInstalled()).rejects.toThrow(/not yet implemented/)` — confirms each stub is wired correctly.
- No e2e changes: the registry has no user-visible flow until Story 5.7 wires it into the chat-stream Route Handler.

**No-egress / runtime-fs sanity:**

- This story adds no network calls. NFR-S1 invariant holds.
- This story adds no filesystem writes. The registry is in-memory only.

**Architecture-doc drift check:**

- The architecture's interface in lines 257-260 will need a small edit to reflect the `buildSpawnArgs` return shape change (object instead of `string[]`). Track as a follow-up; not a blocker for Story 5.2 implementation.
- The architecture does not name `ChatStreamEvent`'s shape; Story 5.2 invents it. This is *additive*, not contradictory — no architecture-doc edit needed.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/lib/capstone/adapters/types.ts`
- `src/lib/capstone/adapters/index.ts`
- `src/lib/capstone/adapters/index.test.ts`
- `src/lib/capstone/adapters/index.smoke.test.ts`
- `src/lib/capstone/adapters/claude-code.ts` (stub — replaced fully by Story 5.3)
- `src/lib/capstone/adapters/codex.ts` (stub — replaced fully by Story 5.4)
- `src/lib/capstone/adapters/github-copilot.ts` (stub — replaced fully by Story 5.5)
- `src/lib/capstone/adapters/README.md` (one-liner pointer to architecture §"Capstone Runtime → AI Tool Abstraction Layer")
- `_bmad-output/implementation-artifacts/5-2-tool-adapter-interface-and-registry.md` (this file)

**Expected modified files:**
- None at story start.

## Change Log

- 2026-05-08 — Story file authored from session-state-2026-05-08-rebuild-planning.md §"Epic structure to author" + architecture §"Capstone Runtime → AI Tool Abstraction Layer" + research Q-Tech-8.
