# N170 — insight-flow rename command to update a task title

**Type:** feat
**Priority:** low
**Created:** 2026-06-22

## Problem

There's no CLI to change a task's title (or type/priority) after creation. When a task is reframed or rescoped, the `TASK.md` title diverges from the shard's stored title (the board shows the stale one), and the enforcement rules forbid hand-editing the shard JSON — so there's no sanctioned fix. Hit on N165 (title) and N167 (type fix→feat).

## Goal

1. `insight-flow rename --id Nxx --title "..."` updates the stored title through the storage layer.
2. Optional `--type` / `--priority` to keep reframed tasks consistent.
3. The change is schema-validated and persisted; no direct shard edits.

## Scope

### In scope

- `src/cli/cli.ts` + a new `src/cli/commands/rename.ts` — parse args, load task, set fields, persist via `storage.ts`.
- Help text + the command list.

### Out of scope

- Renaming the task **folder**/slug or branch (kept stable — referenced elsewhere).
- A generic multi-field `update` command (out of scope; this is focused).

## Implementation plan

1. **Command** — add `rename` to the CLI dispatcher with `--id` (required) + `--title` / `--type` / `--priority` (at least one required).
2. **Mutate** — load the task via storage, set the provided fields, re-validate against the Zod schema, persist (the shard write path that other commands use).
3. **Output** — print the updated `{ id, title, type, priority }` as JSON (parity with other commands).
4. **Guardrails** — reject unknown ids; leave `folder` untouched.

## Verification

- `insight-flow rename --id Nxx --title "New title"` → `insight-flow show --id Nxx --summary` reflects it; the dashboard board shows the new title.
- `pnpm --dir packages/taskflow test` passes (add a rename round-trip test).

## Notes

- Closes the metadata-edit gap from N165 (title mismatch) and N167 (type reframe). See ANALYSIS.md.
