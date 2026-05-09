# GitHub Governance Research: CODEOWNERS + Branch Protection + Rulesets

> **Audience.** Curriculum author for the BMAD training portal Lesson 4 (CODEOWNERS + the lead-approval gate).
> This is a planning input, not trainee-facing copy. Every claim is cited to docs.github.com.
> Status: research artifact, not a tutorial.

---

## 0. How to read this artifact

This document is structured to support a single load-bearing teaching moment: **CODEOWNERS is a routing convention until branch protection makes it enforceable.** Everything below either supports that thesis or names a way teams get burned operationalizing it.

Sections:

1. CODEOWNERS file (mechanics)
2. CODEOWNERS edge cases that bite teams
3. Branch protection rules (mechanics)
4. Repository rulesets vs branch protection
5. The gate pattern this curriculum teaches
6. Common mistakes / patterns that fail
7. Auto-merge + CODEOWNERS
8. Glossary
9. Open questions
10. Sources

Inline citations use bracketed numeric footnotes that resolve to the **Sources** section at the bottom.

---

## 1. CODEOWNERS file

### 1.1 What it is

A `CODEOWNERS` file lets a repository declare which individuals or teams are responsible for code in the repository. People with admin or owner permissions can set up CODEOWNERS so that code owners are automatically requested for review when someone opens a pull request that modifies code they own [1].

The CODEOWNERS file by itself is **a routing/notification mechanism**: it auto-requests reviews from the right humans. It is **not** an approval gate on its own. The gate only exists when a branch protection rule (or ruleset) explicitly requires "Review from Code Owners" [1][2].

### 1.2 Where the file lives

GitHub looks for a `CODEOWNERS` file in three locations, in this order, and uses **the first one it finds** [1]:

1. `.github/CODEOWNERS`
2. `CODEOWNERS` (repository root)
3. `docs/CODEOWNERS`

Practical implication: if a contributor adds a CODEOWNERS at the root while one already exists at `.github/CODEOWNERS`, the root file is silently ignored. Three valid locations exist for historical reasons (different teams converged on different conventions before GitHub standardized), but the precedence is fixed.

The CODEOWNERS file applies to the branch where it lives, in the same way other files in the repository do. The version of CODEOWNERS used to assign reviewers is **the version on the base branch of the pull request** [1].

### 1.3 File size limit

CODEOWNERS files must be under **3 MB** in size. Files larger than this are not loaded; their rules will not be enforced [1].

### 1.4 Syntax

A CODEOWNERS file uses a pattern followed by one or more GitHub usernames or team names using the standard `@username` or `@org/team-name` format [1]. Email addresses are also valid, but only for users whose accounts can be matched by email — they cannot be used to refer to **managed user accounts** (Enterprise Managed Users) [1].

Comments start with `#`. Inline trailing comments are supported (e.g., `*.js @owner # tracked`) [1].

To match two or more code owners with the same pattern, **all the code owners must be on the same line**. Multiple lines targeting the same pattern do not stack — the last matching line wins (see §1.7) [1].

### 1.5 Pattern matching: gitignore-style with documented deviations

CODEOWNERS pattern matching follows most of the same rules used in `.gitignore`, **with the following notable exceptions** that GitHub explicitly documents [1]:

- **No escape with `\`** for patterns starting with `#`. There is no way to write a pattern beginning with `#`.
- **No negation with `!`**. You cannot say "everything matches owner A except `/build/`."
- **No character ranges with `[ ]`** (e.g., `[a-z]`).

These three deletions matter because anyone bringing a `.gitignore` mental model will write rules that **silently fail to do what they expect** — there's no syntax error; the patterns just don't match.

Standard gitignore-style behavior that *does* work:

- `*` matches anything except a path separator.
- `**` matches anything, including slashes.
- A leading `/` anchors the pattern to the repo root.
- A trailing `/` matches a directory and everything beneath it.
- Patterns without a leading `/` match anywhere in the repo.

### 1.6 Case sensitivity

CODEOWNERS paths are case sensitive, because GitHub uses a case-sensitive file system [1]. `Docs/` and `docs/` are different.

### 1.7 Order matters: last matching pattern wins

This is the single most-misremembered rule in CODEOWNERS:

> **"Order is important; the last matching pattern takes the most precedence."** [1]

Concretely: if `*` is on line 1 assigning everything to `@everyone`, and `*.go` is on line 14 assigning Go files to `@go-team`, then a `.go` file is owned by `@go-team` only — `@everyone` does **not** also get pulled in. The `*` line is overridden for that file by the later `.go` rule. This is the **opposite** of how `.gitignore` last-match-wins is often perceived (it does in fact use last-match-wins in `.gitignore`, but the consequences differ because gitignore composes "ignore"/"don't ignore" while CODEOWNERS composes ownership).

### 1.8 The canonical example block (from the docs)

GitHub publishes this example block, which we can lift wholesale for a teaching moment because the docs annotate it line by line [1][6]:

```text
*       @global-owner1 @global-owner2
*.js    @js-owner
*.go    docs@example.com
*.txt   @octo-org/octocats
/build/logs/ @doctocat
docs/*  docs@example.com
apps/   @octocat
/docs/  @doctocat
/scripts/ @doctocat @octocat
**/logs @octocat
/apps/ @octocat
/apps/github
```

Annotations from the docs [1][6]:

- `*` — default owners for everything in the repo (this gets overridden by every more specific later rule).
- `*.js` — last matching pattern wins, so `*.js` files in any subfolder are owned by `@js-owner`, even though `*` is "earlier."
- `*.go` with an email address — emails are valid handles.
- `*.txt` — team owners use `@org/team-name`.
- `/build/logs/` — leading `/` anchors to root; trailing `/` matches the directory and any of its subdirectories.
- `docs/*` — matches files like `docs/getting-started.md` but **not further nested files** (e.g., `docs/build/foo.md`). This is gitignore behavior.
- `apps/` — no leading slash, so this matches any `apps/` directory anywhere in the repo.
- `/docs/` — leading slash anchors to root.
- `**/logs` — `**` matches across directory boundaries.
- `/apps/github` (no owner specified) — **exclusion** trick: a pattern with no owner overrides earlier ownership for that path. Useful for "everything in `/apps/` is owned by `@octocat`, except `/apps/github` which has no required owner."

