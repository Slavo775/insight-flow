# N251 — Analysis (Pre-Taskmaster)

## Problem framing

User wants the dashboard to know when a newer `insight-flow` is published and surface a toast, plus an "updater agent" to update insight-flow globally and across registered project folders, invokable from the rollout. Emphasis: **security first**.

## Goal

A non-nagging "update available" toast in the master hub, backed by a simple CLI update path — without opening any host-level command-execution surface to the browser.

## Options considered

- **Updater agent:** build a new agent — **rejected**. `task-release-rollout` + `release-project-installer` already do global install + per-project bump from `~/.insight-flow/hub.json`. Reuse it.
- **Toast location:** project dashboard (`:6006`) / master hub (`:6100`) / both — **chose master hub** (it already sees all projects and has the toast plumbing).
- **Toast behavior — the security fork:**
  - **A. Informational (chosen).** Toast displays version + copy-command; browser executes nothing. Zero new attack surface.
  - **B. One-click actuating (rejected).** A button POSTs to the localhost master server to run `npm i -g …`. Any open web page can POST to localhost (CSRF) → host-level RCE-flavored install. Would require CSRF token + Origin/Host checks + fixed non-parameterized command. Not worth the risk now.
- **`insight-flow update` CLI scope:**
  - **1a. Global-only (chosen).** Self-update + point to `/task-release-rollout` for projects. No duplication.
  - **1b. Full per-project loop (rejected).** Duplicates package-manager detection that lives as prose in `release-project-installer`.
- **Version check cadence:** on hub load, cached **12h**; opt-out via `updateCheck` config (default on).

## Decision

Option **A** (informational toast, master hub) + **1a** (global-only CLI) + `updateCheck: { enabled: true, intervalHours: 12 }`. `latest` from npm is untrusted DATA: validate semver, never shell-interpolate.

## Open questions

- Copy-command in toast: suggest `insight-flow update` vs `/task-release-rollout` — TASK.md leads with `insight-flow update`.
- Whether to also reflect version on the project dashboard later (deferred, out of scope).

## Sources

- `packages/taskflow/src/master/server.ts`, `master/client/` (`notif.ts`, `hub-notify.ts`).
- `.claude/commands/task-release-rollout.md` (existing rollout agent + `release-project-installer` subagent).
- `~/.insight-flow/hub.json` (`bulkRegistered` project entries).
- `packages/taskflow/package.json` (current version 2.10.0).

## Handoff brief

feat / medium / tags: dashboard, master, release, security. Add `GET /api/version` (12h-cached npm latest, silent on error) to the master server, a dismissible update toast in the master hub reusing existing toast plumbing, and an `insight-flow update` CLI (global self-update + rollout pointer). Add `updateCheck` opt-out config. No execute-from-browser endpoint; treat npm `latest` as untrusted.
