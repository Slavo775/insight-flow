# N208 — Composer-first init — install composer flow on init, install-flow command, default flow opt-in

**Type:** feat
**Priority:** high
**Created:** 2026-07-09

> **Scope reduced (2026-07-10).** Delivered: the **`insight-flow install-flow <id>` command** (the reusable primitive). **Composer-first init is deferred to a follow-up** — implementing it revealed a real blocker: init's `skills` list is shared across providers, so dropping the default `task-*` commands strips them from **Cursor** too (the composer flow emits Claude artifacts only), and a byte-identical baseline test pins init's output. That needs a **per-provider skills refactor**, done carefully — see the follow-up task. Everything below marked "deferred" is out of this task.

## Problem

`insight-flow init` starts every project on the **default task flow** (scaffolds `.claude/commands/task-*.md` and treats `default` as the flow). The human wants **composer-first onboarding**: a fresh project starts with the **composer flow** (for building flows/agents/modules), and the **default flow becomes opt-in** — the user installs it (`insight-flow install-flow default`) or builds their own. Today there's no "install a flow" CLI, and `default` is the hard-coded create fallback. Task B of the init review; see `ANALYSIS.md`.

## Goal

1. New **`insight-flow install-flow <id>`** CLI command — installs a built-in/custom flow's artifacts (commands + subagents + `mcp-server` + hooks) via `executeInstall`.
2. **`init` installs the composer flow by default** (`composer-authoring` artifacts) instead of the default flow's `task-*` commands.
3. **Soft default** — stop scaffolding/promoting the default flow; keep it as the non-fatal `create` fallback; add a hint + docs.
4. Docs describe the new first-run.

## Scope

### In scope

- `packages/taskflow/src/cli/cli.ts` + a new `packages/taskflow/src/cli/commands/install-flow.ts` — the `install-flow <id>` command (validates the flow id against the merged registry; calls `executeInstall`; reports what was emitted).
- `packages/taskflow/src/agents/init/index.ts` (+ `providers/*` as needed) — after the baseline scaffold, **install `composer-authoring`** (via the install-flow path / `executeInstall`) rather than scaffolding the default flow's `task-*` commands. Keep the shared baseline (security/enforcement/protocol/skill assets, editor providers, activity hooks from N207).
- `packages/taskflow/src/cli/commands/create.ts` — a **non-fatal hint** when a task is created while no flow's commands are installed (e.g. "using the built-in `default` flow — run `insight-flow install-flow default` for its `/task-*` commands, or build your own with the composer"). Do **not** change the fallback resolution (still `… ?? "default"`).
- Docs: `website/docs/get-started/*` (or the getting-started page), `packages/taskflow/README.md` — the new first-run + `install-flow`.
- Tests: `install-flow` command + init installs composer (init integration test).

### Out of scope

- **Hard** removal of the `default` create fallback (rejected — soft only).
- Non-coder / global project-less onboarding (separate future effort, per Spike C).
- Changing the composer flow's own definitions (done in N200–N206).
- `agents.extend` / events defaults (done in N207).

## Implementation plan

1. **`install-flow` command.** Add `cli/commands/install-flow.ts`: resolve `<id>` in the merged flow registry (built-ins + user-space); if unknown, error with the known ids. Call `executeInstall({ kind: "flow", id }, …)` (same engine the composer MCP uses) and print the emitted artifacts (commands / subagents / mcp / hooks). Wire it into `cli.ts` (`command === "install-flow"`) + the help text. Verify idempotency (re-run is safe).
2. **init installs the composer flow.** In `agents/init/index.ts`, after the baseline scaffolding, install `composer-authoring` (call the same `executeInstall` path or the new command's core). Stop scaffolding the default flow's `task-*` command files for a fresh init. Keep: the shared assets, editor providers, and the N207 activity default. Decide re-init semantics (don't delete a user's existing flow commands; add composer if missing).
3. **Soft default + create hint.** In `create.ts`, when the resolved flow is `default` **and** the default flow's commands aren't installed in the project, print a one-line hint (non-fatal) pointing at `install-flow default` / the composer. Leave the fallback chain intact.
4. **Docs.** Update getting-started + README: the new first-run (init → composer; `install-flow default` for the standard lifecycle, or build your own). Note the composer is the entry point now.
5. **Tests.** `install-flow` installs a flow's artifacts; a fresh `init` emits `task-authoring-*` (composer) and the `.mcp.json` composer entry; `create` still works (falls back to `default`) and prints the hint.

## Verification

- `pnpm --dir packages/taskflow run build` ✅ and `pnpm --dir packages/taskflow test` ✅.
- `insight-flow install-flow default` and `insight-flow install-flow composer-authoring` in a throwaway project emit the expected `.claude/commands/*`, `.claude/agents/*`, and `.mcp.json` entries; re-running is idempotent; unknown id errors with the known list.
- A fresh `insight-flow init` produces the **composer** commands (`task-authoring-*`) + `mcp-composer`, and **not** the default `task-*` commands.
- `insight-flow create …` in that project still succeeds (falls back to `default`) and prints the install-flow hint.
- Docs show the composer-first first-run.

## Notes

- Task B of the init review (N207 = A shipped; Spike C = global not feasible, deferred). Stacked on `feat/N207-init-quick-wins` (both touch `init/index.ts`); merge into `agents-approved`.
- Reversible: the `default` flow and its commands remain installable; composer-first is the new *default*, not a removal.
- Biggest risk is init behaviour for every new project — verify a real `init` end-to-end, and keep re-init non-destructive.
