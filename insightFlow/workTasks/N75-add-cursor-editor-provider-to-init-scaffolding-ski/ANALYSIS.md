# N75 — Analysis (pre-taskmaster strategist audit trail)

_Produced by `/task-analyze` on 2026-05-29, before handoff to `/taskmaster`._

## Problem framing

The human wants insight-flow's task-lifecycle integration available in **Cursor** (and, next, **OpenAI/Codex**) — "hooks, agents, and everything." The open question was whether everything is shared or some pieces must be editor-specific.

Investigation showed insight-flow is **~80% editor-agnostic** already. The integration is four layers, only the top of which is Claude-specific:

| Layer | What it is | Claude-coupled? |
|---|---|---|
| 1. CLI engine | `insight-flow` binary — task JSON state, dashboard server, `log-event`, all subcommands | **No.** Cursor runs the same binary unchanged. |
| 2. Skills (agents) | `.claude/commands/*.md` thin prompts → canonical bodies in `.claude/roles/TASK_*_ROLE.md` | Format/location only; bodies are canonical. |
| 3. Hooks | `.claude/hooks/*.sh` (bash grep on stdin JSON) + registration in `.claude/settings.json` | **Most coupled & most fragile.** |
| 4. Context file | `CLAUDE.md` marker section | Filename only. |

The engine needs no changes. What differs per editor is a thin **adapter**: skill file format/location, hook config/event-names/stdin-fields, and the context-file target.

### Claude → Cursor mapping (from cursor.com/docs/hooks + /skills, treated as reference data)

- **Skills:** Cursor has a near-equivalent. `.claude/commands/<name>.md` (flat, `$ARGUMENTS`) → `.cursor/skills/<name>/SKILL.md` (folder + YAML frontmatter `name`/`description`, invoked `/<name>`). Bodies port almost verbatim; **Cursor skills do not substitute `$ARGUMENTS`**, so bodies must read the user's message naturally.
- **Hooks (deferred):** same concept, different everything — `.cursor/hooks.json` `{version:1,...}` vs `.claude/settings.json`; camelCase events (`sessionStart`/`beforeSubmitPrompt`/`stop`/`preToolUse`/`postToolUse`) vs Pascal; stdin uses `conversation_id` not `session_id`; env `CURSOR_PROJECT_DIR` (aliases `CLAUDE_PROJECT_DIR`) but no session-id env. The current bash hooks grep `"session_id"`/`"tool_name"` and would silently no-op on Cursor.
- **Context file:** Cursor reads `.cursor/rules/*.mdc` / `AGENTS.md`, not `CLAUDE.md`.

## Goal

Add a provider seam so the canonical role bodies + context section render to multiple editors from one source; ship a working **Cursor** integration (skills + rules) now; keep the engine untouched; make a future OpenAI/Codex provider additive.

## Options considered

1. **Provider seam (CHOSEN).** Editor-aware scaffolding layer; canonical sources single; each provider renders. Scales additively to a 3rd editor. Upfront design cost.
2. **Provider seam + move hook parsing into the binary.** The seam plus replacing fragile bash-grep hooks with `insight-flow hook <event> --editor X` (testable TS normalization). Highest robustness; larger refactor. *Not chosen now — relevant to the deferred Phase-2 hooks task.*
3. **Parallel Cursor scaffolder (copy-paste).** Fastest, but duplicates role content + hook-intent logic; every future change becomes 2× (3× with Codex). Rejected.

