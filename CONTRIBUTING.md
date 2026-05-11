# Contributing to bmad_trainer (AI Contribution Framework)

The portal teaches BMAD by example — including how to govern AI-assisted contributions in a shared codebase. This file is the human-readable companion to [`.github/CODEOWNERS`](.github/CODEOWNERS) and applies to every change to this repo, AI-assisted or not.

> **Maintainer note.** As of v1, [@JoshuaEngelbrecht](https://github.com/JoshuaEngelbrecht) is the curriculum maintainer and is named on every CODEOWNERS rule alongside the relevant Cargill team handle (`@IAM/lead-engineers`, `@IAM/engineers`, or `@IAM/product-team`, depending on the path). Two-owner rules use AND semantics — both the maintainer and the team must approve. The post-v1 maintainer-succession plan (co-maintainer onboarding, hand-off ritual, contributor ladder) is tracked outside this file.

---

## The three governance gates

Every change that lands on `main` must pass these gates. They apply to AI-driven and human-driven work equally.

1. **A story spec exists** under [`_bmad-output/implementation-artifacts/`](_bmad-output/implementation-artifacts/) describing the change. Story spec format is `<epic>-<story>-<slug>.md` (e.g., `14-1-capstone-governance-phase.md`).
2. **The PR is approved** by the owners listed in [`.github/CODEOWNERS`](.github/CODEOWNERS).
3. **All status checks are green** — `npm run lint`, `npm run lint:links`, `npm run test:unit`, `npx playwright test`.

If any gate is failing, the PR isn't ready for merge. Reviewers point at this section when rejecting work that skips a step.

---

## Contributing with BMAD (default path)

Most contributions go through the BMAD ceremony chain. Skills install under `.claude/skills/` (or your tool's equivalent under `.agents/skills/`). The full curriculum lives at [`/start-here`](https://git.cglcloud.com/JoshuaEngelbrecht/bmad_trainer/-/tree/main/training/lessons) — read at least Lessons 1–4 before your first PR.

1. **Pick a story.** The next story to work on is in [`_bmad-output/implementation-artifacts/sprint-status.yaml`](_bmad-output/implementation-artifacts/sprint-status.yaml). If your change isn't on the backlog, run `bmad-create-story` to author one from the relevant epic in [`_bmad-output/planning-artifacts/epics.md`](_bmad-output/planning-artifacts/epics.md).
2. **Implement.** Run `bmad-dev-story` to execute against the spec. The agent reads `_bmad/` configs, `AGENTS.md`, and the per-story file.
3. **Self-review.** Run `bmad-code-review` or `bmad-checkpoint-preview` before opening the PR.
4. **Open the PR.** Link it to the story file. CODEOWNERS auto-requests the path's owners — typically `@JoshuaEngelbrecht` plus one of `@IAM/lead-engineers`, `@IAM/engineers`, or `@IAM/product-team`.
5. **Address review.** Iterate until approved.

AI-assisted contributions adhere to the rules in `_bmad/`. Reviewers will hold the change to the spec the story file declares — not to "looks reasonable."

---

## Contributing without AI

You do not need to use BMAD or any AI tool to contribute. The governance gates are the same; only the authoring method differs.

1. **Author the story spec manually.** Create a markdown file under [`_bmad-output/implementation-artifacts/`](_bmad-output/implementation-artifacts/) following the format of an existing one (e.g., [`14-1-capstone-governance-phase.md`](_bmad-output/implementation-artifacts/14-1-capstone-governance-phase.md)). At minimum: user-story, acceptance criteria (Given/When/Then), scope/non-scope, test plan.
2. **Get the story spec reviewed first.** Open a small PR that adds *only* the story file before you implement. This catches scope and acceptance-criteria disagreements early. Same CODEOWNERS approval, just as a precursor PR.
3. **Implement the change.** Use whatever tools you prefer — vim, an IDE, hand-typed. The diff is reviewed against the story spec, not against how it was produced.
4. **Write/update tests.** All four CI gates (`lint`, `lint:links`, `test:unit`, `playwright`) must be green before merge.
5. **Open the PR.** Link it to the story file. CODEOWNERS auto-requests reviewers.

Non-AI contributions are held to the same review bar as AI-assisted ones. They are **not** exempt from the story-spec requirement or CODEOWNERS approval.

---

## Team ceremonies

The portal currently runs as a solo-maintainer project; the ceremonies below are the v1.1 target shape, encoded so co-maintainers onboarding later inherit a documented rhythm.

| Ceremony           | Cadence                                  | Notes                                                      |
| ------------------ | ---------------------------------------- | ---------------------------------------------------------- |
| Story grooming     | Weekly                                   | Refine upcoming stories so they're ready to pull.          |
| Sprint planning    | At each epic boundary                    | Update [`sprint-status.yaml`](_bmad-output/implementation-artifacts/sprint-status.yaml) with the next epic's stories. |
| Retrospective      | After each epic                          | Run via the `bmad-retrospective` skill; output lands in `_bmad-output/`. |
| Code review SLA    | 2 business days (solo-maintainer pace)   | Ping the maintainer if a PR has waited longer.             |

When co-maintainers come on board, this table updates first.

---

## Branch protection — the prerequisite

> **`CODEOWNERS` does nothing on its own.** It only routes review requests. Without branch protection, the rules in [`.github/CODEOWNERS`](.github/CODEOWNERS) are advisory — anyone with write access could merge without the required approvals.

A repo admin must enable the following in **Settings → Branches → Branch protection rules** (or **Settings → Rules → Rulesets**) for `main`:

- [x] Require a pull request before merging
- [x] Require approvals (minimum 1)
- [x] **Require review from Code Owners** ← the rule that makes CODEOWNERS enforceable
- [x] Dismiss stale approvals when new commits are pushed
- [x] Require status checks to pass before merging (`lint`, `lint:links`, `test:unit`, `playwright`)
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

Until these are enabled, this CONTRIBUTING.md and CODEOWNERS describe the *intended* governance but cannot enforce it. The capstone's [Lesson 4](training/lessons/4-codeowners-and-the-gate.md) walks through why each setting matters.

---

## Repo setup before your first contribution

```bash
git clone https://git.cglcloud.com/JoshuaEngelbrecht/bmad_trainer.git
cd bmad_trainer
npm install
npm run dev
```

See [README.md](README.md) for the devcontainer path (recommended for macOS and Windows trainees).

Run the quad gate locally before opening the PR:

```bash
npm run lint
npm run lint:links
npm run test:unit
npx playwright test
```

---

## Questions

- General process questions, scope acceptance, or "how does the BMAD chain work for X?" → open a GitHub issue or ping [@JoshuaEngelbrecht](https://github.com/JoshuaEngelbrecht).
- Curriculum content suggestions or corrections → open an issue with the lesson/lab path in the title.
- Bug reports → include the OS, the path you took (native vs devcontainer), and the failing gate's output.
