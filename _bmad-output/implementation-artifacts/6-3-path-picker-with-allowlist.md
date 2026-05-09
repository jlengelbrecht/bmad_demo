# Story 6.3: Path picker with allowlist + native dialog button

**Epic:** 6 — Setup Wizard + Bootstrap
**Story Key:** 6-3-path-picker-with-allowlist
**Status:** ready-for-dev

## Story

As the developer landing FR-3.7 (path picker = text input + Browse button), FR-3.8 (4-path existing-dir handling), and NFR-S7 (path-write allowlist),
I want a `<PathPicker>` Client Component plus a `POST /api/capstone/setup/path-validate` Route Handler that hard-refuses paths under sensitive locations (process.cwd, ~/.ssh, ~/.aws, etc.), distinguishes empty/random/git-repo target states, and offers an `osascript`/`zenity` native-dialog Browse button,
So that the wizard's step 2 cannot advance with a path that would corrupt the trainee's home directory, the portal's training repo, or an existing real git repo — and the trainee gets clear, distinct messages for each conflict path instead of a single generic refusal.

## Acceptance Criteria

**AC1 — `<PathPicker>` Client Component exists at `src/app/capstone/setup/wizard/path-picker.tsx`**
- Props: `{ value: string, onChange: (path: string, valid: boolean) => void, suggestedDefault?: string }`.
- Renders: text input (with the value), "Browse..." button (Linux/macOS only — feature-detected; on WSL2 the button is disabled with tooltip "Native folder dialog not supported on WSL2; type the path manually."), live validation status row.
- On every text change (debounced 300ms), POSTs to `/api/capstone/setup/path-validate` and renders the response. Calls `onChange(path, valid)` per response.
- On "Browse" click, POSTs to `POST /api/capstone/setup/native-folder-dialog` (separate Route Handler — see AC4) and on success populates the input with the chosen path.

**AC2 — `POST /api/capstone/setup/path-validate` Route Handler**
- Body: `{ path: string }`. Zod-validated (string, min 1, max 4096).
- Returns:
  ```ts
  {
    ok: true,
    valid: boolean,
    status: 'ok-empty' | 'ok-create' | 'warn-non-empty' | 'block-allowlist' | 'block-existing-git' | 'block-existing-bmad' | 'block-malformed' | 'block-unwritable',
    message: string,           // human-readable
    requiresTypedConfirm?: boolean,  // true for warn-non-empty
    resolvedPath?: string,     // absolute, normalized
  }
  ```
