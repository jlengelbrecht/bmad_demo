# Start Here

Welcome. By the end of this training you'll be able to lead your team in adopting **BMAD** — a framework for spec-driven AI-assisted development — and you'll understand the team rituals and governance controls that keep AI-generated work from shipping unreviewed.

## What's BMAD?

**BMAD** stands for **Breakthrough Method for Agile AI-Driven Development**. It's a workflow for using AI agents to plan and build software the way teams already work: through briefs, PRDs, architecture documents, epics, and stories. Instead of asking an AI to "build me a feature," you produce a chain of artifacts where each one informs the next, and specialized agents draft and review each artifact in turn.

The unit of work that comes out of that chain is a **story file** — a self-contained brief that any engineer (or any AI agent) can implement without losing context.

## What you'll be able to do after this training

1. Run a full BMAD planning cycle, from idea to ready-to-implement story.
2. Identify which BMAD activities require the full team in the room and which an engineer can do solo.
3. Configure `CODEOWNERS` and branch protection so AI-generated work can't ship without lead review.
4. Use BMAD coherently across a team where engineers use different AI tools.

## Shape of the training

| Component | Time | Format |
|---|---|---|
| 6 in-app lessons | ~15 min each | Self-paced reading with embedded artifact tours |
| 3 hands-on labs | 30–90 min each | One solo, one full-team, one async-team |
| 1 capstone | 60–90 min | Run the entire BMAD cycle on a small feature |

Total: roughly 3 hours self-paced, or one half-day if run as a team workshop. The labs in [`lab-instructions/`](lab-instructions/) are the hands-on counterparts to the in-app lessons.

## Prerequisites

- **Node 20+ and npm** installed locally
- **One of the supported AI coding tools** available: Claude Code, GitHub Copilot, OpenAI Codex, or OpenCode
- **A GitHub account** — you'll use it during the `CODEOWNERS` lab

If you're not sure how to set up your AI tool for use with BMAD, see [`tools-reference.md`](tools-reference.md) once the portal is running.

## Start

From the repo root:

```bash
npm install
npm run dev
```

Open http://localhost:3000, create an account, and begin **Lesson 1: What is BMAD?**

## How the lessons work

In-app lessons include callouts that point at real files in this repo — e.g., *"open `_bmad-output/planning-artifacts/architecture.md` to see what an Architect-agent output looks like."* When a callout appears, open the file in your editor. The lesson is teaching you the artifact, not just the lesson page.

## If you get stuck

- Lesson content lives at [`../content/lessons/`](../content/lessons/). Every lesson is plain markdown — if the portal is acting up, open the markdown directly.
- The labs at [`lab-instructions/`](lab-instructions/) include troubleshooting notes for common AI-tool friction.
- Facilitators running this as a team session should read [`facilitator-guide.md`](facilitator-guide.md) before the session.
