# N44 — Release 0.7.0 — changelog, README, and version bump

**Type:** chore
**Priority:** high
**Created:** 2026-05-26

## Problem

Tasks N40–N43 shipped four meaningful changes (master server upsert fix, claude status push to master overview, git permissions in config, and dashboard sound replay fix) but the package is still at `0.6.0` with no changelog entry or README section for any of them. A 0.7.0 release packages these for npm consumers.

## Goal

1. `packages/taskflow/package.json` version bumped to `0.7.0`.
2. `packages/insight-flow-master/package.json` (if versioned separately) aligned to `0.7.0`.
3. `CHANGELOG.md` (repo root) has a `[0.7.0]` section above `[0.6.0]` documenting N40–N43.
4. `packages/taskflow/CHANGELOG.md` has the same `[0.7.0]` entry.
5. `packages/taskflow/README.md` "What's new" section updated to 0.7.0 with the four highlights.

## Scope

### In scope

- `packages/taskflow/package.json` — `version` field.
- `packages/insight-flow-master/package.json` — `version` field (check if it exists and is versioned).
- `CHANGELOG.md` (repo root) — new `[0.7.0]` section.
- `packages/taskflow/CHANGELOG.md` — new `[0.7.0]` section (mirrors root).
- `packages/taskflow/README.md` — "What's new in 0.7.0" section replacing the 0.6.0 blurb.

### Out of scope

- No `npm publish` — version bump only, publish is a separate manual step.
- No code changes — documentation and version strings only.
- No changes to `pnpm-lock.yaml` or any other package manifest field.

## Implementation plan

1. **Bump `packages/taskflow/package.json`**
   - Change `"version": "0.6.0"` → `"version": "0.7.0"`.

2. **Check and bump `packages/insight-flow-master/package.json`**
   - If a `version` field exists, bump it to `0.7.0` as well.

3. **Write `[0.7.0]` entry in `CHANGELOG.md` (repo root)**
   - Insert above the `## [0.6.0]` line:
   ```markdown
   ## [0.7.0] — 2026-05-26

   ### Fixed

   - **N40** — Master server upserts registrations by project ID instead of
     appending duplicates; eliminates ghost entries after restarts.
   - **N43** — Dashboard sounds no longer replay on socket reconnect. Historical
     idle/permission-needed events from the snapshot are now suppressed;
     only live events play audio.

   ### Added

   - **N41** — Master overview cards reflect real-time Claude session status
     (active / idle / permission-required) with colour-coded card backgrounds and
     a status badge. Project server pushes status fire-and-forget on activity
     events.
   - **N42** — `agents.git.permissions` config block (9 boolean flags) lets
     projects block specific git operations (`push`, `merge`, `createPR`, etc.)
     while keeping others. `task-git` reads the block on every run and prints a
     clear blocked message with the exact config key to change. `insight-flow init`
     scaffolds the block with safe defaults (`forcePush: false`, rest `true`).
   ```

4. **Mirror entry in `packages/taskflow/CHANGELOG.md`**
   - Insert the identical `[0.7.0]` block at the top (above `[0.6.0]`).

5. **Update `packages/taskflow/README.md` "What's new" section**
   - Replace the `## What's new in 0.6.0` heading and its bullets with:
   ```markdown
   ## What's new in 0.7.0

   - **Master overview status** — overview cards show real-time Claude session
     status (active / idle / permission-required) with solid colour backgrounds
     and a badge; pushed fire-and-forget from the project server on activity events.
   - **Git permission gates** — `agents.git.permissions` in `taskflow.config.json`
     controls which git operations `task-git` may perform. Nine boolean flags
     (`createBranch`, `checkout`, `commit`, `push`, `forcePush`, `merge`,
     `deleteBranchLocal`, `deleteBranchRemote`, `createPR`). `forcePush` defaults
     to `false`. `insight-flow init` scaffolds the block automatically.
   - **Sound replay fix** — dashboard no longer plays historical sounds on socket
     reconnect; `isReplayingSnapshot` flag suppresses audio during snapshot replay.
   - **Master server dedup** — registrations are upserted by project ID so ghost
     entries no longer accumulate after server restarts.

   See [CHANGELOG.md](../../CHANGELOG.md) for the full entry.
   ```

## Verification

- `cat packages/taskflow/package.json | grep '"version"'` → `"version": "0.7.0"`.
- `grep "0.7.0" CHANGELOG.md` → shows the new section header.
- `grep "0.7.0" packages/taskflow/README.md` → shows the "What's new" heading.
- `pnpm --dir packages/taskflow run build` passes (version bump doesn't affect TS).

## Notes

- N41 covers both the master server route (`packages/insight-flow-master`) and the project server push (`packages/taskflow/src/server/index.ts`). The changelog entry covers the user-facing feature, not the internal split.
- The root `CHANGELOG.md` says "Full history lives in `packages/taskflow/CHANGELOG.md`" — keep both in sync.
- Related: N40, N41, N42, N43.
