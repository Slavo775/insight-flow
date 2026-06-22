# N170 — insight-flow rename command to update a task title — Analysis

**Created:** 2026-06-22
**Author:** task-analyze

## Problem framing

- There is **no CLI to change a task's title** (or other metadata like `type`) once created. `insight-flow create` sets them; nothing updates them.
- This bit twice this session: N165's scope was broadened so its `TASK.md` title diverged from the shard's stored title (the board showed the old one), and N167 was reframed from `fix`→`feat` but the shard still records `type: fix`. The enforcement rules forbid hand-editing the shard JSON, so there's no sanctioned path to fix the metadata.

## Goal

1. A sanctioned command to update a task's **title** through the CLI (validated, audit-trailed) — no direct shard edits.
2. (Stretch) the same command updates `type` / `priority` so reframed tasks stay consistent.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — `insight-flow rename --id Nxx --title "..."` (+ optional `--type`/`--priority`) | Direct, matches the gap; goes through storage validation | New command + storage mutation | S |
| B — Reuse a generic `update` command | One command for many fields | Bigger surface; over-general for now | M |
| C — Do nothing (hand-edit shards) | No work | Violates enforcement (no direct shard edits); error-prone | — |

## Decision

- Chosen option: **A** — a focused `rename` command (with optional `--type`/`--priority`), routed through `storage.ts` so the shard stays schema-valid and the change is recorded.

## Open questions

- `[non-blocking]` Should renaming also update the task **folder** name (slug)? Recommend **no** — folder/branch slugs are referenced elsewhere; rename title only, leave the folder id stable.
- `[non-blocking]` Emit a `statusHistory`-style audit entry, or a lighter touch? Keep it simple — update the field + persist.

## Sources

- `packages/taskflow/src/core/storage.ts`, `src/cli/cli.ts` (+ `src/cli/commands/`), `AGENT_ENFORCEMENT.md` (no direct shard edits) — provenance: analyzer-discovered, trust: high, fetched: 2026-06-22.

## Handoff brief

- Title: insight-flow rename command to update a task title · type: feat · priority: low. Add `insight-flow rename --id Nxx --title "..."` (optionally `--type`/`--priority`) that mutates the task through `storage.ts` (schema-validated, no direct shard edits) and leaves the folder slug stable. Closes the metadata-edit gap that surfaced on N165 (title) and N167 (type).
