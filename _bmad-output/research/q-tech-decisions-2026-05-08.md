# Q-Tech Decisions — Capstone Rebuild Research

**Date:** 2026-05-08
**Context:** De-risking the capstone rebuild PRD edit. Brainstorm session at `_bmad-output/brainstorming/brainstorming-session-2026-05-08-1953.md` produced 10 technical-research items (Q-Tech-1 through Q-Tech-10) that the architecture step needs answered before locking design. This doc records each as an ADR-style decision: **question**, **evidence**, **decision**, **rationale**, **consequences**, **open follow-ups**.

---

## Q-Tech-1 — Claude Code programmatic invocation surface

**Question:** Does Claude Code expose a programmatic / non-interactive invocation surface that the portal can pipe a chat through?

**Evidence (verified locally on dev box, `claude 2.1.136`):**

`claude --help` reveals a comprehensive headless invocation surface:

| Flag | Purpose |
|---|---|
| `-p, --print` | Print response and exit (useful for pipes) |
| `--input-format text\|stream-json` | Accept stream-json on stdin for realtime input |
| `--output-format text\|json\|stream-json` | Emit stream-json on stdout for realtime streaming output |
| `--include-partial-messages` | Token-by-token partial message chunks |
| `--system-prompt <prompt>` | Inject a system prompt (full primer) |
| `--append-system-prompt <prompt>` | Append to default system prompt |
| `--session-id <uuid>` | Use a specific session UUID for the conversation |
| `-r, --resume [value]` | Resume a conversation by session id |
| `--no-session-persistence` | Opt out of session save (transient sessions) |
| `--add-dir <directories...>` | Restrict tool access to specific directories — **native sandbox primitive** |
| `--allowedTools, --disallowedTools <tools...>` | Fine-grained tool gating |
| `--bare` | Minimal mode (skip hooks, LSP, plugin sync, attribution, auto-memory, background prefetches, keychain reads, CLAUDE.md auto-discovery). Anthropic auth strictly via `ANTHROPIC_API_KEY` or `apiKeyHelper`. |
| `--no-chrome` | Disable Claude in Chrome integration |
| `--max-budget-usd <amount>` | Hard budget cap on API spend |

**Decision:** **VIABLE — fully pipe-able.** Claude Code is the reference adapter for v1.

**Reference invocation shape:**

```bash
claude \
  --print \
  --input-format stream-json \
  --output-format stream-json \
  --include-partial-messages \
  --system-prompt-file <path-to-bmad-phase-primer.md> \
  --session-id <session-uuid> \
  --add-dir <CHOSEN_DIR> \
  --bare
```

The portal:
1. Spawns this as a long-running subprocess per chat session.
2. Writes trainee messages to stdin as JSON-lines (stream-json input format).
3. Reads agent responses from stdout as JSON-lines (stream-json output format with partial message chunks).
4. On phase completion / session end, sends EOF on stdin → process exits cleanly.

**Consequences for the architecture:**
- F-CRIT-1 (adapter sandboxing) is partially satisfied at the tool level via `--add-dir`. Portal's adapter layer enforces it as a defense-in-depth, but Claude Code itself respects the constraint.
- F-CRIT-3 (phase-done artifact-existence gate) works cleanly because the agent's tool-calls (file writes) land under `--add-dir <CHOSEN_DIR>`; portal can `existsSync` to verify.
- `--bare` is exactly what we want: lean, no auto-memory, no plugin discovery; portal subprocess doesn't pollute the trainee's day-2 environment.
- `--session-id <uuid>` enables clean resume semantics (Fail-1) and per-session debug logs.
- `--max-budget-usd` is a defensive cap we can pass in if the trainee provides an API key with a low ceiling.

**Open follow-ups (architectural, not blocking):**
- Decide how the trainee's API key gets to the subprocess. Options: env var (`ANTHROPIC_API_KEY=...` passed via `spawn` env option) or `apiKeyHelper` script. Probably env var for v1; helper script for v1.1 if trainee wants vault integration.
- `--debug-file <path>` could write per-session debug logs (Q-Tech-6 / subprocess.log requirement). Useful for the irreducible-list "subprocess.log" item.

---

