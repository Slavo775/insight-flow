# N77 — Analysis (pre-taskmaster strategist audit trail)

_Produced by `/task-analyze` on 2026-06-01, before handoff to `/taskmaster`. Task B of two._

## Problem framing

N75 gave Cursor static scaffolding; N76 adds the `provider` id end-to-end. What remains for "Cursor working with the dashboard" is the **live plumbing**: Cursor must fire lifecycle events into `/log/events` and trigger notifications. The Claude pipeline does this via `.claude/hooks/lifecycle-*.sh` (bash that greps Claude's stdin) plus `statusFromEvent` keyed to Claude's PascalCase hook names. Cursor's hook surface differs in every concrete way — `.cursor/hooks.json`, camelCase events, `conversation_id` instead of `session_id`, `CURSOR_PROJECT_DIR`, and a permission model where hooks *return* allow/deny/ask rather than firing a `PermissionRequest` event.

## Goal

Make Cursor fire events + notifications into the dashboard with minimal per-editor surface, by moving payload parsing into the binary and generating thin Cursor hooks. Reuse the already-editor-agnostic server / `notify` / `/api/agent-done` / sound machinery.

## Options considered

**Where Cursor payload parsing lives:**
1. **In the binary** — `insight-flow hook <event> --provider cursor` reads stdin + normalizes shapes/names in TS (**chosen**). Cursor (and Claude) hook scripts shrink to `cat | insight-flow hook …`; `statusFromEvent` gets Cursor names in one tested place; far less fragile than bash grep. (This was flagged as the high-leverage option in N75's ANALYSIS.)
2. Per-editor bash scripts grepping `conversation_id` — rejected: duplicates fragile parsing, spreads editor-specifics across shell.

**Status derivation:**
- Add Cursor raw names to `statusFromEvent` (chosen) OR have Cursor scripts emit only derived dash-case. Since parsing moves into the binary anyway, mapping Cursor names there + in `statusFromEvent` is cohesive and testable.

**Approval → sound + push (no Cursor `PermissionRequest`):**
- Gate on `beforeShellExecution`/`preToolUse` with a conservative matcher, emit `approval-required` (→ dashboard `awaiting-permission`, already handled) + `insight-flow notify`, and return `{"permission":"ask"}` — never auto-`allow` (chosen; matches N75 ANALYSIS "Phase-2 design"). Notify-only (return `allow`) was the weaker alternative.

**Provider seam integration:**
- Add `writeHooks(ctx)` to the `EditorProvider` interface; cursor implements it; Claude keeps its existing `.claude` hook installers (chosen) — keeps the N75 seam the single place editors plug in.

## Decision

Move hook parsing into `insight-flow hook` (Cursor stdin + event-name normalization), teach `statusFromEvent` Cursor names, generate `.cursor/hooks.json` + thin scripts via a new `writeHooks` provider step, add a Cursor `stop` notify hook + the approval→ask gate, and surface it all in the N76 unified feed with the cursor badge. Claude behavior stays byte-identical.

## Open questions

1. Should `insight-flow hook` auto-detect provider from stdin shape, or always require `--provider`? (Lean: require `--provider` from the generated script; auto-detect as a fallback.)
2. Exact "sensitive op" matcher set for the approval gate (`git push`, `rm -rf`, deploy…) — start conservative, make it configurable later via `taskflow.config.json`?
3. Should the shared parser also back-fill Claude's bash hooks (replace grep with `insight-flow hook`)? Tempting for unification but risks regressing Claude; keep out of scope unless trivial.
4. `loop_limit`/`failClosed` semantics for the Cursor gate hook (from cursor.com/docs/hooks) — pick safe defaults.

## Sources

- N75 `ANALYSIS.md` — "Phase-2 design — approval → sound + push on Cursor"; Claude→Cursor hook mapping; cloud-agent caveat. Cursor hook facts originally from cursor.com/docs/hooks (fetched as data in N75).
- Repo: `packages/taskflow/src/{cli.ts (hook subcommand + RAW_TO_DERIVED), commands/log-event.ts, server/event-stream.ts (statusFromEvent), server/index.ts (/log/events, /api/agent-done), activity-hook.ts, notify-hook.ts, init/providers/*}`.
- N76 (`provider` id) — hard dependency.

## Handoff brief (as sent to /taskmaster)

> **Title:** Cursor lifecycle hooks to dashboard via binary payload parsing · **Type:** feat · **Priority:** medium · **Tags:** cursor, multi-editor, hooks, dashboard, events, notifications
>
> Move hook payload parsing into the binary: `insight-flow hook <event> --provider cursor` normalizes Cursor's stdin shape (`conversation_id`) + event names → derived types; `statusFromEvent` learns Cursor names. Generate `.cursor/hooks.json` + thin scripts via a new `writeHooks` step on the cursor provider (N75 seam), tagging events `--provider cursor`. Add a Cursor `stop` notify hook (reusing `insight-flow notify` + `/api/agent-done`) and the approval→sound→push gate (`beforeShellExecution` returns `ask` on a conservative matcher + emits `approval-required`). Cursor activity then shows in the N76 unified feed with the cursor badge. Depends on N76. Caveat: Cursor cloud agents don't fire session/prompt hooks.
