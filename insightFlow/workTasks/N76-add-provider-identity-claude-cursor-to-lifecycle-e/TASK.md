# N76 — Add provider identity (claude/cursor) to lifecycle events + dashboard

**Type:** feat
**Priority:** medium
**Created:** 2026-06-01

## Problem

Lifecycle events have no notion of which editor produced them. `TaskEvent` / `ClaudeHookEvent` / `HookEventInput` (`packages/taskflow/src/types.ts`) and the activity feed carry no provider, and the dashboard hard-codes a "Claude Activity" pane. N75 added Cursor scaffolding (skills + `AGENTS.md`); to show Cursor activity in the dashboard (Task B) we first need a provider id that flows end-to-end. This is **Task A of two** — the additive data-model + UI groundwork that Task B (Cursor hooks) builds on.

## Goal

1. A `provider` field (`"claude" | "cursor"`, optional, defaulting to `"claude"`) on every lifecycle/activity event type + schema.
2. `cmdLogEvent` and the `hook` subcommand accept `--provider` and stamp it through to `events.json`, the activity log, and the `/log/events` POST.
3. The dashboard renders a unified "Agent Activity" feed with a per-row claude/cursor badge.
4. **Zero behavior change for existing Claude events** — absent provider is treated as `claude`.

## Scope

### In scope

- `packages/taskflow/src/types.ts` — add `provider?: "claude" | "cursor"` to `TaskEvent`, `ClaudeHookEvent`, `HookEventInput`, `ActivityEvent`; export a `Provider` type.
- `packages/taskflow/src/schema/index.ts` — add optional `provider` enum to `TaskEventSchema`, `ClaudeHookEventSchema`, `HookEventInputSchema` (+ events file schema if needed).
- `packages/taskflow/src/commands/log-event.ts` — parse `--provider` (default `claude`); stamp on the hook/agent event, the activity-log entry, and the `hookEventPostPayload`.
- `packages/taskflow/src/cli.ts` — thread `--provider` through the `hook` subcommand.
- `packages/taskflow/src/server/index.ts` — ensure `provider` survives on the `io.emit("event")` / `io.emit("activity")` frames (the whole event is already forwarded; verify the synthetic activity→event bridge preserves it or defaults claude).
- `packages/taskflow/src/server/dashboard.ts` — relabel the "Claude Activity" pane to "Agent Activity"; render a per-row provider badge (reuse `activity-badge` CSS; add a `cursor` variant class).
- Tests (`packages/taskflow/test/`) — provider defaulting + badge rendering / payload stamping.

### Out of scope

- Cursor hook scripts, `.cursor/hooks.json` generation, the `insight-flow hook` Cursor payload normalization, and adding Cursor event names to `statusFromEvent` → **Task B**.
- Any notifications wiring → Task B.
- OpenAI/Codex provider.

## Implementation plan

1. **Types** — add `export type Provider = "claude" | "cursor";` and an optional `provider?: Provider` to `TaskEvent`, `ClaudeHookEvent`, `HookEventInput`, `ActivityEvent` in `types.ts`.
2. **Schemas** — mirror with `provider: z.enum(["claude","cursor"]).optional()` on the matching Zod schemas in `schema/index.ts`. Confirm `HookEventInputSchema.safeParse` still accepts payloads with no provider.
3. **log-event** — read `opts.provider` (default `"claude"`); add it to the `ClaudeHookEvent`, the `TaskEvent`, the activity entry, and `hookEventPostPayload`.
4. **cli hook subcommand** — pass `--provider` through to `cmdLogEvent` (alongside `source`/`hook-name`).
5. **server** — verify `/log/events` carries `provider` on the broadcast `event` frame; in the activity→synthetic-event bridge (`index.ts` ~L719) default `provider` to `claude` (or copy from the activity row).
6. **dashboard** — relabel pane to "Agent Activity"; in the activity-row renderer add a small badge showing `claude`/`cursor` (default claude when absent); add a `.activity-badge-cursor` color.
7. **tests** — assert: absent `--provider` → event/payload has `provider: "claude"`; `--provider cursor` → `"cursor"`; dashboard HTML/badge logic renders the cursor variant.

## Verification

- `pnpm --dir packages/taskflow run build` + `npx tsc --noEmit` clean.
- `insight-flow log-event start --provider cursor` (with a current task) writes an event tagged `provider: "cursor"` in `events.json` and POSTs it.
- `insight-flow log-event start` (no flag) writes `provider: "claude"` (or absent-treated-as-claude) — existing behavior intact.
- Dashboard shows the unified "Agent Activity" feed; a cursor-tagged event renders the cursor badge.
- `pnpm --dir packages/taskflow test` passes incl. new provider tests; no regression in existing event/log-event tests.

## Notes

- Companion: **Task B** (Cursor hooks → dashboard via binary payload parsing) depends on this. Design recorded in N75's `ANALYSIS.md` ("Phase-2 design — approval → sound + push") + this folder's `ANALYSIS.md`.
- Keep `provider` OPTIONAL in schemas so old `events.json` files + in-flight Claude hooks validate unchanged.
- Dashboard UX decision (locked): unified feed + per-row badge (scales to a future OpenAI provider), not a separate pane.
- `statusFromEvent` stays untouched here — provider is descriptive metadata, not status-bearing.
