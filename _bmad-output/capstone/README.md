# Capstone Artifacts (historical)

This directory once stored the artifacts produced by the Epic 4 textarea-based capstone (a session per `<utc-timestamp>/` subdirectory). The Epic 4 surface has been retired in the Epic 10 migration: the rebuilt capstone (Epic 5-9) writes to a trainee-chosen path **outside** this repo, so no new content is written here by the rebuilt portal.

Existing per-session subdirs are **preserved** — they belong to prior trainees and are not the portal's to delete. They remain gitignored at the repo level (`_bmad-output/capstone/[0-9]*/`); this `README.md` and `.gitkeep` keep the directory present in a fresh clone.

`npm run reset-progress` does **not** touch this tree (it only deletes `data/progress.sqlite`), and the rebuilt capstone's NFR-R3 carryover is stricter still: reset-progress also never touches the trainee's chosen target directory (CHOSEN_DIR) outside the repo.
