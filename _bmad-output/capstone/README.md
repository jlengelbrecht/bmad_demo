# Capstone Artifacts

Each capstone session you produce in this training portal lands here as `<utc-timestamp>/`. For example, a session started on 7 May 2026 at 14:30:22 UTC creates the directory `_bmad-output/capstone/20260507T143022Z/` and writes the five artifact files into it as you complete each step:

```
_bmad-output/capstone/
└── 20260507T143022Z/
    ├── brief.md       (product brief)
    ├── epic.md        (epic outline)
    ├── story-1.md     (user story #1)
    ├── story-2.md     (user story #2)
    └── adr.md         (architecture decision record)
```

**This directory is committed empty** (`.gitkeep` + `README.md`) so a fresh clone has a place to land artifacts. Per-session subdirs are gitignored at the repo level (`_bmad-output/capstone/[0-9]*/`) — they're your work, not the portal's.

When you finish a capstone session, the directory contents are yours to commit to your team's repo, share with a stakeholder, or keep locally as a reference.

`npm run reset-progress` does **not** touch this tree. The reset script only deletes `data/progress.sqlite`; your capstone artifacts survive.

## Optional: redirecting writes for tests

Set `BMAD_CAPSTONE_DIR=./some/other/path` before launching the dev or test server to redirect capstone writes elsewhere. The Playwright e2e suite uses this seam for isolation. The override is gated to paths inside the repo (anything outside the cwd throws `InvalidCapstoneDirError` at module load) so a stray env value can't widen the write target. Production users leave it unset.