That last rule is the most easily-missed CODEOWNERS feature: **a line with a path and no owner removes ownership** for that path. There is no `!` negation; this is the workaround GitHub blesses [1][6].

### 1.9 Who can be a code owner

A user or team is a valid code owner only if they have **write access** (or higher) to the repository [1]. You can specify:

- A GitHub username: `@username`
- A team name: `@org/team-name` (the team must be a member of the org that owns the repo, must be visible, and must have write permissions on the repo)
- An email address (e.g., `dev@example.com`) — **except** for managed user accounts in EMU configurations [1]

If the user/team doesn't exist or doesn't have write access, **no code owner is assigned** for the matched pattern. GitHub does not error or block; the rule is silently skipped [1][7].

This silent-skip behavior is the source of a common production failure: a team is renamed, deleted, or has its repo access revoked, and CODEOWNERS rules pointing at the old name keep "matching" but produce no required reviewers — which means PRs sail through the "code owner review required" gate with **zero** code owner approvals, because GitHub correctly observes that no code owner is assigned to that path.

### 1.10 Parent teams vs sub-teams

Teams in GitHub orgs can be nested: a parent team can have multiple child teams, and a child team has exactly one parent [3].

Critical CODEOWNERS interaction:

- Mentioning (or naming as code owner) a **child team** does **not** notify the parent. Only members of the named team are assigned [3].
- Mentioning a **parent team** notifies the parent's direct members **and** members of all descendant child teams (because they inherit access) [3].

For CODEOWNERS this means:

- Naming `@org/platform` (a parent) makes everyone in `@org/platform`, `@org/platform-data`, `@org/platform-infra`, etc. eligible reviewers — any one of them can approve.
- Naming `@org/platform-infra` (a child) restricts the gate to that child team's members only.

The docs are explicit: parent teams should be granted permissions that are safe for every member of the parent and all child teams, with more granular access for child teams on sensitive repos [3]. The correct lever for "tighter" gates is to name the more specific child team in CODEOWNERS, not to assume parent membership "scopes."

### 1.11 Automatic review request triggering

When a PR is opened against a branch where CODEOWNERS lives, GitHub auto-requests review from the matching code owners [1]. Important behaviors:

- **Draft PRs do not trigger code-owner review requests.** The docs state: draft pull requests "cannot be merged, and code owners are not automatically requested to review them" [4].
- Marking a draft as **ready for review** at that moment requests reviews from any code owners [4].
- For PRs from forks, the CODEOWNERS file used is the one **on the base branch** of the PR (i.e., on the upstream side, not the fork) [1].

This draft-PR behavior matters operationally: a draft PR with green CI looks "ready" but has triggered no code-owner review-request, and "Require review from Code Owners" cannot be satisfied until the PR is moved to ready-for-review and the code owner approves.

### 1.12 Malformed CODEOWNERS

If any line in your CODEOWNERS file contains invalid syntax, **that line will be skipped** [1]. Errors are surfaced two ways:

- **In the GitHub UI**: when you navigate to the CODEOWNERS file in the repo, errors are highlighted [1].
- **Via REST API**: `GET /repos/{owner}/{repo}/codeowners/errors` lists them [1].

The docs do **not** explicitly describe a separate "CODEOWNERS errors" tab as a top-level UI element; the errors appear in the file view itself [1].

The `codeowners/errors` REST endpoint is what most CI lint scripts hook against to fail builds when CODEOWNERS gets corrupted [1].

---

## 2. CODEOWNERS edge cases that bite teams

This section is structured by failure mode, because that's how teams encounter these.

### 2.1 "I expected first match to win" → it's last match

Most common source of "but I assigned this to my team!" complaints. See §1.7. The mental model that breaks teams: thinking of CODEOWNERS as a priority list (where the most specific specific rule should logically be at the top). GitHub treats it as a sequence; later overrides earlier [1].

**Worked example.** This file:

```text
* @team-A
/apps/billing/ @team-B
/apps/billing/ @team-C
```

A change to `/apps/billing/foo.ts` is owned by `@team-C` only. `@team-B` is overridden by the later identical pattern. `@team-A` is overridden by the later more-specific pattern. **Both `@team-A` and `@team-B` are silent — no review request.** The fix for "we want both team-B and team-C" is `/apps/billing/ @team-B @team-C` on a single line [1].

### 2.2 No pattern matched → no code owner required

The docs do not explicitly state the no-match behavior, but it follows from the "code owner is assigned only when a pattern matches" model [1][7]: if no rule in CODEOWNERS matches a changed path, **no code owner is assigned**, and "Require review from Code Owners" is satisfied trivially (because there are zero required code owner approvals to collect).

This is a teaching moment: a CODEOWNERS that doesn't include a catch-all `*` line means new files added in unmapped directories pass the gate with zero domain-expert sign-off. Teams that want a strict gate should always include a catch-all rule at the top (which will be overridden by more specific rules below it).

### 2.3 Referenced team doesn't exist or lacks write access → silent skip

From §1.9: "If you specify a user or team that doesn't exist or has insufficient access, a code owner will not be assigned" [1]. The line is not a syntax error, so it doesn't show up in the CODEOWNERS errors UI tab in the same prominent way as a malformed pattern; the team rename simply produces a no-op [1][7].

This is the production-incident story: someone renames `@org/security` to `@org/sec-eng`, the CODEOWNERS still says `@org/security`, and "Require review from Code Owners" is now decorative for paths previously owned by security.