## Q-Tech-2 / Q-Tech-3 / Q-Tech-9 — Other AI tool CLIs and IDE-only tools

**Status:** ✅ Research returned. Primary-source-verified findings below.

### Codex (`@openai/codex`)

**Sources:** developers.openai.com/codex/{cli,cli/reference,noninteractive,sdk}, github.com/openai/codex.

| Capability | Status | Notes |
|---|---|---|
| Programmatic mode | ✅ | `codex exec` (alias `codex e`) — non-interactive subcommand, designed for CI/scripts. TS SDK `@openai/codex-sdk` wraps the CLI. |
| System prompt at CLI | ❌ | No flag. Configuration via `~/.codex/config.toml`; per-session config-file workaround OR carry primer as leading user message. |
| Streaming output / input | ✅ both | `codex exec --json` → JSONL events on stdout. Stdin via `codex exec -`. Same pattern as Claude Code's stream-json. |
| Session resume | ✅ | `codex exec resume [SESSION_ID]` and `--last`. `--ephemeral` opts out of persistence. |
| Directory scoping | ✅ | `-C, --cd` for cwd. `--add-dir` for additional write access. `--sandbox <level>` (workspace-write / danger-full-access). |
| Stdout format | ✅ | Default: stderr progress + stdout final message (plain text). `--json` → JSONL on stdout. `--output-schema` for JSON Schema constraint. `--output-last-message <path>` writes final message to file. No ANSI in `exec` mode. |
| CLI nature | ✅ | True CLI, `npm i -g @openai/codex`. Not IDE-only. |

**VERDICT: VIABLE.** Closest match to Claude Code at the subprocess level. Single soft spot: no `--system-prompt` flag (workaround: pre-spawn config file or leading user message).

### OpenCode (`opencode-ai`, sst/opencode)

**Sources:** opencode.ai/docs/{cli,server}, npm `opencode-ai`. Disambiguation: this is the agentic-coder project, not the unrelated OpenCode IDE.

| Capability | Status | Notes |
|---|---|---|
| Programmatic mode | ✅ | `opencode run [message..]` non-interactive. Plus first-class headless HTTP server: `opencode serve` with OpenAPI 3.1 + official `@opencode-ai/sdk`. |
| System prompt at CLI | ❌ at flag level | But the HTTP server's `POST /session/:id/message` accepts `system?` in body — proxy via `opencode serve` instead of CLI subprocess. |
| Streaming output / input | Partial CLI / ✅ HTTP | `opencode run --format json` likely JSONL but docs imprecise. HTTP server has explicit SSE: `GET /event` and `/global/event`; `POST /session/:id/prompt_async` for async submission. Stdin streaming not documented at CLI. |
| Session resume | ✅ | CLI: `--continue`/`-c`, `--session`/`-s`, `--fork`. HTTP: full session lifecycle (`POST /session`, list, fork, share). |
| Directory scoping | Partial | `--dir` for working dir on `run`/`attach`. **No `--add-dir` equivalent** — single-root model only. |
| Stdout format | Partial | Default human-formatted; `--format json` raw JSON events (likely JSONL, docs imprecise). HTTP+SSE is the authoritative streaming surface. |
| CLI nature | ✅ + HTTP | Real CLI (Go binary, npm shim) AND headless HTTP server. **The HTTP server is actually a cleaner adapter target** than stdio JSONL — REST + SSE is more portable. |

**VERDICT: VIABLE** via HTTP server. The `opencode serve` HTTP+SSE surface gives us a system-prompt knob the CLI doesn't, and is architecturally cleaner for proxying to the browser. Caveat: only single-root directory scoping (no `--add-dir`).

### Gemini CLI (`google-gemini/gemini-cli`)

**Sources:** github.com/google-gemini/gemini-cli, google-gemini.github.io/gemini-cli/docs/cli/headless.html.

