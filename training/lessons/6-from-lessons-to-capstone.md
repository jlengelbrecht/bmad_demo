---
title: From lessons to capstone
---

# Lesson 6 — From lessons to capstone

You've walked the artifact chain, seen the gate, and named the recovery loops. The capstone is where you experience BMAD as your team will: by chatting with your AI tool through the full artifact chain on a fresh repo at a path you choose.

The capstone walks nine phases:

1. **Pre-flight** — node / git / npx version check.
2. **Tool selection + auth** — pick claude-code, codex, or github-copilot and confirm your machine has both the binary and the auth.
3. **Setup wizard** — project name, target directory, language, skill level, output folder.
4. **Bootstrap** — the portal runs `npx bmad-method install` against your chosen path with the wizard answers (you can read the literal command before it runs).
5. **Brief** — chat with your AI tool to produce `brief.md`.
6. **PRD** — chat to produce `prd.md` with the brief loaded as context.
7. **Architecture** — `architecture.md` with brief + PRD loaded.
8. **Epics + stories** — `epics.md` plus story 1.1 with everything prior loaded.
9. **ADR** — `adr-001-<slug>.md`.
10. **Dev story 1.1** — implement story 1.1 with a green-tests gate.
11. **Handoff** — `HANDOFF.md` summarizing what landed, ready to push to your team's GitHub org Monday morning.

Time commitment: 90-120 minutes focused. The portal never makes its own cloud calls — every model call goes through your tool's process under your tool's auth. The portal scaffolds the repo and proxies the chat; the contract between phases is the files on disk, not the chat history.

When you're ready, click **Start the capstone** below.
