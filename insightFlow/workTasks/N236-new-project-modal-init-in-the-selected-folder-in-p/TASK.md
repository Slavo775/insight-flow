# N236 — New-project modal — init in the selected folder (in-place), respecting existing .claude/ and CLAUDE.md

**Type:** feat
**Priority:** high
**Created:** 2026-07-14

## Problem

- The master UI "New project" modal always creates a **subfolder** `<chosenFolder>/<slug>` (`server.ts:1230` `dir = resolve(realParent, slug)`). Browsing into an existing folder and naming the project the same made `ring-cms-extensions/ring-cms-extensions` — a surprising same-name nested folder.
- The `insight-flow init` CLI inits **in** the current folder; the modal diverges. Users expect "init in the folder I selected."

## Goal

1. Add an init-location choice; default to **init in the selected folder** (in-place), with "create a new subfolder" as the opt-in.
2. In-place init is **non-destructive** to an existing project's `.claude/` and `CLAUDE.md` (merge only; keep `force: false`) — locked in with a test.
3. Collisions are reported clearly: "already initialized" when insight-flow is present; an itemized "cannot install — these files conflict" pre-flight report otherwise (never half-install).
4. The N233 gitignore-footprint option adapts to in-place mode (ignore only insight-flow's own files, never the shared `.claude/`).

## Scope

### In scope

- `packages/taskflow/src/master/client/NewProjectModal.tsx` — init-location radio.
- `packages/taskflow/src/master/client/api.ts` — new `location` field.
- `packages/taskflow/src/master/server.ts` — `/api/projects/create` dir resolution + `ignoreProjectFolder`/footprint logic.
- `packages/taskflow/src/agents/init/index.ts` — pre-flight conflict scan + clearer messages.
- A new init integration test (node:test).

### Out of scope

- Changing init's existing merge-safe writers (CLAUDE.md marker upsert, settings deep-merge, per-file command/agent writes) — they already do the right thing; only rely on them.
- The `.cursor/` provider path (unless trivially parallel).
- The default flow / any composer definitions.
- Passing `force: true` from the modal (never).

## Implementation plan

1. **Init-location choice (client).** In `NewProjectModal.tsx` add a radio "Init location": **Use the selected folder** (default) vs **Create a new subfolder named `<name>`**. When in-folder is active, prefill the name input with the selected folder's basename (name = registry label). Send `location` in the create payload.
2. **API field.** In `api.ts` add `location?: "in-folder" | "subfolder"` to the `createProject` body (default `"in-folder"` when omitted).
3. **Server dir resolution.** In `server.ts` `/api/projects/create` (~1215–1265): validate `location` to the literal union; compute `dir = realParent` (in-folder) or `resolve(realParent, slug)` (subfolder). Keep realpath/`browseRoot` confinement; keep the `taskflow.config.json`-exists guard (~1239) — for in-folder it now guards re-init.
4. **Clear "already installed" message.** When the target already has `taskflow.config.json`, return the 409 with the explicit message "insight-flow is already initialized in this folder" (path included).
5. **Pre-flight conflict scan (init).** In `agents/init/index.ts`, before writing in in-place mode, scan every file insight-flow would create against existing files; collect any insight-flow-owned target that already exists with **different** content. If any, do **not** write — return an itemized error: "Could not install insight-flow — these files conflict:" + the list. Replace the current throw-on-first-collision-mid-write with this up-front report so no half-install is left.
6. **N233 gitignore coupling.** In the create handler / `ignoreProjectFolder`: subfolder mode ignores `<slug>/` (today); in-place mode ignores only `insightFlow/`, `taskflow.config.json`, `.taskflow-activity.jsonl` — **never** `.claude/` (shared with the user).
7. **Test.** Add a node:test that inits into a temp folder already holding a `.claude/` (with a user-owned command file) and a `CLAUDE.md` (with user content); assert: nothing deleted, user `CLAUDE.md` content intact, only the `taskflow` marker section added, user `.claude` files preserved, and `insightFlow/` created.

## Verification

- `pnpm --dir packages/taskflow run build`, `tsc --noEmit`, lint pass; `pnpm --dir packages/taskflow test` (new test green).
- Manual (via `pnpm play` / hub): pick a folder, "Use the selected folder" → insight-flow inits **in** it (no same-name subfolder); pick "Create a new subfolder" → `<folder>/<slug>` as before.
- In-place into a folder with existing `.claude/` + `CLAUDE.md` → both preserved, only the marker section added.
- Re-init the same folder → "insight-flow is already initialized" message. A planted conflicting file → itemized conflict report, no half-install.
- In-place gitignore option (git repo) → ignores `insightFlow/` etc., **not** `.claude/`.

## Notes

- Fixes the same-name-subfolder surprise surfaced right after the N233 gitignore feature; N233's `ignoreProjectFolder` must be updated in the same change.
- Init is already merge-safe (analyst-confirmed): `CLAUDE.md` marker upsert (`context.ts:16-34`, `providers/claude.ts:44`), `.claude/settings.json` deep-merge (`emit.ts:222-269`), per-file command/agent writes (never wipes `.claude/`), role files skip-if-exists. This task **relies on** and **tests** that; it does not rebuild it.
- The create endpoint already calls `initProject(dir, false, …)` (`server.ts:1264`) — keep `force` false.
- See `ANALYSIS.md` in this folder for the full design trail (two analysis rounds).