| Capability | Status | Notes |
|---|---|---|
| Programmatic mode | ✅ | `gemini -p "..."` headless mode. |
| System prompt at CLI | ❌ | No `--system-prompt` flag. Workaround: `GEMINI.md`-style file in working directory. |
| Streaming output | ✅ | `--output-format json` (single envelope) OR streaming JSONL: `init`, `message`, `tool_use`, `tool_result`, `error`, `result` events. |
| Session resume | ❌ | **No `--resume` / `--session-id` flag.** Open issue #1508 acknowledges this as a known gap. Each prompt is a fresh conversation. |
| Directory scoping | ✅ | `--include-directories src,docs`, `--all-files / -a`, `--yolo / -y`, `--approval-mode`. |
| Stdout format | ✅ | Default text; JSON envelope OR JSONL events. No ANSI in headless mode. |
| CLI nature | ✅ | True open-source CLI, `@google/gemini-cli`. |

**VERDICT: PARTIAL.** Two real gaps: **no session resume** (would have to replay transcript every turn — costly + brittle) and **no CLI system-prompt flag** (filesystem workaround). v1 adapter possible but more glue code; better as v2 candidate.

### GitHub Copilot CLI (`@github/copilot`)

**Sources:** github.com/github/copilot-cli (README + changelog through 1.0.44, 2026-05-08), docs.github.com/copilot/concepts/agents/about-copilot-cli. **Important:** this is the new standalone `copilot` command, NOT the deprecated `gh copilot` extension (EOL 2025-10-25).

| Capability | Status | Notes |
|---|---|---|
| Programmatic mode | ✅ | `--prompt / -p` one-shot non-interactive ("prompt mode"). |
| System prompt at CLI | ❌ | No flag. Custom instructions are file-based. |
| Streaming output | ✅ text only | Streams to TTY in prompt mode. **No documented `--json` / JSONL flag.** Alternate: `--acp` starts an Agent Client Protocol server (structured protocol used by Zed et al.) — would be the real programmatic surface but requires implementing an ACP client. |
| Session resume | ✅ | `--resume`, `--continue`, `--name`, `--connect`. |
| Directory scoping | ✅ | `-C <dir>` (1.0.42+). `/add-dir` slash command at runtime. Trusted-directories model. |
| Stdout format | Plain | Streamed text in `-p` mode. Structured surface is `--acp`. |
| CLI nature | ✅ | True CLI, `@github/copilot` npm. Not IDE-only. **Requires active Copilot subscription + `GH_TOKEN`.** |

**VERDICT: PARTIAL.** Programmatic, streaming, resume, dir-scoping all present, but no JSONL output without implementing ACP. ACP integration is real but heavy for v1. Auth friction (Copilot subscription + `GH_TOKEN`) is real for trainees. Better as v2 candidate.

### v1 adapter recommendation — REVISED per scope lock

**Scope (locked 2026-05-08):** v1 supported tools are exactly **claude-code, codex, github-copilot**. OpenCode is out of scope. Gemini CLI is fully out of scope (not even v2).

**Ship v1 adapters for:**
1. **Claude Code** (gold standard — only tool with all four needed surfaces on flags)
2. **Codex** (feature-equivalent at subprocess level — JSONL bidirectional, `-C`/`--add-dir`/`resume`/`--sandbox`)
3. **GitHub Copilot CLI** (plain-text streaming via `-p`, no JSONL by default — adapter parses raw stream and renders as plain chat. ACP integration deferred to v1.1)

