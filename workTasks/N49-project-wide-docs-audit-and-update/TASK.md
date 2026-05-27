# N49 — project-wide-docs-audit-and-update

**Type:** rework
**Priority:** high
**Created:** 2026-05-26

## Problem

The root `README.md` is stale on three fronts: it describes the dashboard as "React" (it's server-rendered vanilla JS since 0.4.x), its `## Configuration` table lists only 8 of 25+ config keys (missing all of `activityEngine.*` detail, `master.*`, `events.*`, `agents.git.permissions`), and its Claude Code Integration table omits `/taskmaster-change` and `/task-git`. Both CHANGELOGs are also missing entries for N47 (`remoteOps` shorthand) and N48 (README rewrite), and the N42 CHANGELOG entry misdescribes git permissions as "9 boolean flags" when `remoteOps` is a string enum.

## Goal

1. Root `README.md` accurately describes the dashboard as server-rendered (no React mention).
2. Root `README.md` config section updated: trim the inline table to the 5 most-used keys + pointer to `packages/taskflow/README.md` for the full reference (avoids maintaining two full tables).
3. Root `README.md` Claude Code Integration table includes all 9 slash commands (add `/taskmaster-change` and `/task-git`).
4. Root `README.md` `## What You Get` lists `.claude/hooks/` alongside `.claude/roles/`.
5. Both `CHANGELOG.md` and `packages/taskflow/CHANGELOG.md` have correct N42, N47, and N48 entries under `[0.7.0]`.

## Scope

### In scope

- `README.md` (root) — dashboard description, `## What You Get`, `## Configuration` table, `## Claude Code Integration` table.
- `CHANGELOG.md` (root) — fix N42 description; add N47 + N48 under `[0.7.0]`.
- `packages/taskflow/CHANGELOG.md` — same as root CHANGELOG changes.

### Out of scope

- `packages/taskflow/README.md` — just updated in N48; do not touch.
- `AGENT_PROTOCOL.md`, `AGENT_ENFORCEMENT.md`, `AGENT_CONFIG.md`, `PR_API.md` — current.
- `REVIEW_ANALYSIS.md` — intentional point-in-time snapshot (v0.3.1); leave as-is.
- `docs/architecture-diagrams.md` — LLM prompt file; leave for a dedicated diagrams task.
- No source `.ts` files.

## Implementation plan

1. **Fix root `README.md` — dashboard description** (`README.md:130`).
   - Change "The built-in dev server: … Serves task JSON as a REST API … Renders a Kanban board … Watches `workTasks/` for changes and live-reloads via Socket.IO" — keep this block accurate.
   - Remove the stale "bundled React dashboard" reference at line 130.

2. **Fix root `README.md` — `## What You Get`** (`README.md:37-48`).
   - Add `.claude/hooks/` row under `.claude/roles/` in the tree.

3. **Fix root `README.md` — `## Configuration` table** (`README.md:150-159`).
   - Trim to 5 core keys: `workDir`, `shardSize`, `projectName`, `rolesDir`, `server.port`.
   - Remove the 3 extra rows (`activityEngine.enabled`, `notifications.browser`, `notifications.sounds.enabled`) — they are now fully documented in `packages/taskflow/README.md`.
   - Add one line after the table: `> For the full configuration reference (activity engine, notifications, git permissions, events, multi-project master), see [`packages/taskflow/README.md`](packages/taskflow/README.md#configuration).`

4. **Fix root `README.md` — Claude Code Integration table** (`README.md:219-228`).
   - Add `/taskmaster-change` row: "Modifies an existing task spec".
   - Add `/task-git` row: "Branch, commit, push, PR, merge".

5. **Fix CHANGELOG N42 entry** (both files, `[0.7.0]` section).
   - Current: "9 boolean flags". Replace with accurate description that includes `remoteOps: "allow" | "deny"` shorthand (added in N47 as a follow-on) — or split into two: N42 as the original 8-flag config block, N47 as the `remoteOps` shorthand addition.
   - Correct approach: leave N42 entry as "8 boolean flags" (it was 8 at merge time) and add a separate N47 entry.

6. **Add N47 and N48 CHANGELOG entries** (both files, `[0.7.0]` → `### Added` / `### Docs`).
   - N47 `### Added`: "`remoteOps: \"allow\" | \"deny\"` shorthand added to `agents.git.permissions`. Setting `\"deny\"` blocks all origin-touching ops (`push`, `forcePush`, `deleteBranchRemote`, `createPR`) at once; individual boolean flags override the shorthand. `resolveConfig()` applies the shorthand post-merge. Protocol updated in `AGENT_CONFIG.md`."
   - N48 `### Docs`: "`packages/taskflow/README.md` rewritten: `## Install` + `## Quickstart` replaced with a 6-step `## Getting started` guide; `## Configuration` expanded to a complete reference covering all 22 config fields across `TaskflowConfig`, `ActivityEngineConfig`, `NotificationsConfig`, `MasterConfig`, `EventsConfig`. `### What init creates` table lists all scaffolded paths."

## Verification

- `grep -n "React" README.md` returns no matches.
- `grep -n "taskmaster-change\|task-git" README.md` matches rows in the Integration table.
- `grep -n "hooks/" README.md` matches the `## What You Get` tree.
- Both CHANGELOG files contain `N47` and `N48` under `[0.7.0]`.
- `git diff --name-only` shows only `README.md`, `CHANGELOG.md`, `packages/taskflow/CHANGELOG.md`.

## Notes

- Root `README.md` is the npm package page (GitHub + npmjs.com). Keep it tight — full config reference lives in `packages/taskflow/README.md`.
- N42 original implementation had 8 boolean flags (`createBranch`, `checkout`, `commit`, `push`, `forcePush`, `merge`, `deleteBranchLocal`, `deleteBranchRemote`, `createPR` — wait, that's 9 flags). Let me clarify: N42 added the 9-flag block but without `remoteOps`; N47 added `remoteOps` as a 10th field (string, not boolean). The N42 entry "9 boolean flags" is correct for N42 (9 boolean flags). N47 then added `remoteOps` as a string shorthand.
- Related: N47, N48.