### 2.4 "Code owners are not requested" UI moment

When a CODEOWNERS rule matches but the owner cannot be requested (no write access, doesn't exist, etc.), the PR's reviewers panel shows the rule was evaluated but no review was requested [1][7]. The cue that something's wrong is the absence of a request, not the presence of an error — which is why teams routinely don't notice for weeks.

### 2.5 `*` vs `**` vs trailing `/`

These three behave differently and the difference is gitignore-standard but easy to get wrong [1]:

- `*` matches any sequence of characters **except** path separators. So `docs/*` matches `docs/foo.md` but not `docs/sub/foo.md`.
- `**` matches any sequence including path separators. So `docs/**` matches `docs/foo.md` and `docs/sub/foo.md`.
- Trailing `/` matches a directory and its subdirectories. `docs/` matches `docs/foo.md` and `docs/sub/foo.md`.

So `docs/` ≈ `docs/**` for ownership matching, but `docs/*` is materially different.

### 2.6 Malformed file

A malformed line is skipped [1]. The rest of the file continues to be evaluated. There is no "fail closed" mode where a bad CODEOWNERS file blocks PRs — bad lines are simply invisible. Teams that want CI to fail on CODEOWNERS errors must wire a status check that hits the `codeowners/errors` endpoint.

### 2.7 Email handles and EMU

Email-as-handle works for normal user accounts but **does not** work for Enterprise Managed Users (managed user accounts) [1]. Teams that migrate to EMU often inherit a CODEOWNERS that worked fine pre-migration and now silently has skipped lines. There is no automated rewrite.

### 2.8 The `/` vs no-leading-`/` ambiguity

`apps/` matches any `apps` directory anywhere in the repo. `/apps/` only matches the top-level `apps`. In a monorepo with multiple `apps/` directories, omitting the leading `/` accidentally cross-applies ownership across packages [1][6].

---

## 3. Branch protection rules

### 3.1 What they are

Branch protection rules enforce certain workflows for one or more branches. They can target specific branches, all branches, or branches matching `fnmatch` patterns (e.g., `*release*`) [2][8].

By default, branch protection rules:

- Disable force pushes to matching branches
- Prevent deletion of matching branches
- Do **not** apply restrictions to repository administrators (or custom roles with the "bypass branch protections" permission), unless "Do not allow bypassing the above settings" is enabled [2]

### 3.2 Where they're configured

Settings → in the **Code and automation** sidebar section, click **Branches** → next to **Branch protection rules**, click **Add rule** [8].

### 3.3 Available settings, by exact UI label

The full list of options on the rule-creation form, with exact UI labels [2][8]:

**Branch name pattern** — fnmatch pattern (e.g., `main`, `release/*`).

**Require a pull request before merging** — top-level toggle. When on, exposes:
- **Required number of approvals before merging** — dropdown.
- **Dismiss stale pull request approvals when new commits are pushed**
- **Require review from Code Owners**
- **Restrict who can dismiss pull request reviews**
- **Allow specified actors to bypass required pull requests**
- **Require approval of the most recent reviewable push** — ensures at least one reviewer **other than** the last pusher approves the latest changes [2][8]

**Require status checks to pass before merging**
- **Require branches to be up to date before merging** (sub-option; "strict" mode when on, "loose" when off) [2]

**Require conversation resolution before merging** — all PR comments must be marked resolved [2]

**Require signed commits** — only signed-and-verified commits can be pushed to the branch [2]

**Require linear history** — disallows merge commits; requires squash or rebase merges [2]

**Require merge queue** — automates merging on busy branches; queue ensures the PR's changes pass all required status checks when applied to the latest base [2]

**Require deployments to succeed before merging** — gate on successful deploy to specified environment(s) [2]

**Lock branch** — branch becomes read-only; no commits can be made; locked branches cannot be deleted [2]

**Do not allow bypassing the above settings** — applies all restrictions to administrators and roles with bypass-branch-protections permission [2][9]

**Restrict who can push to matching branches** — only specified users/teams/apps can push (available in public Free org repos and all Team/Enterprise Cloud repos) [2]

**Allow force pushes** — Everyone, or specific actors. Enabling does not override other branch protection rules [2]

**Allow deletions** — anyone with write+ permission can delete the branch [2]

### 3.4 "Require review from Code Owners" — the bridge

This is the single setting that turns CODEOWNERS from routing into enforcement [1][2].

When enabled: "any pull request that affects code with a code owner must be approved by that code owner before the pull request can be merged" [2].

Three details that matter for teaching:

1. **It is a separate setting** from "Require approvals." A repo can require 2 approvals **and** require code owner approval, in which case the 2 approvals must include at least one from each code owner of every modified path. (You can also require code owner approval with 0 generic approvals — code owner approvals satisfy the requirement.)
2. **It only fires when a CODEOWNERS rule matches.** If no rule matches the changed path, this setting passes trivially. (See §2.2.)
3. **It only fires for valid code owners.** If the rule names a user/team without write access, no review is required for that path. (See §2.3.)

### 3.5 "Dismiss stale pull request approvals when new commits are pushed"

When enabled: any approving review is automatically dismissed when a new commit is pushed to the PR's head branch [2]. The PR returns to "review required."

A dismissed approval becomes a comment on the PR thread with the dismissal reason [10].

Without this setting, an approval given on commit A persists even after the author force-pushes commit B with completely different changes — the gate becomes a rubber stamp for the moment-of-approval rather than the moment-of-merge.

### 3.6 "Require approval of the most recent reviewable push"

A separate, more-targeted setting: at least one approving review must come from someone **other than** the user who made the latest push [2][8]. This blocks the "self-approve via co-author" failure mode where a reviewer pushes a fix to a PR they previously approved.

### 3.7 "Restrict who can dismiss pull request reviews"

Limits the dismiss-review capability to a specified list of users/teams/apps [8]. Without this restriction, anyone with write access can dismiss reviews — a vector for governance bypass in larger teams.

### 3.8 "Allow specified actors to bypass required pull requests"

A sub-option of "Require a pull request before merging" [8]. Listed actors can push directly to the protected branch without opening a PR. Typically used for release-bot service accounts.

(Note: docs.github.com's "About protected branches" page does not call out this option separately in its high-level overview, but the rule-management page does list it [2][8] — the option exists and is configured at rule creation.)

### 3.9 "Do not allow bypassing the above settings"

The modern replacement for the older "Include administrators" toggle. By default, repo admins (and custom roles with the bypass-branch-protections permission) are exempt from the rule. Turning **on** "Do not allow bypassing the above settings" removes that exemption — admins are subject to the same rules as everyone else [2][9].

For governance-as-actually-practiced, this is the toggle that separates "we have a policy" from "the policy is enforced."

### 3.10 Multiple matching rules — only one applies

> **"Only a single branch protection rule can apply at a time, which means it can be difficult to know which rule will apply when multiple versions of a rule target the same branch."** [2]

The docs do **not** state that "most specific wins" or "most restrictive wins." They describe the situation as ambiguous and recommend rulesets when teams need composability [2]. This is a real footgun: a rule on `main` and a rule on `*` (catch-all) both target `main`; only one of them is evaluated, and the docs do not guarantee which.

### 3.11 Status checks — uniqueness gotcha

When wiring required status checks, GitHub matches by check name. Multiple workflows or jobs producing checks with the **same name** can cause ambiguous matching, and the docs note status check job names should be unique to avoid ambiguous results [2]. Practically: a `lint` job in workflow A and a `lint` job in workflow B both report "lint" — branch protection cannot disambiguate.

The accepted statuses for "passing" are `successful`, `skipped`, or `neutral` [2]. A required check that's `skipped` (e.g., a path-filtered job that didn't run) **does not** block the merge. This is intentional but trips up teams who think "it didn't run, so it's not green."

---

## 4. Repository rulesets vs branch protection

### 4.1 What rulesets are

A ruleset is "a named list of rules that applies to a repository or to multiple repositories in an organization for customers on GitHub Team and GitHub Enterprise plans" [11]. Available limits: up to 75 rulesets per repository and 75 organization-wide rulesets [11].

Rulesets are GitHub's newer (2023+) governance primitive. They are **not** a deprecation of branch protection — both work simultaneously [11][12].

### 4.2 Available rule types in branch/tag rulesets

Per the rulesets reference [13]:

1. Restrict creations
2. Restrict updates
3. Restrict deletions
4. Require linear history
5. Require deployments to succeed before merging
6. Require signed commits
7. Require a pull request before merging
8. Require status checks to pass before merging
9. Block force pushes
10. Require code scanning results
11. Require code quality results
12. Restrict file paths (push ruleset)
13. Restrict file path length (push ruleset)
14. Restrict file extensions (push ruleset)
15. Restrict file size (push ruleset)

Push-ruleset rules apply to all pushes to the repo without a branch target; they restrict file paths, path length, extensions, and sizes [11][13].

Under "Require a pull request before merging," sub-options [13]:

- Number of approving reviews required
- "Dismiss stale pull request approvals when new commits are pushed"
- "Require approval of the most recent reviewable push"
- Code owner approval requirement (the equivalent of "Require review from Code Owners")
- "Require all comments on the pull request to be resolved before it can be merged"
- Required merge type (merge, squash, or rebase)
- Required reviewers from specific teams

The ruleset version of "Require a pull request" exposes **everything** branch protection's PR section exposes, plus the merge-type pin (the docs explicitly call out being able to require a specific merge method as part of the ruleset rule) [13].

### 4.3 Bypass list

Rulesets support a configurable bypass list, with eligible actors [12]:

- Repository admins, organization owners, enterprise owners
- The **maintain** or **write** role, or custom repository roles based on the write role
- Teams (excluding secret teams)
- GitHub Apps
- Dependabot

Bypass can also be **scoped to pull requests only**, where actors are required to open a PR (rather than push direct to the branch) but bypass other rules [12].

### 4.4 Enforcement statuses

Rulesets have three statuses, where branch protection has only on/off [11][14]:

- **Active** — "your ruleset will be enforced upon creation" [12]
- **Disabled** — "your ruleset will not be enforced" [12]
- **Evaluate** — test/dry-run mode. "If a ruleset is running in 'Evaluate' mode, you can see actions that would have passed or failed if the ruleset had been active." Logged in Rule Insights with an "evaluate" label [14]

**Evaluate mode is rulesets-only.** Branch protection has no equivalent. This is why orgs introducing tighter governance often migrate to rulesets first: they can ship policy, observe what would have failed for a week, then flip to Active.

### 4.5 Layering

Multiple rulesets can apply to the same branch simultaneously, **and** rulesets layer with branch protection rules covering the same branch [11][15]:

> **"Rulesets work alongside any branch protection rules in a repository."** [15]
>
> **"As well as layering with each other, rulesets also layer with protection rules targeting the same branch or tag."** [15]

When the **same** rule type appears in multiple sources with different settings, **the most restrictive version applies** [11][15]. Example: ruleset A requires 1 approval; ruleset B requires 2 approvals; branch protection requires 0 approvals → effective requirement is 2.

This is the foundational difference from branch protection's "only one rule applies" model. Rulesets are designed for composition. Branch protection rules are designed for "this single rule wins on this branch" [2][11].

### 4.6 Visibility

> **"Anyone with read access to a repository can view the active rulesets for the repository."** [11]

Branch protection rules require admin access to view. This means rulesets are also a transparency improvement for trainees: they can see what rules they're subject to without needing escalated permissions.

### 4.7 When teams pick which

Per docs guidance and the layering text [11][15]:

| Need | Branch protection rules | Rulesets |
| --- | --- | --- |
| Single rule covers a branch | Fine | Fine |
| Multiple rules need to compose | Doesn't compose; one rule wins | Layers; most restrictive applies |
| Test new policy without enforcement | Not supported | Evaluate mode |
| Read-only viewers see policy | Admin-only | Read-access-visible |
| Apply across many repos at org level | No (per-repo only) | Yes (org-level rulesets) |
| Plan availability | All plans | Team / Enterprise Cloud |

Migration is **opt-in**. The docs explicitly do not require teams to move: "you can start using rulesets without overriding any of your existing protection rules" [15].

---

## 5. The gate pattern this curriculum teaches

This is the assembly the curriculum's Lesson 4 should produce. Each component is sourced individually above; this section names the wiring.

### 5.1 The minimum viable enforceable gate

Three pieces:

1. **`.github/CODEOWNERS`** with at least one rule that maps every file pattern the team cares about to a team or named user with write access [1].
2. **Branch protection (or ruleset) on `main`** with:
   - "Require a pull request before merging" ON
   - "Require review from Code Owners" ON [2]
   - "Dismiss stale pull request approvals when new commits are pushed" ON [2]
   - "Do not allow bypassing the above settings" ON [2]
3. **A status check** wired as required (e.g., the bmad_demo `lint:links` script + canonical npm scripts), so machine-checkable invariants pass before the human gate [2].

Without #2, CODEOWNERS is decorative. Without #1, "Require review from Code Owners" is a no-op (no rules match → no requirement). Without #3, the lead at the gate is reading code that hasn't been mechanically validated.

### 5.2 The "story-as-contract" wiring

The story file (the BMAD artifact) describes intent. The CODEOWNERS file maps "code that lives in this directory" to "the team accountable for that intent." Branch protection makes that mapping load-bearing. The lead's review is the moment where intent (story) and implementation (diff) are reconciled — and the lead is the right human to do it because CODEOWNERS routed the PR to them.

This is why the gate is enforceable rather than ceremonial: the named code owner has write access (so they can unblock), is automatically requested (so they can't be skipped), and **must** approve before merge (because branch protection says so).

### 5.3 What the lead reads for at the gate

Out of scope for this research artifact (the curriculum author writes this). Surfacing here only because Lesson 4 needs to land that **the gate is a human reading a diff against a story**, not a checklist. Mechanically, the gate is "approval from a code owner"; semantically, it is "the team's accountable human says this implementation matches the story."

### 5.4 Worked example: a CODEOWNERS for a Next.js + Express portal

For a repo shaped like bmad_demo (a Next.js app under `/web`, an Express API under `/api`, training content under `/_bmad-output`, infra under `/.github` and `/scripts`), a defensible CODEOWNERS:

```text
# Catch-all so unmatched paths still need a sign-off.
* @org/portal-leads

# Web (Next.js)
/web/                 @org/portal-frontend
/web/app/api/         @org/portal-frontend @org/portal-backend

# API (Express)
/api/                 @org/portal-backend

# Training content
/_bmad-output/        @org/portal-curriculum

# CI / governance — locked tighter
/.github/             @org/portal-leads
/.github/CODEOWNERS   @org/portal-leads
/.github/workflows/   @org/portal-leads @org/security
/scripts/             @org/portal-leads
```

Things this example demonstrates that map to lesson moments:

- **The catch-all is line 1**, overridden by every more-specific rule below it, ensuring no path slips through unowned (§2.2 fix).
- **`/web/app/api/`** has two owners on one line — both teams must approve when this directory changes (the "shared boundary" pattern).
- **CODEOWNERS itself is owned**: changes to who owns what require a code-owner-leads approval. This blocks the "I'll just edit CODEOWNERS in my PR to remove the gate" attack.
- **`.github/workflows/`** is co-owned by leads and security — CI changes are an attack surface.
- **No `!` negation needed** because we never need it: the layered last-match-wins rules express scope without exclusion (§1.5).

### 5.5 Worked example: pattern precedence walked through

Given:

```text
* @global
*.md @docs-team
/_bmad-output/ @curriculum-team
/_bmad-output/research/ @curriculum-leads
```

Five files change in a PR:

| Path | Matched by | Final owner |
| --- | --- | --- |
| `web/page.tsx` | `*` | `@global` |
| `README.md` | `*`, `*.md` | `@docs-team` (last match) |
| `_bmad-output/notes.txt` | `*`, `/_bmad-output/` | `@curriculum-team` |
| `_bmad-output/notes.md` | `*`, `*.md`, `/_bmad-output/` | `@curriculum-team` (last match — beats `*.md`!) |
| `_bmad-output/research/github.md` | all four | `@curriculum-leads` |

The fourth row is the trap. A file that's a markdown file inside the bmad output gets routed to `@curriculum-team`, not `@docs-team`, because `/_bmad-output/` appears later than `*.md`. Teams who wanted "all markdown to docs-team, no exceptions" must put `*.md` **after** the path-scoped rules — but then markdown inside `/_bmad-output/research/` would route to `@docs-team`, defeating the curriculum-leads gate. The honest answer is **CODEOWNERS doesn't compose like predicates**; you pick a primary axis (path or filetype), and the other axis loses [1].

### 5.6 Wiring: the order of operations

For a curriculum exercise (or a real repo bring-up), the order matters because some steps fail silently if you reverse them:

1. **Create the teams** in the org with at least write access to the repo. (CODEOWNERS pointing at non-existent teams is silent; §2.3.)
2. **Add `.github/CODEOWNERS`** with rules. Verify by opening the file in the GitHub UI — errors highlight inline [1].
3. **Open a test PR** against `main` to a path that should be owned. Verify the right team is auto-requested. If not requested, the rule didn't match or the team lacks write access.
4. **Configure branch protection on `main`** (or a ruleset). Turn on "Require a pull request before merging," "Require review from Code Owners," "Dismiss stale pull request approvals," "Do not allow bypassing the above settings" [2][8].
5. **Try to merge the test PR without code-owner approval.** Should be blocked. If not blocked, branch protection isn't on the right branch / pattern, or "Require review from Code Owners" isn't checked.
6. **Get the code-owner approval; merge.** Verify the merge succeeds.
7. **Now (and only now) wire required status checks.** The status check name must match exactly; if it's wrong the merge will be blocked indefinitely with no clear signal [2].
8. **Finally, enable auto-merge** at the repo level if desired [16].

Reversing 4 and 7 is a common error — teams add status checks first, branch protection blocks all merges (because the named check has never run, so it's pending forever), and they back out the branch protection in frustration.

---

## 6. Common mistakes / patterns that fail

These are the failure modes the curriculum should explicitly defuse.

### 6.1 Wildcard route-everything-to-one-team

```text
* @org/platform
```

The whole repo routes to one team. The team becomes a bottleneck; over time, approval is rubber-stamped because no one on the platform team has context for every PR. The team disables "Require review from Code Owners" to unblock themselves. Now the gate is gone.

The fix is path-scoped CODEOWNERS rules with the catch-all reserved for genuinely-cross-cutting paths only.

### 6.2 CODEOWNERS without branch protection

CODEOWNERS exists. Reviews are auto-requested. But "Require review from Code Owners" is **off** in branch protection. Result: routing works (humans get pinged) but **anyone with write access can merge without code owner approval**. CODEOWNERS becomes a notification convention, not a gate [1][2].

This is the most common failure pattern, because CODEOWNERS can be added by anyone with write access (it's just a file), but branch protection requires admin access to configure. Teams add CODEOWNERS, see review requests fire, and assume the gate is in place.

### 6.3 Branch protection without CODEOWNERS

Branch protection requires "Require approvals: 1" but **not** "Require review from Code Owners." Any user with write access can approve. Result: a junior contributor can approve another junior contributor's PR and merge to `main`. The gate is satisfied; the lead never saw it.

### 6.4 Allowing administrators to bypass ("governance theater")

"Do not allow bypassing the above settings" is **off**. Any repo admin can push directly to `main`, dismiss reviews, or merge unapproved PRs. The policy exists on paper; the org's most-trusted people are exempt from it [2][9].

This is sometimes intentional (break-glass for incidents). When intentional, the bypass should be a ruleset-level scoped bypass list with audit logging, not a default-on admin exemption [12].

### 6.5 CODEOWNERS pointing at non-existent or under-permissioned teams

A team rename, a team deletion, or a team losing repo write access silently nullifies the rule [1][7]. PRs against those paths now require zero code owner approvals. The CODEOWNERS errors REST endpoint surfaces this; teams that don't poll it never know.

### 6.6 First-match-wins assumptions

See §1.7 and §2.1. Teams write CODEOWNERS with the most-specific rule first ("most important first"). It silently does not work; later catch-all rules override it.

### 6.7 Forgetting `*.js` matches anywhere, but `docs/*` doesn't recurse

See §2.5. Teams write `docs/*` expecting all docs to be owned by the docs team; nested files (`docs/api/foo.md`) are silently unmatched. The fix is `docs/` (trailing slash) or `docs/**`.

### 6.8 Required status checks with non-unique job names

See §3.11. Two workflows produce a check named `lint`; branch protection cannot disambiguate; one of them might be the one that's checked. Status check matching by name is fragile — give checks unique, namespaced names [2].

### 6.9 Skipped checks count as passing

A path-filtered workflow that didn't run reports `skipped`, which counts as `successful` for branch protection [2]. Teams that gate on "did the security scan pass?" must ensure the scan **runs**, not just that it didn't fail.

### 6.10 Multiple branch protection rules on one branch

See §3.10. A rule on `main` and a rule on `*` both target `main`; only one applies, and the docs don't guarantee which [2]. The fix: consolidate to one rule per branch, or migrate to rulesets where layering is well-defined [11].

### 6.11 Forgetting that CODEOWNERS itself can be edited in the PR being reviewed

If `/.github/CODEOWNERS` is not itself owned by a senior team, an attacker (or careless contributor) can submit a PR that:

1. Modifies `.github/CODEOWNERS` to remove the gate on `/sensitive/`
2. Modifies `/sensitive/foo.ts`

If CODEOWNERS for `.github/` is unowned or owned by the same person submitting the PR, the modified CODEOWNERS-on-the-feature-branch can take effect for the PR's own review evaluation in some configurations. The robust mitigation is what §5.4 demonstrates: **CODEOWNERS owns itself**, and the line `/.github/CODEOWNERS @org/portal-leads` ensures any change to ownership requires a leads approval [1].

(The docs state that the CODEOWNERS used for assigning reviewers is the version on the **base branch** of the PR [1], which means a PR's modifications to CODEOWNERS do not retroactively reassign that PR's reviewers. But subsequent PRs see the new file. The "own your own CODEOWNERS" rule remains the right discipline.)

### 6.12 Trusting "1 approval required" with no code-owner requirement

A repo with "Require approvals: 1" but **no** code-owner requirement allows any two collaborators to merge anything to `main` — author + any reviewer with write access. Teams call this "two pairs of eyes" but it's not what most governance audits expect. The audit expectation is: **the named accountable team** signs off, not "any random collaborator." Only "Require review from Code Owners" + a CODEOWNERS that names the accountable team produces that property [1][2].

### 6.13 The CODEOWNERS "errors" REST endpoint not being polled

GitHub silently skips malformed lines and silently no-ops missing/under-permissioned owners [1][7]. The only mechanical way to catch these is the `GET /repos/{owner}/{repo}/codeowners/errors` REST endpoint [1]. Teams that don't wire this into CI find out about broken CODEOWNERS rules **after** the gate has been silently bypassed for weeks. A status check that calls this endpoint and fails on any non-empty response is the cheapest way to make CODEOWNERS errors loud.

---

## 7. Auto-merge + CODEOWNERS

### 7.1 What auto-merge does

Auto-merge lets users with write permissions configure a PR to merge automatically once all merge requirements are met [16][17]. Setup is two-part:

1. **Repo-level**: Settings → General → Pull Requests → enable "Allow auto-merge" [16].
2. **PR-level**: on a PR that cannot merge immediately (because of pending requirements), select the merge method dropdown → "Enable auto-merge" [17].

The "Enable auto-merge" option is shown **only on PRs that cannot be merged immediately** — i.e., when branch protection requires reviews, status checks, or conversation resolution that hasn't yet completed [16][17].

### 7.2 What "all merge requirements are met" means

Per the docs: auto-merge fires when "all required reviews are met and all required status checks have passed" [17]. This includes:

- Required approvals (count satisfied)
- "Require review from Code Owners" satisfied (if enabled)
- Required status checks `successful`, `skipped`, or `neutral`
- Conversation resolution, if required
- Other branch protection requirements (signed commits, linear history, etc.)

In a CODEOWNERS-gated repo, **auto-merge respects CODEOWNERS approvals**: it will not fire until a code owner approves [2][17]. There is no special path that bypasses code-owner review for auto-merge PRs.

### 7.3 When auto-merge auto-disables

> **"if someone who does not have write permissions to the repository pushes new changes to the head branch or switches the base branch of the pull request, auto-merge will be disabled."** [17]

This is the fork safety case: an outside contributor's push to a PR with auto-merge enabled will not silently merge. The PR author (or a maintainer) must re-enable auto-merge after reviewing the change.

### 7.4 When auto-merge is safe to enable in CODEOWNERS-gated repos

Auto-merge is safe to enable when the gate is real:

- "Require review from Code Owners" is on
- "Dismiss stale pull request approvals when new commits are pushed" is on (so a force-push after approval re-arms the gate)
- "Require approval of the most recent reviewable push" is on (so the approver isn't also the last pusher)
- "Do not allow bypassing the above settings" is on

With those four, auto-merge is just a convenience: it merges the PR the moment the human gate is satisfied and CI is green. Without them, auto-merge accelerates whatever bypass already existed.

### 7.5 Auto-merge and the draft PR boundary

Because draft PRs do not trigger code-owner review requests [4], a PR opened as a draft, marked auto-merge-eligible, and later flipped to ready-for-review will:

1. At ready-for-review, request reviews from code owners [4].
2. Sit waiting for code-owner approval.
3. Merge automatically once the approval lands and other requirements are met [17].

Auto-merge does not get fooled by draft state — it just waits. There is no race condition where a draft PR auto-merges before code owners have been requested, because auto-merge requires "all required reviews are met" [17] and an unrequested code-owner review counts as not-yet-met.

---

## 8. Glossary

**CODEOWNERS** — file at `.github/CODEOWNERS`, `CODEOWNERS`, or `docs/CODEOWNERS` that maps file patterns to GitHub usernames, teams, or emails. Routing convention by default; becomes a gate when paired with the "Require review from Code Owners" branch-protection setting [1].

**Code owner** — a user or team named in CODEOWNERS who has write access to the repository. Without write access, the entry is silently inert [1].

**Branch protection rule** — a per-repo, per-branch (or per-pattern) rule that enforces requirements before a push or merge. Configured in Settings → Branches. Only one rule applies per branch [2][8].

**Repository ruleset** — newer (Team/Enterprise Cloud) governance primitive that supersedes branch protection's composition limits. Rulesets layer; multiple can apply at once; the most restrictive wins. Available in **Active**, **Evaluate**, or **Disabled** statuses [11][14].

**Required approval / required reviewer** — count and identity constraints set by the "Require a pull request before merging" → "Required number of approvals" and "Require review from Code Owners" sub-options [2][8].

**Required status check** — a CI check that must report `successful`, `skipped`, or `neutral` before a PR can merge. Matched by check name, which must be unique [2].

**Dismissed review** — a review that has been explicitly cancelled by an admin or someone with write access. Becomes a comment on the PR conversation thread with a required dismissal reason [10].

**Stale review** — a review that was given on an earlier commit and has been auto-dismissed because new commits were pushed (only when "Dismiss stale pull request approvals when new commits are pushed" is enabled) [2].

**Bypass list** — in rulesets, the configurable list of actors (admins, teams, apps, Dependabot, custom roles) allowed to bypass the ruleset's rules. Can be scoped to "pull-requests-only" bypass [12].

**Evaluate mode** — rulesets-only enforcement status that logs would-be violations without blocking them. Used to validate new policies before activating them [14].

**Linear history** — branch state with no merge commits; PRs must be squashed or rebased to merge [2].

**Auto-merge** — opt-in PR feature that merges the PR automatically once all merge requirements (reviews, status checks, code owner approvals, etc.) are satisfied [16][17].

**Draft PR** — a PR marked as work-in-progress. Cannot be merged. Does **not** trigger automatic code-owner review requests [4].

**Most recent reviewable push** — the latest commit added to a PR. The "Require approval of the most recent reviewable push" setting requires approval from someone other than the user who made that push [2][8].

**Managed user account (EMU)** — Enterprise Managed User account. CODEOWNERS does not accept email-address handles for these accounts [1].

**fnmatch** — the shell-style pattern format used for branch-name patterns in branch protection rules and target patterns in rulesets [2][11].

**`codeowners/errors` REST endpoint** — `GET /repos/{owner}/{repo}/codeowners/errors`, returns the list of malformed CODEOWNERS lines that GitHub silently skipped [1].

---

## 8.4 Org-level governance: when the gate isn't set per-repo

Rulesets can be defined at the **organization level** and target multiple repos at once [11]. This is the lever for "every repo in this org must have signed commits and require code-owner review on the default branch" — instead of every repo's admin remembering to configure it.

Properties documented [11][12]:

- Up to **75 organization-wide rulesets**, in addition to up to 75 per repo.
- Org-level rulesets layer with repo-level rulesets and with branch protection rules: same composition rule, **most restrictive applies**.
- Enforcement status (Active / Evaluate / Disabled) is per ruleset; an org admin can drop a new ruleset in Evaluate, watch the Rule Insights page for would-be violations across all targeted repos, and flip to Active after the org has cleaned up [14].
- Bypass lists at the org level can include org owners, enterprise owners, GitHub Apps, teams, and Dependabot [12].

For a training curriculum, the relevant pedagogy is: **a repo-level CODEOWNERS gate is necessary but not sufficient at scale.** When you have 50 repos, the org-level ruleset is what guarantees every repo's `main` requires code-owner review — even repos that haven't been bootstrapped with the right local rules yet. The repo-level CODEOWNERS file still defines *who* the owners are; the org-level ruleset defines *that there must be one*.

This split (org defines the floor, repo defines the specifics) is the same pattern as a corporate security policy with team-specific implementations.

## 8.5 REST API surfaces relevant to the gate

The curriculum may want to teach "audit your gate from CI" — these are the endpoints that make it possible. All require appropriate permissions on the repo.

- **`GET /repos/{owner}/{repo}/codeowners/errors`** — list malformed/inert CODEOWNERS lines. Returns empty array when clean. Per [1], this is the only programmatic surface for "CODEOWNERS is misconfigured."
- **`GET /repos/{owner}/{repo}/branches/{branch}/protection`** — fetch the active branch protection rule on a branch. Used to assert "main has Require review from Code Owners on" from a CI check [2].
- **`GET /repos/{owner}/{repo}/rulesets`** and **`GET /orgs/{org}/rulesets`** — list rulesets, including their enforcement status (active/evaluate/disabled) [11][14]. Useful for validating that a ruleset hasn't been quietly disabled.
- **`GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers`** — see who's currently requested for review on a PR. Useful to assert that a PR really did get its code owners auto-requested.

These are surface-level; the docs listed at [1][2][11] each link to the full REST reference.

## 8.6 The "branch protection as code" pattern

Branch protection rules and rulesets are both manageable via the REST API and via Terraform / Pulumi / GitHub-supplied tooling. For a training curriculum, the pedagogical move is:

1. Show students the UI form once so they recognize each setting by exact label (§3.3).
2. Then show the same rule expressed as JSON via the REST API or as a ruleset JSON export — because rulesets can be exported and imported [12], teams can version-control their governance.

A ruleset JSON export contains the full set of rules, the bypass list, the target branches, and the enforcement status [12]. Storing this in the repo (or a sibling governance repo) makes the gate itself reviewable and auditable — which is the same property CODEOWNERS gives the routing layer.

The curriculum's team-rituals thesis benefits from this framing: **the ritual is encoded in version-controlled artifacts (CODEOWNERS file, branch protection JSON), not in a wiki page that drifts.**

## 9. Open questions / claims that need further grounding

These are claims commonly made in the wild that I could **not** find first-class GitHub-docs sources for. Curriculum author should treat them as informed conjecture, not established documentation.

1. **Behavior when no CODEOWNERS pattern matches a path.** Logically derived from the "rule must match to assign" docs language but **not explicitly stated** as "no match → no required code owner" anywhere in the pages I fetched [1][7]. Worth grounding via experimentation in a test repo before teaching it as fact.

2. **Whether the GitHub UI has a dedicated "CODEOWNERS errors" tab.** The docs describe errors as "highlighted in the UI" when viewing the file and accessible via REST [1]. The phrase "CODEOWNERS errors UI tab" appears in community discussion but I did not find a docs page that names a tab. It may be a banner or inline highlight rather than a tab.

3. **3-level team-nesting limit.** Community-documented; the GitHub docs on teams describe parent/child but I did not find an explicit "3 levels max" statement on the pages fetched [3]. Worth confirming in the org settings docs.

4. **Most-specific-rule-wins for branch protection.** The docs explicitly say "Only a single branch protection rule can apply at a time, which means it can be difficult to know which rule will apply when multiple versions of a rule target the same branch" [2]. They do **not** publish the tie-breaker. Common community claim is "most specific pattern wins"; teaching that without GitHub-published confirmation is risky. Recommend teaching "consolidate to one rule per branch" as the durable pattern.

5. **Whether "Allow specified actors to bypass required pull requests" is documented on the high-level "About protected branches" page.** It appears on the rule-management page [8] but not prominently on the overview [2]. May have been added more recently and not back-ported to overview prose.

---

## 10. Sources

All URLs are docs.github.com pages fetched while preparing this artifact.

1. **About code owners** — https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
2. **About protected branches** — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
3. **About teams** — https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams
4. **About pull requests** (draft PR behavior) — https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests
5. *(reserved — see [1] for CODEOWNERS syntax fragment)*
6. **About code owners — syntax section** (same page as [1], anchor `#codeowners-syntax`) — https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#codeowners-syntax
7. **About code owners — silent-skip behavior** (same page as [1]) — https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
8. **Managing a branch protection rule** — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
9. **About protected branches — bypass settings** (same page as [2]) — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
10. **Dismissing a pull request review** — https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/dismissing-a-pull-request-review
11. **About rulesets** — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
12. **Creating rulesets for a repository** — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository
13. **Available rules for rulesets** — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
14. **Managing rulesets for a repository** — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository
15. **About rulesets — layering with branch protection** (same page as [11]) — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
16. **Managing auto-merge for pull requests in your repository** — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-auto-merge-for-pull-requests-in-your-repository
17. **Automatically merging a pull request** — https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request

---

*End of research artifact.*