**Out of scope:** OpenCode (architecturally interesting via HTTP+SSE but not in the supported set), Gemini CLI (the user-product team has decided it's not part of any phase).

**Implication for the abstraction:** the adapter interface must accommodate two output paradigms — (a) **structured stdio JSONL** (Claude Code, Codex — typed events: tool-call, message-delta, etc.) and (b) **plain-text streaming** (GitHub Copilot — single text-stream event per chunk). The brainstorm's "show full agent output, tool calls included" position (Prod-1) is consistent with the Copilot plain-text approach: trainees see raw text, including tool calls embedded in the model's output. We lose typed event UIs for Copilot (no inline "▶ reading brief.md..." cards) but the chat-bubble shape works fine, and the F-CRIT-3 phase-done gate is artifact-existence-based, not event-stream-based, so it works identically for all three adapters.

**GitHub Copilot CLI v1 implementation notes:**
- Subprocess: `copilot --prompt "<message>" -C <CHOSEN_DIR> --resume <session>` — plain text streamed to stdout.
- Session continuity: `--resume`, `--continue`, `--name`. Persist session-id/name in portal's progress DB.
- Directory scoping: `-C` for cwd; `/add-dir` slash command at runtime if needed.
- Auth: requires active **Copilot subscription** + **`GH_TOKEN`** environment variable. Setup wizard's auth-check step (Phase 0.5) must verify both:
  1. `gh auth status` returns authed
  2. Subscription is active (probe via `gh api user/copilot_billing` or similar; spike needed)
- Output parsing: per-line plain text → SSE chunks → chat bubble. Strip ANSI server-side per Q-Tech-10 recommendation.
- No structured tool-call events in v1; trainees see Copilot's raw narration. v1.1 candidate: implement `--acp` Agent Client Protocol client for richer event stream.

**Codex v1 implementation notes:**
- Subprocess: `codex exec --json -C <CHOSEN_DIR> --add-dir <CHOSEN_DIR> resume <session>` — JSONL events on stdout.
- Stdin: `codex exec -` for prompt-from-stdin OR positional argument.
- Session continuity: `codex exec resume [SESSION_ID]` and `--last`.
- System prompt: no flag; either pre-spawn a config snippet at `~/.codex/config.toml` OR carry primer as the leading user message. **Decision: leading user message** for v1 (avoids global config mutation; per-session-bounded).
- Auth: needs OpenAI API key in env (`OPENAI_API_KEY` or similar; verify exact env var).

**Claude Code v1 implementation notes:** see Q-Tech-1 above. No surprises.

---

---

## Q-Tech-4 — node-pty viability

**Status:** ✅ Research returned.

**Decision:** **Plain `child_process.spawn` with `stdio: ['pipe', 'pipe', 'pipe']`. Do NOT add `node-pty` to the dependency graph.**

**Rationale (research-supported):**
- `claude --print --output-format stream-json` emits newline-delimited JSON, no TUI. Same shape for Codex's `--json` mode. GitHub Copilot's `-p` mode emits plain streamed text.
- `node-pty` exists for "writing a terminal emulator" / "getting programs to think you're a terminal." None of our v1 tools need that — they all have explicit non-TTY modes.
- `node-pty` has known prebuild reliability issues on Apple Silicon and Linux ARM ([microsoft/node-pty issue #860](https://github.com/microsoft/node-pty/issues/860)): teams maintain forks (`@homebridge/node-pty-prebuilt-multiarch`, `@cdktf/node-pty-prebuilt-multiarch`) specifically because vanilla install requires Python + node-gyp + a C++ compiler when the prebuild is missing.
- Without a TTY, the AI tools stick to clean structured/text output (which is what we want).
- Per-session overhead with plain `spawn`: a few MB of pipe state on the parent side; fine for 1-2 long-running children per active trainee.

**Reserve `node-pty` for a future story** that explicitly needs TTY emulation. At that point, evaluate `@homebridge/node-pty-prebuilt-multiarch` rather than the upstream package.

---

## Q-Tech-5 — Long-running subprocess vs spawn-per-message

**Status:** ✅ Research returned. **Decision REVISED based on research findings.**

**Decision:** **Spawn-per-message** with session continuity via `--resume <session-id>` (Claude Code), `codex exec resume <id>` (Codex), `copilot --resume <id>` (GitHub Copilot). Persist `session_id` keyed by `(trainee, capstone_step)` in the progress DB.

**Why the pivot from my pre-research "long-running per phase" stance:**

1. **Documentation risk.** Claude Code's on-stdin NDJSON schema for `--input-format stream-json` is **officially undocumented** ([anthropics/claude-code issue #24594](https://github.com/anthropics/claude-code/issues/24594)). Third parties have reverse-engineered it. Building on undocumented internal protocol is the trap that bites in 6 months when Anthropic changes it. `--resume <session-id>` with `--print "<prompt>"` per turn is documented and stable.

2. **Crash recovery is free.** Trainee leaves laptop closed for an hour → portal HMR-restarts → next user message just works (spawn fresh, pass `--resume`). With long-running, we'd need explicit respawn-with-resume on every termination event anyway, so we'd be implementing the spawn-per-message machinery as a fallback regardless.

3. **Cold-start cost is in the noise.** Each turn already takes seconds of model latency; an extra few hundred ms of CLI init disappears.

4. **Industry alignment.** Anthropic's official Agent SDK uses long-running internally, but third-party CLI wrappers (e.g., Avasdream's article) use spawn-per-message because the resume protocol is the documented stable surface.

**The one place long-running wins** — streaming user input *into* a running tool call (e.g. answering a permission prompt mid-turn) — is not in our v1 scope. Trainee sends a complete message, agent streams a complete response, repeat.

**Implementation:**
- First turn of a new session: spawn without `--resume`. Capture `session_id` from the `system/init` event in the stream.
- Persist `(trainee, capstone_step) → session_id` in the progress DB.
- Every subsequent turn: spawn with `--resume <session_id>`.

**v1 implementation note:** Reserve "long-running stdin-write" as a future optimization gated on (a) measured cold-start pain in user testing AND (b) Anthropic publishing the on-stdin NDJSON schema.

---

## Q-Tech-6 — Streaming protocol portal-to-browser

**Status:** ✅ Research confirms SSE.

**Decision:** **Server-Sent Events (SSE) via Next.js App Router Route Handler with `runtime='nodejs'` and `dynamic='force-dynamic'`.** Browser uses native `EventSource`. User-message POSTs go to a separate endpoint that triggers the SSE stream (or pass via query param to a GET stream endpoint).

**Why SSE wins over WebSocket and plain `ReadableStream`:**

| Criterion | SSE | WebSocket | Plain ReadableStream |
|---|---|---|---|
| One-way stream (agent→browser) | ✅ Native fit | Overkill (full-duplex) | ✅ |
| Browser-side reconnect | ✅ `EventSource` auto-reconnects with `Last-Event-ID` | ❌ Manual exponential backoff state machine | ❌ No framing; client must ad-hoc parse partial chunks |
| Next.js Route Handler support | ✅ Documented ([Lee Robinson's resolution](https://github.com/vercel/next.js/discussions/48427)) | ❌ Route Handlers don't natively handle `Upgrade` ([#58698](https://github.com/vercel/next.js/discussions/58698)); needs separate WS server | ✅ |
| HMR / dev-server-restart survival | ✅ Auto-reconnect handles it gracefully | ❌ Custom code | ❌ Worst here — ad-hoc partial-chunk parsing |
| Code complexity | Minimal | Higher (separate server, separate lifecycle, extra port) | Minimal but reinvent SSE framing |

**Reference Route Handler shape:**

```ts
// app/api/capstone/chat/[sessionId]/stream/route.ts
import { spawn } from 'node:child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const url = new URL(req.url);
  const prompt = url.searchParams.get('prompt') ?? '';
  const resumeId = url.searchParams.get('resume') ?? undefined;

  const args = [
    '--print', prompt,
    '--input-format', 'text',
    '--output-format', 'stream-json',
    '--verbose',
    ...(resumeId ? ['--resume', resumeId] : []),
  ];

  const child = spawn('claude', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let buf = '';
      child.stdout.on('data', (chunk: Buffer) => {
        buf += chunk.toString('utf8');
        let nl;
        while ((nl = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line) controller.enqueue(encoder.encode(`event: msg\ndata: ${line}\n\n`));
        }
      });
      child.stderr.on('data', () => {}); // CRITICAL: drain to prevent pipe deadlock
      child.on('close', (code) => {
        controller.enqueue(encoder.encode(`event: done\ndata: {"code":${code}}\n\n`));
        controller.close();
      });
      req.signal.addEventListener('abort', () => child.kill('SIGTERM'));
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

Note the `req.signal.addEventListener('abort', ...)` pattern — when the trainee closes the tab or navigates away, we kill the subprocess. This is critical for F-CRIT-5 (subprocess lifecycle).

---

## Q-Tech-7 — Bootstrap commands vs chat — same subprocess infra?

**Status:** ✅ Research confirms one module; refines the contract shape.

**Decision:** **Single `runStreaming(opts): AsyncIterable<ProcEvent>` module.** Chat consumer streams events to SSE; bootstrap consumer collects-then-returns. Both share lifecycle, signal handling, stderr draining, and subprocess.log writing.

**Refined contract (more elegant than my pre-research two-function split):**

```ts
type ProcEvent =
  | { kind: 'stdout-line'; text: string }
  | { kind: 'stderr-line'; text: string }
  | { kind: 'exit'; code: number | null; signal: NodeJS.Signals | null };

interface RunOptions {
  cmd: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
}

function runStreaming(opts: RunOptions): AsyncIterable<ProcEvent>;
```

**Two consumers, same primitive:**

```ts
// Chat handler (SSE):
for await (const event of runStreaming(claudeOpts)) {
  if (event.kind === 'stdout-line') sseEnqueue(`event: msg\ndata: ${event.text}\n\n`);
}

// Bootstrap handler (run-and-await):
const stdout: string[] = [];
let exitCode: number | null = null;
for await (const event of runStreaming(npxOpts)) {
  if (event.kind === 'stdout-line') stdout.push(event.text);
  if (event.kind === 'exit') exitCode = event.code;
}
return { stdout: stdout.join('\n'), exitCode };
```

**Why one module beats two:**
- Single chokepoint for the F-CRIT-5 subprocess lifecycle requirements (drain stderr, honor AbortSignal, SIGTERM children on parent exit, never `detached: true`).
- Single chokepoint for subprocess.log writing — every spawn, regardless of consumer, gets a debug trail.
- Same line-buffer correctness (newline-split logic is fragile; do it once).
- Async iterable is the most flexible primitive — chat consumer pipes; bootstrap consumer collects; future consumers can do whatever.

This decision pairs cleanly with F-DEF-9 (always-explicit cwd) and F-DEF-10 (argv-style spawn).

---

## Q-Tech-8 — Adapter format

**Decision (synthesis call from brainstorm + Q-Tech-1 evidence):**

**Hybrid: TypeScript class implementing a `ToolAdapter` interface, with a declarative manifest field for static metadata.**

```typescript
interface ToolAdapter {
  // Static metadata (declarative)
  manifest: {
    id: 'claude-code' | 'codex' | 'opencode' | 'gemini'   // bmad-method install --tools <id>
    displayName: string                                    // "Claude Code"
    cliBinary: string                                      // "claude"
    minVersion: string                                     // semver range
    docsUrl: string                                        // for "install instructions"
    supportedOS: ('darwin' | 'linux')[]
  }

  // Lifecycle hooks (imperative)
  detectInstalled(): Promise<boolean>                      // sniff $PATH, run --version
  detectAuthenticated(): Promise<boolean>                  // tool-specific auth probe
  buildSpawnArgs(opts: ChatSpawnOpts): string[]            // produces argv for `spawn`
  parseStreamChunk(raw: string): ChatStreamEvent[]         // tool-specific output parsing
  formatUserMessage(text: string): string                  // tool-specific stdin format
}
```

**Why hybrid:**
- **Manifest** captures static facts (binary name, supported OS, min version) — the kind of thing that should be queryable without running code, and that maps to the `--tools <id>` flag passed to `bmad-method install`.
- **Class** captures imperative behavior (auth detection differs per tool; arg-building differs per tool; parsing the tool's output format differs per tool). Type-safe, testable, composable.
- Pure YAML manifest would be too rigid (tool-specific parsing logic doesn't fit YAML).
- Pure TS module without a manifest concept loses the "list available tools" surface for the setup wizard.

**Adapter location:** `src/lib/capstone/adapters/<tool-id>.ts` (one file per tool). A registry module imports all adapters and exposes them as a `Map<id, ToolAdapter>`.

**v1 adapters:** `claude-code.ts` (reference, low-risk per Q-Tech-1 evidence), `codex.ts` (pending Q-Tech-2 verification — if Codex isn't viable, sub in `opencode.ts`).

---

## Q-Tech-10 — ANSI escape codes / TUI handling

**Status:** ✅ Research refines the decision.

**Decision:** **Strip ANSI server-side on every stdout chunk, in the `runStreaming` module, before emitting to SSE / collecting for bootstrap.** Use Node 20+'s built-in `util.stripVTControlCharacters` (zero dependency). Render plain text in chat bubbles. Defer `xterm.js` until we have a story that explicitly requires TUI fidelity.

**Why server-side strip beats per-adapter handling:**
- Claude Code's stream-json content fields can still contain ANSI sequences (e.g., when the agent renders colored output for human consumption inside a tool result).
- GitHub Copilot's plain-text `-p` mode definitely emits some ANSI for styling.
- Codex's `--json` mode is mostly clean, but defensive stripping doesn't hurt.
- Centralizing in `runStreaming` (rather than per-adapter `parseStreamChunk`) means the chat bubble UI doesn't need to know about ANSI at all. Chat surface stays pure markdown/text.

**Implementation:**
```ts
import { stripVTControlCharacters } from 'node:util';

// Inside runStreaming, before emitting stdout-line events:
controller.enqueue({ kind: 'stdout-line', text: stripVTControlCharacters(line) });
```

**Reserve `xterm.js` for a future story** that explicitly embeds a TUI tool — at which point it goes on a separate `/terminal/[sessionId]` route, not the chat surface. Don't conflate the two surfaces.

**Node version requirement:** locks v1 to Node ≥ 20. This aligns with the existing `package.json` engines field (`"node": ">=20"`). Confirmed compatible.

---

## Q-Tech-Plus-1 — Subprocess discipline (non-negotiables)

The implementation-pattern research surfaced a set of *must-have* lifecycle invariants that aren't in the original Q-Tech list but are load-bearing. These become an explicit architecture-doc section.

**Required in `runStreaming` module:**

1. **Always drain BOTH stdout and stderr.** Even if the consumer doesn't care about stderr, attach a `data` listener. The Node docs are explicit that pipe buffers fill at ~64 KB; an undrained pipe deadlocks the child waiting on us. [anthropics/claude-code issue #1970](https://github.com/anthropics/claude-code/issues/1970) is the canonical case study of exactly this bug at scale.

2. **Never pass `detached: true`.** Default keeps the child in the parent's process group, so SIGINT to the parent (Ctrl-C in the terminal running `next dev`) propagates to children automatically.

3. **Honor `AbortSignal` from the incoming Request.** When the trainee closes the tab / navigates away, the SSE connection's `req.signal.abort` fires; we must SIGTERM the child. Without this, abandoned tabs leak subprocesses (F-CRIT-5).

4. **Register a single global `process.on('exit'|'SIGINT'|'SIGTERM')` handler** in `runStreaming`'s module that SIGTERMs all tracked children. Track them in a `Set` keyed by PID.

5. **Always pass `cwd` explicitly.** Never trust ambient cwd. `cwd: <CHOSEN_DIR>` for capstone subprocesses; never let the inherited cwd determine where files land. (F-DEF-9.)

6. **Always use argv-style `spawn`** (separate `args` array). Never shell-string interpolation. Node handles per-OS quoting correctly when given an args array. (F-DEF-10.)

7. **Subprocess.log is a function of `runStreaming`.** Every spawn writes its stderr to `<session-dir>/subprocess.log` regardless of consumer. The chat consumer's stdout is already streamed to the trainee; bootstrap stdout gets logged too if it's not visible. (Promoted to irreducible in Phase 3.)

**Documented troubleshooting (architecture doc + README):**

- **Block-buffering on pipes**: Most CLIs default to line-buffered when stdout is a TTY but block-buffered when piped. Claude Code in `--output-format stream-json` mode flushes per event (verified). For arbitrary future tools, document `stdbuf -oL -eL <cmd>` (Linux) or `unbuffer <cmd>` (macOS) as escape hatch.
- **macOS `com.apple.quarantine` xattr**: pnpm propagates this on installed binaries; Gatekeeper blocks. Document `xattr -cr node_modules/` as troubleshooting step. v1 prefers `npm`/`yarn` (we already do).

---

## Summary table — finalized

| # | Question | Status | Decision |
|---|---|---|---|
| Q-Tech-1 | Claude Code chat surface | ✅ | Spawn-per-message via `--print --output-format stream-json --resume <id> --add-dir <dir> --bare` |
| Q-Tech-2/3 | v1 tool support set | ✅ | **claude-code, codex, github-copilot.** OpenCode + Gemini out of scope. |
| Q-Tech-4 | node-pty viability | ✅ | Plain `child_process.spawn` with `stdio: ['pipe','pipe','pipe']`. NO node-pty in v1. |
| Q-Tech-5 | Long-running vs spawn-per-message | ✅ | **Spawn-per-message** with session continuity via `--resume <session_id>`. (Pivoted from initial "long-running per phase".) |
| Q-Tech-6 | Streaming protocol | ✅ | **SSE** via Next.js Route Handler with `runtime='nodejs'`, `dynamic='force-dynamic'`. Browser uses `EventSource`. |
| Q-Tech-7 | Bootstrap vs chat infra | ✅ | Single `runStreaming(opts): AsyncIterable<ProcEvent>` module. Chat consumer streams to SSE; bootstrap consumer collects-and-returns. |
| Q-Tech-8 | Adapter format | ✅ | Hybrid TypeScript class implementing `ToolAdapter` interface + declarative `manifest` field. One adapter per tool: `claude-code.ts`, `codex.ts`, `github-copilot.ts`. |
| Q-Tech-9 | Per-tool primer translation | ✅ | Claude Code: `--system-prompt-file <file>`. Codex: leading user message. GitHub Copilot: file-based custom instructions. Per-adapter `buildPrimer()` method. |
| Q-Tech-10 | ANSI / TUI handling | ✅ | Strip ANSI server-side in `runStreaming` using Node's built-in `util.stripVTControlCharacters` (Node ≥20, already required). NO xterm.js in v1. |
| Plus-1 | Subprocess discipline | ✅ | Drain stderr; no detached; honor AbortSignal; global exit handlers; explicit cwd; argv-style spawn; subprocess.log centrally. |

---

## What changed from the initial Q-Tech notes (architectural pivots)

Two pivots from my pre-research synthesis worth flagging because they affect epic story-shapes:

**Pivot 1: Spawn-per-message, NOT long-running per phase.** I had written "long-running per phase" before research; the research surfaced (a) the on-stdin NDJSON format is officially undocumented and (b) crash recovery is free with spawn-per-message + `--resume`. Each phase now equals "many short subprocess invocations, each chained via the persisted session-id" rather than "one long subprocess that lives for the phase." Implementation effort is similar; architectural trust is higher.

**Pivot 2: GitHub Copilot is a v1 adapter, not v2.** Per scope lock from product. The implication: the adapter abstraction must accommodate plain-text streaming (Copilot) alongside structured JSONL streaming (Claude Code, Codex). The `ToolAdapter.parseStreamChunk` method owns the difference; chat UI degrades gracefully (no inline tool-call cards for Copilot, just text). F-CRIT-3 phase-done gate is artifact-existence-based and works identically across all three.

## Inputs to the architecture doc

This research output produces these architecture-doc additions:

1. **§"Capstone Runtime"** — new section. Subsections: AI Tool Abstraction Layer (with the `ToolAdapter` interface verbatim), v1 supported tools (claude-code/codex/github-copilot with per-tool implementation notes), session model (spawn-per-message with `--resume`), browser transport (SSE via Route Handler with code skeleton).
2. **§"Subprocess Discipline"** — new section. The 7 non-negotiables above + the troubleshooting docs.
3. **§"Capstone Threat Model"** — new section. TM-1 through TM-6 from the brainstorm (sandboxing, path allowlist, lifecycle, localhost-binding, version pinning, tool-version drift) + the research-surfaced additions (pipe-buffer deadlock as a security/correctness invariant; xattr quarantine on macOS).
4. **Update §"API & Communication Patterns"** — break the "two POST endpoints, period" lock. New endpoint set: bootstrap (POST), chat-stream (GET, SSE), chat-message (POST), session-status (GET), abort (POST). Document why each is needed.
5. **Update §"Data Architecture"** — new BMAD_CAPSTONE_DIR semantics: portal session record + subprocess.log live there; CHOSEN_DIR is separate. Reset-progress NEVER touches CHOSEN_DIR (NFR-R3 carryover).
6. **Update §"Test Strategy"** — adapter integration tests must run against actual tool binaries in CI; pin tool versions in CI environment (TM-6).

These are the inputs the `bmad-edit-prd` and `bmad-create-architecture` steps will consume.
