## What BMAD just did

- **`_bmad/`** — the BMAD scaffolding itself: shared scripts, the BMad Core module, the BMad Method module, and a `config.toml` carrying the answers you just typed. This is what makes BMAD a *thing your team uses*, not a docs site to read.
- **`.claude/skills/`** — the per-tool wiring for the AI tool you picked. With Claude Code that means 42 skills; with Codex or Copilot it lands under `.agents/skills/`. Either way the contract is the same: your tool now knows what BMAD knows.
- **`_bmad-output/planning-artifacts/`** and **`_bmad-output/implementation-artifacts/`** — empty for now. The next six phases populate them: brief → PRD → architecture → epics+stories → ADR → working code for story 1.1. Files in these folders are the *contract* between phases.
- **`docs/`** — placeholder for the long-term project knowledge BMAD will build up as your team uses the repo.

Next, you'll chat with your AI tool through those six phases. Each phase loads the prior artifacts as context. The HANDOFF.md you'll generate at the end has the `git init` + push instructions for your team's GitHub org — BMAD's installer leaves git untouched on purpose so the trainee can decide whether the repo starts fresh or layers onto an existing one.
