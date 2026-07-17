# N236 — Analysis (Pre-Taskmaster)

## Problem framing

The master "New project" modal always creates a **subfolder** `<chosenFolder>/<slug>`
(`server.ts:1230`). Browsing into an existing folder (`ring-cms-extensions`) and
naming the project the same produced `ring-cms-extensions/ring-cms-extensions`. The
`insight-flow init` CLI inits **in place** (current folder); the modal is the odd one
out. Users expect "init in the folder I selected." A second requirement followed:
in-place init must **respect** an existing project's `.claude/` and `CLAUDE.md`
(never wipe; only add insight-flow's own section/files).

## Goal

Make the modal default to init-in-place (matching the CLI), keep "new subfolder" as
an opt-in, guarantee non-destructive merge into existing `.claude/`/`CLAUDE.md`, and
report collisions clearly instead of half-installing.

## Options considered

**Behavior**
- A — Always init in the selected folder (drop subfolder). Simple, matches CLI, but
  loses "create a fresh project folder from a parent" (N210/N221 onboarding).
- B — **Add a choice** (radio: use-selected-folder vs new-subfolder), default
  **use-selected-folder**. Keeps both cases. **Chosen.**
- C — Name-empty = init here. Subtle single-field trick; rejected for clarity.

**Respect existing .claude/ + CLAUDE.md**
- Analyst-confirmed init is **already merge-safe** with `force:false`: `CLAUDE.md`
  marker upsert; `.claude/settings.json` deep-merge; per-file command/agent writes
  (no dir wipe); role files skip-if-exists. So this is a *guarantee to lock in with a
  test*, not a rebuild.

**Collision handling** (user rule)
- Already installed (`taskflow.config.json` present) → clear "already initialized".
- Partial conflict (insight-flow-owned file exists with different content) → a
  **pre-flight scan** that lists ALL conflicts and does not half-install (replacing
  today's throw-on-first-collision-mid-write).

## Decision

Option **B** + default **use-selected-folder** (user-approved). In-place reuses the
existing merge-safe `initProject` (keep `force:false`) and adds: a pre-flight
conflict report, an explicit "already initialized" message, and a mode-aware N233
gitignore (in-place ignores only insight-flow's own files, never the shared
`.claude/`). Add an integration test proving non-destructive init.

## Open questions

- `[non-blocking]` In-place mode: name field becomes the registry label — prefill
  with the folder basename to avoid confusion.
- `[non-blocking]` Cursor provider (`.cursor/`, `AGENTS.md`) uses the same marker
  upsert; include if trivially parallel, otherwise Claude-path first.

## Sources

- None external. Grounded in the repo: `server.ts:1215-1265,1230,1239,1264`;
  `agents/init/index.ts`; merge-safety confirmed by a read-only Explore pass —
  `providers/context.ts:16-34`, `providers/claude.ts:44`, `emit.ts:222-269`,
  `agents/init/index.ts:186-215`. Trigger: user's `ring-cms-extensions` in-place
  attempt. Trust: high (own codebase).

## Handoff brief

feat / high / tags master-ui, init, git. Add an init-location choice to the
New-project modal (default: init in the selected folder; opt-in: new subfolder);
server resolves `dir = realParent` vs `resolve(realParent, slug)` from a new
`location` field. Guarantee non-destructive in-place init over an existing
`.claude/`+`CLAUDE.md` (keep `force:false`; add a test). Report collisions clearly
(already-initialized message; pre-flight itemized conflict list, no half-install).
Update N233's `ignoreProjectFolder` so in-place ignores only insight-flow's own
footprint, never `.claude/`.
