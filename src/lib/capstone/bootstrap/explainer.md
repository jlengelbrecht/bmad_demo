## What BMAD just did

- **`_bmad/`** — the BMAD scaffolding: skills, agents, workflow definitions. This is what makes BMAD a *thing your team uses*, not a docs site to read. Think of it as your team's AI-collaboration playbook, in code.
- **`AGENTS.md`** — a tool-agnostic shared-agent context file. Codex, Claude Code, OpenCode read this. Any AI tool you point at this repo gets the same baseline.
- **`.github/copilot-instructions.md`** — the Copilot-specific companion to AGENTS.md, demonstrating that tool-specific config sits ALONGSIDE shared config.
- **`.github/CODEOWNERS`** — the gate. Lessons 4 and 5 explained this. Edit it to map your team's roles.
- **`.git/`** — initialized with an initial commit. Push to your team's GitHub org when you're ready (HANDOFF.md will give you the commands).

Next, you'll chat with your AI tool through six phases: brief → PRD → architecture → epics+stories → ADR → working code for story 1.1. Each phase loads the prior artifacts as context. Files are the contract.
