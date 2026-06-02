# N76 — Analysis (pre-taskmaster strategist audit trail)

_Produced by `/task-analyze` on 2026-06-01, before handoff to `/taskmaster`. Task A of two._

## Problem framing

N75 shipped Cursor **scaffolding** (skills + `AGENTS.md`) but explicitly deferred dashboard/live-event integration. The human asked for Cursor events to fire into the dashboard, notify the user, and carry a **`provider` id (claude/cursor)**. Reading the live pipeline (`server/index.ts`, `event-stream.ts`, `commands/log-event.ts`, `schema/index.ts`, `dashboard.ts`, `notify-hook.ts`) showed the server, `EventStore`, `/log/events`, `insight-flow notify`, and the sound/browser-notif machinery are already editor-agnostic; the Claude coupling is in (1) the hook scripts, (2) `statusFromEvent` raw-name matching, and (3) the absence of any provider identity + a hardcoded "Claude Activity" pane.

The work splits cleanly: **(A) provider-id plumbing** — additive, helps Claude too, unblocks tagging; and **(B) Cursor hooks** — the bulk (`.cursor/hooks.json`, binary payload parsing, notifications). This task is **A**.

## Goal

Add an optional `provider` ("claude" | "cursor", default claude) end-to-end through the event data model + dashboard, with zero behavior change for existing Claude events. Render a unified "Agent Activity" feed with a per-row provider badge.

## Options considered

**Status derivation for Cursor (deferred to B, but shaped here):**
1. Move hook parsing into the binary — `insight-flow hook --provider cursor` normalizes stdin + event names in TS (**chosen**, Task B). Keeps the server editor-agnostic; provider is just metadata here in A.
2. Per-editor bash scripts duplicating grep logic — rejected (fragile, spreads editor-specifics).

**Dashboard UX:**
1. Unified "Agent Activity" feed + per-row claude/cursor badge (**chosen**) — smallest change, scales to a future OpenAI provider.
2. Separate "Cursor Activity" pane — more UI, doesn't scale.
3. Relabel only — too little.

**Scope/sequencing:**
1. Split, provider-id first (**chosen**) — A is small/additive and a prerequisite; B is the bulk. Incremental, cleaner reviews.
2. One combined task — large, spans data model + hook generation + UI.

**Provider field shape:** optional enum defaulting to `claude` (**chosen**) so old `events.json` + in-flight Claude hooks validate and behave unchanged. A required field would break back-compat.

## Decision

Ship the additive `provider` plumbing (types + schema + `--provider` on `cmdLogEvent`/`hook` + server frame pass-through + dashboard unified feed/badge). `statusFromEvent` untouched. Everything back-compatible (absent → claude). Cursor hook generation, `insight-flow hook` Cursor normalization, `statusFromEvent` Cursor names, and notifications are **Task B**.

## Open questions

1. Should the activity→synthetic-event bridge in `server/index.ts` (~L719) copy `provider` from the activity row, or always default `claude`? (Default claude is safe for A; revisit in B.)
2. Exact badge placement/colour in the activity row — implementer's call, reuse `activity-badge` palette.
3. Whether `EventsFileSchema` needs the provider added too (only if mixed old/new events must round-trip) — likely yes, optional.

## Sources

- Repo: `packages/taskflow/src/{types.ts, schema/index.ts, commands/log-event.ts, cli.ts, server/index.ts, server/event-stream.ts, server/dashboard.ts, notify-hook.ts}` (read during analysis).
- N75 `ANALYSIS.md` — "Phase-2 design — approval → sound + push on Cursor" + the 4-layer coupling model.

## Handoff brief (as sent to /taskmaster)

> **Title:** Add provider identity (claude/cursor) to lifecycle events + dashboard · **Type:** feat · **Priority:** medium · **Tags:** multi-editor, providers, dashboard, events, cursor
>
> Thread an optional `provider` ("claude"|"cursor", default claude) through `TaskEvent`/`ClaudeHookEvent`/`HookEventInput`/`ActivityEvent` + Zod schemas; accept `--provider` in `cmdLogEvent` + the `hook` subcommand and stamp it on event/activity/`/log/events` payload; carry it on the server socket frames; render a unified "Agent Activity" dashboard feed with a per-row claude/cursor badge. Fully back-compatible (absent → claude). Cursor hooks / `statusFromEvent` Cursor names / notifications are out of scope (Task B).
