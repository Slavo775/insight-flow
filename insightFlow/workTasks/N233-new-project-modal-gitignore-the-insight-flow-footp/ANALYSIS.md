# N233 — Analysis (Pre-Taskmaster)

## Problem framing

The master UI "New project" modal scaffolds an insight-flow footprint into a
newly created subfolder but gives no control over whether that footprint lands
in the surrounding git repo. Users who run insight-flow on top of an existing
repo may not want to commit any of it — and some don't even want to touch the
shared `.gitignore`. Today `initProject` only ignores `.taskflow-activity.jsonl`;
nothing detects git.

## Goal

Offer, at project-creation time and only when git is present, a choice of where
to write a single rule that ignores the whole new project subfolder: the shared
committed `.gitignore`, or the local-only `.git/info/exclude`.

## Options considered

**What gets ignored**
- (a) Just the activity file (today's behavior, relocated between shared/local).
- (b) **Whole insight-flow footprint** — chosen. Matches the "don't pollute my
  repo at all" use case.

**Where to write the local rule / how to detect git**
- Walk up to the enclosing repo root (technically correct for the common
  "new project is a subfolder of an existing repo" case).
- `git init` the new subfolder (makes it standalone — different intent).
- **Only the chosen folder, one level** — chosen. Check `.git` directly in the
  browsed folder; if absent, hide the options.

**Choice model**
- **Two ignore options only** (`shared` / `local`) — chosen. No opt-out.
- Three options adding "commit it / don't ignore" — rejected.

## Decision

- Ignore the **whole new project subfolder** (`<slug>/`), one rule.
- Detect git **shallowly**: `.git` must exist at the root of the folder the user
  picks in the browser (`realParent`); no walking up.
- Two radio options, default **shared** (`.gitignore`); `local` writes to
  `.git/info/exclude`.
- No `.git` at the chosen folder → options hidden, today's behavior preserved.

## Open questions / accepted trade-offs

- **No opt-out when git is present.** With git detected, one of the two ignore
  modes is always applied. This is a behavior change from today (task files were
  committed). Accepted by the requester; default is `shared` to stay visible.
- **Shallow detection.** If the chosen folder is inside a repo but is not the
  repo root, options stay hidden — accepted, per the "only the new folder" rule.
- The `.taskflow-activity.jsonl` line `initProject` writes inside the subfolder
  becomes redundant once the whole subfolder is ignored; left as-is (harmless).

## Sources

- `packages/taskflow/src/master/client/NewProjectModal.tsx` — the modal.
- `packages/taskflow/src/master/server.ts` (~1087–1186) — `/api/projects/create`;
  target `dir = resolve(realParent, slug)` is always a fresh subfolder.
- `packages/taskflow/src/agents/init/index.ts` (379–391) — activity-file ignore.
- `packages/taskflow/src/core/secrets.ts` (37–50) — `ensureGitignored` idempotent
  managed-block pattern to reuse.

## Handoff brief

feat / medium / tags: master-ui, git, new-project. Add a git-ignore choice to the
New-project modal: when the chosen folder is a git repo root, show `shared` vs
`local` radio (default shared) that idempotently writes `<slug>/` to the repo's
`.gitignore` or `.git/info/exclude`; hide and no-op when there is no `.git`.
