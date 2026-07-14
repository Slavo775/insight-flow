# N233 — New-project modal — gitignore the insight-flow footprint (shared or local)

**Type:** feat
**Priority:** medium
**Created:** 2026-07-14

## Problem

- The master UI "New project" modal always scaffolds the insight-flow footprint (`insightFlow/`, `.claude/`, `taskflow.config.json`, `.taskflow-activity.jsonl`) with no option to keep it out of the surrounding git repo. Some users want to run insight-flow on top of an existing repo without committing any of its files — and, in some cases, without even leaving a trace in the shared `.gitignore`.
- Today `initProject` only ever adds `.taskflow-activity.jsonl` to `.gitignore`; there is no way to ignore the whole footprint, and nothing detects a `.git` folder.

## Goal

1. When the folder picked in the New-project modal is itself a git repo root, offer two radio options: ignore the footprint via the shared committed `.gitignore`, or via the local-only `.git/info/exclude`.
2. Either option writes a single idempotent rule ignoring the entire new project subfolder (`<slug>/`) relative to the repo root.
3. When the chosen folder has no `.git` at its root, hide the options entirely and preserve today's behavior (no footprint ignoring beyond the existing activity-file line).
4. Default the radio to the shared `.gitignore` option.

## Scope

### In scope

- **Detection** — check for a `.git` entry directly inside the chosen browse folder (`realParent`), one level only, no walking up.
- **`packages/taskflow/src/master/client/NewProjectModal.tsx`** — add the two-option radio, shown only when the chosen folder has git; default to "shared".
- **`packages/taskflow/src/master/client/api.ts`** — add a `gitIgnore` field to the `createProject` payload.
- **`packages/taskflow/src/master/server.ts`** — surface a `hasGit` flag for the current dir (via the existing `GET /api/fs/list` folder browser) and, in the `/api/projects/create` handler (lines ~1087–1186), write the ignore rule after `initProject`.
- Idempotent-append helper writing `<slug>/` to `<realParent>/.gitignore` (shared) or `<realParent>/.git/info/exclude` (local).

### Out of scope

- Walking up parent directories to find an enclosing repo (explicitly one level only).
- `git init` on the new subfolder.
- A "commit it / don't ignore" third option.
- Changing `initProject`'s existing `.taskflow-activity.jsonl` behavior (the line becomes redundant inside an ignored subfolder but is left as-is).
- The dashboard client (`src/dashboard/client/`) — unaffected.

## Implementation plan

1. **Git detection in the folder browser** — In `server.ts`, extend the `GET /api/fs/list` response (or add a small check) to include a `hasGit` boolean = `existsSync(resolve(dir, ".git"))` for the currently listed dir. Confine to `browseRoot()` exactly like the existing listing.
2. **Modal UI** — In `NewProjectModal.tsx`, read `hasGit` for the current folder. When true, render a radio group "How should insight-flow's files be git-ignored?" with options `shared` ("Add to the shared `.gitignore` (committed)") and `local` ("Ignore locally via `.git/info/exclude` (not committed)"), defaulting to `shared`. Hide the group when `hasGit` is false. Track state as `gitIgnore`.
3. **API payload** — In `api.ts` `createProject`, add `gitIgnore?: "shared" | "local"` to the POST body; only send it when git options were shown.
4. **Server write** — In the `/api/projects/create` handler, after `initProject` succeeds and only when `existsSync(resolve(realParent, ".git"))` and `gitIgnore` is set, compute the rule `` `${slug}/` `` and append it idempotently to `<realParent>/.gitignore` (shared) or `<realParent>/.git/info/exclude` (local). Skip silently if the rule already exists.
5. **Idempotent-append helper** — Follow the style of `src/core/secrets.ts:37–50` (`ensureGitignored`) and `src/agents/init/index.ts:379–391`: read existing lines, skip if the pattern is already present, otherwise append with a trailing newline. Reuse/extract a small helper rather than duplicating.
6. **Guardrails** — `gitIgnore` must be validated server-side to the literal union (`"shared" | "local"`), same defensive style as the existing `editor` / `installFlows` validation (server.ts:1152–1158). Ignore-writes must stay confined under `realParent`.

## Verification

- `pnpm --dir packages/taskflow run build` succeeds; `npx tsc --noEmit` and lint pass.
- Manual: run `pnpm play`, open the master UI, "New project". Pick a folder that IS a git repo root → radio appears (default shared). Pick a folder with no `.git` → radio hidden.
- Create with "shared" in a git-repo folder → `<repo>/.gitignore` gains a `<slug>/` line; running it again does not duplicate.
- Create with "local" → `<repo>/.git/info/exclude` gains the `<slug>/` line; `<repo>/.gitignore` is untouched.
- `git status` in the repo shows the new project subfolder as ignored (untracked footprint hidden).

## Notes

- Behavior change: previously task files were committed and only `.taskflow-activity.jsonl` was ignored. With git present, the user now always picks one of two ignore modes (no opt-out) — see ANALYSIS.md decisions.
- Detection is deliberately shallow (one level). If the chosen folder is inside a repo but not the repo root, options stay hidden by design.
- Reference writers: `src/agents/init/index.ts:379–391` (activity file), `src/core/secrets.ts:37–50` (`ensureGitignored` managed-block pattern).
- See `ANALYSIS.md` in this folder for the full options/decisions trail.