Scope/phasing options:
- **Skills + rules first (CHOSEN)** — working Cursor workflow now; hooks/live-dashboard deferred to Phase 2. Rationale: hooks only feed the dashboard's live activity feed + OS notifications (activity engine is opt-in); the whole create→implement→review→git workflow is CLI + skill prompts and needs no hooks.
- Full parity in one task — larger, drags in the parity caveats. Deferred.
- Hooks first — rejected (workflow wouldn't run in Cursor yet).

## Decision

- **Architecture:** Provider seam (option 1). Engine untouched. Canonical bodies single-source.
- **Phase 1 (this task, N75):** `cursor` provider for **skills + rules** only; refactor existing Claude path into a `claude` provider (output-identical); add `insight-flow init --editor claude|cursor|all` with auto-detect default.
- **Phase 2 (separate future task):** port hooks / live-dashboard streaming to Cursor — `.cursor/hooks.json`, event-name map, stdin field normalization (and revisit "move hook parsing into the binary").
- **Next editor:** OpenAI/Codex — shape the seam to make it additive; do not build it now.

## Open questions (carried into TASK.md)

1. ~~Cursor rules-file target~~ → **RESOLVED: root `AGENTS.md`** (verified 2026-05-30 against cursor.com/docs/rules; shared with the future OpenAI/Codex provider). Use a marker-section merge like `CLAUDE.md`. (`.cursor/rules/*.mdc` with `alwaysApply: true` is the Cursor-only alternative.)
2. Re-render policy on existing provider files: overwrite vs skip (mirror current Claude skip-unless-`--force`).
3. `scripts/sync-role-templates.mjs` interaction with per-provider rendering at publish.

## Parity caveats (for the Phase-2 hooks task, not this one)

- Cursor has **no clean equivalent** of Claude's `PermissionRequest` event (the "approval required" bell/notify); Cursor's permission flow is hooks *returning* allow/deny/ask. See the recorded design below.
- Cursor **cloud agents** don't fire session/prompt-lifecycle hooks → the live dashboard would be partial there. (But command-based `.cursor/hooks.json` hooks, incl. `beforeShellExecution`, *do* run in cloud VMs.)

## Phase-2 design — approval → sound + push on Cursor (recorded 2026-05-30, per human request)

_Not in N75 scope (N75 = skills + rules). Captured here as the design for the deferred Phase-2 hooks task._

**Goal:** reproduce Claude's `lifecycle-permission.sh` UX — when the agent needs approval, ring a sound + send a push to the user.

**Key insight — the notification channels are already editor-agnostic:**
- **OS push** = `insight-flow notify "Approval required"` (CLI; callable from any editor's hook).
- **Sound + browser notification** = the dashboard plays them when it receives an event over the WebSocket (N62 sound work). The hook only needs to emit `insight-flow log-event approval-required …`; the dashboard makes the sound. No editor-side audio required.

So "sound + push" is reused as-is; the only Cursor-specific work is *which hook fires the event* and parsing its payload.

**Cursor mechanism:** Cursor has no `PermissionRequest` event. Its permission hooks (`beforeShellExecution`, `preToolUse`, `beforeMCPExecution`) **return** `{"permission":"allow|deny|ask"}` — they are the gate, not an observer. Wire a command hook in `.cursor/hooks.json` with a `matcher` for sensitive ops. The script:
1. Reads stdin JSON (Cursor shape: `conversation_id`, `command`, … — NOT Claude's `session_id` / `tool_name`).
2. `insight-flow log-event approval-required …` → dashboard sound + browser push.
3. `insight-flow notify "Approval required"` → OS push.
4. Outputs the permission decision.

**Two trigger designs:**
- **Notify + gate (recommended):** return `"ask"` on matched sensitive patterns (`git push`, `rm -rf`, deploy…); never auto-`"allow"`. Closest to Claude's approval pause.
- **Notify-only:** return `"allow"`; heads-up ping without pausing. Faithful to Cursor's own flow but weaker.

**Caveat:** *we* define "what's sensitive" via the matcher — Cursor exposes no observe-only "now asking the user" event, so the gate design can insert an approval where Cursor would have auto-run.

**Related event-name / payload mapping (whole Phase-2 hooks port):** Claude `Stop`→Cursor `stop`; Claude `PermissionRequest`→Cursor `beforeShellExecution`/`preToolUse` (this design); stdin `conversation_id` not `session_id`; env `CURSOR_PROJECT_DIR` (aliases `CLAUDE_PROJECT_DIR`), no session-id env.

## Sources

- `cursor.com/docs/hooks` — hook events, `.cursor/hooks.json` format, stdin/env, permission outputs (fetched as data).
- `cursor.com/docs/skills` — `.cursor/skills/<name>/SKILL.md`, frontmatter schema, invocation (fetched as data).
- `cursor.com/docs/rules` — confirms `AGENTS.md` (root + subdirs) + `.cursor/rules/*.mdc` (frontmatter `alwaysApply`/`description`/`globs`); `.cursorrules` gone from docs (fetched as data, 2026-05-30).
- Repo: `packages/taskflow/src/init/index.ts`, `packages/taskflow/src/activity-hook.ts`, `.claude/settings.json`, `.claude/hooks/*.sh`, `CLAUDE.md`.

## Handoff brief (as sent to /taskmaster)

> **Title:** Add Cursor editor provider to init scaffolding (skills + rules) via a provider seam · **Type:** feat · **Priority:** medium · **Tags:** cursor, multi-editor, providers, init, scaffolding
>
> Introduce an editor-provider seam in the init/scaffolding layer so canonical role bodies + the context section render from a single source (engine untouched). Refactor the existing Claude scaffolding into a `claude` provider (output-identical), then add a `cursor` provider emitting `.cursor/skills/<name>/SKILL.md` (frontmatter, no `$ARGUMENTS`) + a Cursor rules file. Add `insight-flow init --editor claude|cursor|all` (auto-detect default). Defer hooks/live-dashboard porting to a Phase-2 task; shape the seam so an `openai`/`codex` provider is purely additive.