- Status decision tree (in order; first match wins):
  1. Path-string syntax invalid (NUL bytes, length > 4096) → `block-malformed`.
  2. Resolves (`path.resolve(os.homedir(), trimmed)` if relative) to a path AT OR UNDER any allowlist-block: `process.cwd()`, `~/.ssh`, `~/.aws`, `~/Library`, `~/.config`, `/etc`, `/usr`, `/var`, `/private`, `/System`, `~` (the home directory itself, exact match), or any path whose immediate-name starts with `.` (dotfile dir) → `block-allowlist`.
  3. Path does not exist → `ok-create`.
  4. Path exists, is a file (not a dir) → `block-malformed` ("must be a directory").
  5. Path exists, contains `_bmad/` (immediate child) → `block-existing-bmad`.
  6. Path exists, contains `.git/` (immediate child) → `block-existing-git`.
  7. Path exists, is empty (no entries; ignoring `.DS_Store`) → `ok-empty`.
  8. Path exists, is non-empty (contains random files/dirs that aren't `_bmad/`/`.git/`) → `warn-non-empty` with `requiresTypedConfirm: true`.
  9. Path exists, but is not writable by the current process (test via `fs.accessSync(path, fs.constants.W_OK)`) → `block-unwritable`.
- `valid` is `true` iff status is `ok-empty`, `ok-create`, or `warn-non-empty` (the warn case is valid but requires the wizard's typed-confirm step before bootstrap proceeds).
- Per-status message templates lifted from FR-3.8 + brainstorm Setup-7. Examples:
  - `block-allowlist`: `"This path is in a sensitive location (<resolved-prefix>) and is blocked. Pick a path under ~/projects/, ~/code/, or another working tree of yours."`
  - `block-existing-bmad`: `"This directory already contains a BMAD installation. Pick a fresh path."`
  - `block-existing-git`: `"This directory is already a git repository — protected. Pick a fresh path."`
  - `warn-non-empty`: `"This directory exists and contains files. Type the literal path '<resolved-path>' below to confirm you want to bootstrap into it anyway."`

**AC3 — Allowlist constants centralized**
- `src/lib/capstone/bootstrap/path-allowlist.ts` exports:
  - `BLOCKED_PREFIXES: readonly string[]` — the absolute-path prefixes from AC2 step 2.
  - `isPathAllowed(path: string, homedir: string, cwd: string): { allowed: boolean, reason?: string }` — pure function used by the Route Handler.
- The home directory placeholder is resolved at runtime per request (`os.homedir()`); the prefixes are templated and resolved per call. Vitest cases lock the per-prefix behavior.

**AC4 — `POST /api/capstone/setup/native-folder-dialog` Route Handler**
- No body. Returns `{ ok: true, path: string | null }` (null = user cancelled).
- Implementation:
  - On macOS (`process.platform === 'darwin'`): spawns `osascript` with the inline script `'choose folder with prompt "Pick the directory for your new BMAD-bootstrapped repo"'` via Story 5.1's `runStreaming`. Returns the parsed POSIX path (osascript returns HFS-style; convert via the `osascript`-side `POSIX path of` formatting).
  - On Linux (`process.platform === 'linux'` and not WSL2 detected via `/proc/version` containing `microsoft`): spawns `zenity --file-selection --directory --title='Pick directory for new BMAD repo'`. Returns stdout trimmed.
  - On WSL2 or unsupported platforms: returns `{ ok: false, error: 'Native folder dialog not supported on this platform' }` with status 400.
- 30-second timeout (the dialog is user-driven; cancelling via timeout is acceptable for the rare case the trainee leaves it open).
- Spawn invokes `runStreaming` with `cwd: os.homedir()` (the dialog has no cwd dependence).

**AC5 — Vitest unit coverage**
- `path-allowlist.test.ts`: each blocked-prefix triggers `block-allowlist`; relative paths resolve correctly against home; dotfile-dir detection; `~` exact-match block.
- `path-validate/route.test.ts`: the 9-step decision tree, one fixture per branch, using `mock-fs` or `fs.mkdtempSync`-based real-filesystem fixtures (test creates tmp dirs, exercises validation, cleans up). Uses `fs.mkdtempSync` to avoid mock-fs's known issues with newer Node versions.
- `native-folder-dialog/route.test.ts`: `runStreaming` mocked; macOS branch invoked; Linux branch invoked; WSL2 branch returns 400. Real-binary integration deferred — the dialog requires a windowing system that CI doesn't have; documented.
- `<PathPicker>.test.ts`: text-input change triggers debounced POST; "Browse" button POSTs and populates input; valid status maps to enabled Next; warn status reveals typed-confirm input.

**AC6 — Playwright e2e at `tests/e2e/capstone-setup-path-picker.spec.ts`**
- Drives the wizard step 2 with multiple inputs:
  - A blocked path (`~/.ssh`) → asserts `block-allowlist` message rendered + Next disabled.
  - A non-existent path (`/tmp/playwright-capstone-<random>`) → asserts `ok-create` + Next enabled.
  - A non-empty existing dir → asserts `warn-non-empty` + typed-confirm input revealed; typing the path enables Next.
- Browse-button test SKIPPED in CI (no windowing system); the test marks itself `test.skip(!hasDisplay, ...)`.

**AC7 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Allowlist module (AC3)** — `src/lib/capstone/bootstrap/path-allowlist.ts` + tests.
- [ ] **Task 2 — `path-validate` Route Handler (AC2)** — full decision tree; uses Story 6.3's allowlist + Node `fs` for existence/writability/contents probes. Real fs (no mock-fs).
- [ ] **Task 3 — `native-folder-dialog` Route Handler (AC4)** — platform branching; `runStreaming`-based subprocess.
- [ ] **Task 4 — `<PathPicker>` Client Component (AC1)** — debounced fetch; status-row rendering; warn typed-confirm.
- [ ] **Task 5 — Vitest unit coverage (AC5)**.
- [ ] **Task 6 — Playwright e2e (AC6)**.
- [ ] **Task 7 — Quad gate clean (AC7)**.

## Dev Notes

**Architecture references:**
- §"Authentication & Security → Path-write allowlist" lines 222 — verbatim allowlist enumeration.
- §"Capstone Threat Model" TM-2 line 309 — wizard-time enforcement IS the mitigation.
- §"API & Communication Patterns" line 232 — endpoint set; this story adds two new endpoints (path-validate, native-folder-dialog) — additive, consistent with the architecture's set.

**PRD references:**
- FR-3.7 line 526 — Browse button + native dialog. AC4 implements.
- FR-3.8 line 527 — 4-path existing-dir handling + allowlist. AC2's decision tree covers verbatim.
- NFR-S7 line 632 — path-write allowlist as architectural NFR.

**Brainstorm references:**
- F-CRIT-2 lines 236-238 — path picker allowlist. Story 6.3 IS this critical-design-change.
- Setup-7 lines 108-110 — 4-path existing-dir handling. AC2 covers all four.
- Setup-8 line 112 — hard refuse on existing real git repo.
- Setup-10 line 120 — text input + native-dialog button.

**Why a separate endpoint instead of inline-fs in the wizard's Client Component:**
Filesystem access from a client component is impossible (browser sandbox). The wizard MUST go through a Route Handler. Splitting validation into its own endpoint keeps `path-validate` independently testable and reuseable (Story 6.4's bootstrap orchestration calls it again pre-spawn as a defense-in-depth gate).

**Why platform branching server-side instead of a third-party library:**
`osascript` and `zenity` are pre-installed on every supported platform. Adding a dialog library (e.g., `dialog`, `node-folder-picker`) adds a transitive dep tree for one button. The two-branch implementation is ~20 lines.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/lib/capstone/bootstrap/path-allowlist.ts`
- `src/lib/capstone/bootstrap/path-allowlist.test.ts`
- `src/app/api/capstone/setup/path-validate/route.ts`
- `src/app/api/capstone/setup/path-validate/route.test.ts`
- `src/app/api/capstone/setup/native-folder-dialog/route.ts`
- `src/app/api/capstone/setup/native-folder-dialog/route.test.ts`
- `src/app/capstone/setup/wizard/path-picker.tsx`
- `src/app/capstone/setup/wizard/path-picker.test.ts`
- `tests/e2e/capstone-setup-path-picker.spec.ts`
- `_bmad-output/implementation-artifacts/6-3-path-picker-with-allowlist.md` (this file)

**Expected modified files:**
- `src/app/capstone/setup/wizard/page.tsx` (replace Story 6.2's stub `<PathPicker>` with this real one)

## Change Log

- 2026-05-08 — Story file authored from FR-3.7/3.8 + NFR-S7 + brainstorm F-CRIT-2/Setup-7/8/10 + architecture lines 222/309.
