---
title: From lessons to capstone
---

# Lesson 7 — From lessons to capstone

> **Reading time:** ~10 minutes. **Prerequisites:** Lessons 1–6.

You've walked the artifact chain, seen the gate, named the recovery loops, and now know what BMAD's installer actually offers. The capstone is where you experience BMAD as your team will: by chatting with your AI tool through the full artifact chain on a fresh repo at a path you choose.

This lesson is short on purpose. Lessons 1–6 did the conceptual + ecosystem work; the capstone is the practice. The aim here is to set expectations — what you'll do, what the portal does and doesn't do for you, how long it takes, and what you walk out with.

---

## What the capstone is

A 90–120 minute guided run where:

- You **pick your AI tool** — Claude Code, Codex, or GitHub Copilot.
- The portal **bootstraps a fresh repo** at a path you choose, running `npx bmad-method install` for you with the right options.
- You **walk the BMAD artifact chain** by chatting with your AI tool through each phase. The portal launches the tool with the right BMAD skill (`/bmad-product-brief`, `/bmad-create-prd`, etc.) so the workflow starts immediately — you drive the conversation in the terminal embedded on the page.
- At the end, the portal generates a `HANDOFF.md` summarizing what you produced and how to push it to your team's GitHub org.

The portal makes **zero cloud calls of its own.** Every model invocation goes through your AI tool's process under your tool's auth, on your machine. The portal scaffolds the repo, launches your tool, and proxies the terminal — nothing else. (Lesson 1's "no egress" claim is enforceable here for a reason: there's no portal-side network code that would need to call out.)

---

## The eight phases

| # | Phase | What you do | Output |
|---|---|---|---|
| 0 | Pre-flight | Click through node / git / npx version check | (none — gate to phase 0.5) |
| 0.5 | Tool selection + auth | Pick Claude Code, Codex, or GitHub Copilot; confirm install + auth | (none — gate to phase 1) |
| 1 | Setup wizard | Fill project name, target directory, language preferences | session config in SQLite |
| 2 | Bootstrap | The portal runs `npx bmad-method install --tools <your-choice>` against your chosen path; you watch the install in an embedded terminal | a fresh BMAD-bootstrapped repo |
| 3 | Brief | Chat with your tool through `bmad-product-brief` | `_bmad-output/planning-artifacts/product-brief-<project>.md` |
| 4 | PRD | Chat through `bmad-create-prd` (brief auto-loaded as context) | `prd.md` |
| 5 | Architecture | Chat through `bmad-create-architecture` (decision rationale lands inline — see Lesson 2's note on architecture documents containing decision records) | `architecture.md` |
| 6 | Epics + stories | Chat through `bmad-create-epics-and-stories` | `epics.md` |
| 7 | Dev Story 1.1 | Chat through `bmad-create-story` for the first story, then implement via `bmad-dev-story` with a green-tests gate | code + updated story file |
| 8 | Handoff | The portal generates `HANDOFF.md` with push instructions and Day-2 next steps | `HANDOFF.md` in your repo |

The contract between phases is **the files on disk** — not the chat history. If you close the page and come back tomorrow, the portal re-loads the prior artifacts as primer context for the next phase. This is the same property your team will rely on day-to-day after the capstone (Lesson 5's "stories propagate; conversations don't").

---

## What you walk out with

When the capstone finishes, you have:

- **A real BMAD repo** at the path you chose, with brief / PRD / architecture / epics+stories / story-1.1 produced — and Story 1.1's tests passing.
- **A `HANDOFF.md`** with the full Day-2 checklist: how to push to your team's GitHub org, which `CODEOWNERS` placeholders to replace, what branch protection to apply, where to pin the [`team-rituals-checklist.md`](/source/training/team-rituals-checklist.md) and [`lead-review-checklist.md`](/source/training/lead-review-checklist.md) you've now seen referenced in Lessons 4 and 5.
- **A working mental model** for running BMAD natively from your terminal. The portal is a training tool; after the capstone, you'll never need it again to run BMAD — you invoke skills through your AI tool's normal interface, the same way you did during the capstone.

---

## Tool choice — and why it's a deliberate proof

You'll pick one tool for the capstone. The lesson moment is that **the artifact chain is identical regardless of which tool you pick.**

| Tool | Launch shape (what the portal runs for you) |
|---|---|
| Claude Code | `claude --dangerously-skip-permissions "/bmad-product-brief"` |
| Codex | `codex --dangerously-bypass-approvals-and-sandbox "/bmad-product-brief"` |
| GitHub Copilot | `copilot --allow-all-tools -i "/bmad-product-brief"` |

Three different argv shapes; three different terminals; **one identical BMAD skill** running inside each. The artifacts they produce are identical in shape. This is the "tool-agnostic contract" claim from Lesson 3, made physical: a teammate using a different tool than you would walk this same capstone, produce identical artifacts, and your two repos would be functionally indistinguishable on the file system.

If you're curious about the other tools, run the capstone twice with different tool selections and compare the produced artifacts. (You can also try this in the **Solo lab** after the capstone — see [`/labs/solo`](/labs/solo).)

---

## Time and focus

Plan for **90–120 minutes of focused time.** The capstone runs sequentially; the artifacts compound. If you're interrupted mid-capstone, the portal saves your state — you can pick up where you left off — but the experience is best in one sitting.

Two recommendations:

- **Close other tabs.** The terminal is interactive; you'll be reading and typing.
- **Don't try to make perfect artifacts.** The capstone teaches you the chain by running it. The artifacts you produce are throwaway — your team's real work will go through this same chain afterward against actual feature stories.

---

## Ready?

When you're ready, click **Start the capstone** below to head to `/capstone`. Lesson 5's recovery loops are still relevant — if the chat with your AI tool goes sideways during a phase, name the loop and recover. That's the practice.
