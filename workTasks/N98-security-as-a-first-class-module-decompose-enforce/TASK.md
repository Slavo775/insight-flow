# N98 — Security as a first-class module — decompose enforcement, baseline trio on every agent

**Type:** rework
**Priority:** medium
**Created:** 2026-06-12

## Problem

- `AGENT_SECURITY.md` (the prompt-injection guardrails) reaches agents invisibly: `buildEnforcementBlock()` (cli/commands/prompt-build.ts) generates `AGENT_ENFORCEMENT.md` with `@AGENT_SECURITY.md` as its first line. Security is therefore nested file-side — absent from the registry, agent compositions, and dashboard maps (the same invisibility disease N97 fixed for task-git).
- `protocol` is already a flat module but `task-git` is the only agent missing it (N97 fidelity rule kept it out).

## Goal

1. New `security` include module (`@AGENT_SECURITY.md`) in the registry, referenced **first** by all 10 composed defs — generated include blocks read `@AGENT_SECURITY.md` / `@AGENT_ENFORCEMENT.md` / `@AGENT_PROTOCOL.md` (task-git: notify/config then the trio per its existing order), preserving today's effective reading order.
2. `buildEnforcementBlock()` no longer emits the `@AGENT_SECURITY.md` line — `AGENT_ENFORCEMENT.md` becomes enforcement-only; consumers heal automatically (the file is regenerated on every `prompt-build --apply`).
3. `protocol` wired into `task-git` — every agent carries the visible baseline trio security/enforcement/protocol. Conscious prompt change (human-acked 2026-06-12): task-git gains the full shared-protocol text.
4. All 10 roles regenerated; drift suite ×10 green; dashboard maps show the security node on every agent.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/security.json` (new include module, description).
- `packages/taskflow/src/agents/composed/*.json` — all 10 defs: `security` first; `task-git` additionally gains `protocol` (after `enforcement`).
- `packages/taskflow/src/agents/compose.ts` — import/register `security`.
- `packages/taskflow/src/cli/commands/prompt-build.ts` — `buildEnforcementBlock()` drops `lines.push("@AGENT_SECURITY.md")`; repo-root `AGENT_ENFORCEMENT.md` regenerated via `prompt-build --apply`.
- The 10 root `*_ROLE.md` — regenerated via compose-apply only (diff: +1 include line ×9, +2 for task-git).
- `packages/taskflow/templates/roles/` via `sync-role-templates.mjs` (AGENT_SECURITY.md already in the sync list).
- Tests (`compose.test.mjs`): registry asserts `security` is an include with the right ref; new assertion — every composed def's modules include the baseline trio; drift suite picks up regenerated files.

### Out of scope

- Any content change to `AGENT_SECURITY.md` or `AGENT_PROTOCOL.md`.
- A convenience `baseline` bundle — deliberately NOT used for the shipped defs (each baseline module must stay individually visible on the maps); can be added later for custom agents.
- Project-layer/flow changes; emitter changes.

## Implementation plan

1. **Module + wiring** — author `modules/security.json`; register in compose.ts; insert `"security"` at position 0 in nine defs and appropriately in `task-git` (before its includes? — order: keep task-git's notify/config first as today, then security/enforcement/protocol; or security absolutely first — implementer picks ONE order and applies it consistently with the stated reading-order goal, documenting the choice); add `"protocol"` to task-git after `enforcement`.
2. **Enforcement decomposition** — remove the security line from `buildEnforcementBlock()`; run `prompt-build --apply` to regenerate the repo-root `AGENT_ENFORCEMENT.md`.
3. **Regenerate + sync** — `prompt-build --compose --apply` (all 10 updated); `sync-role-templates.mjs`.
4. **Tests** — security module assertions + baseline-trio-per-agent test; suite green.
5. **Consumer sanity** — fresh-init smoke: scaffolded roles include the security line; regenerated consumer `AGENT_ENFORCEMENT.md` lacks the embedded include; no double-include of security anywhere (grep the generated files).

## Verification

- `pnpm build` + full suite green; compose-apply reports all 10 `unchanged` after the regenerated files are committed.
- `grep -c "@AGENT_SECURITY.md" *_ROLE.md` → exactly 1 per role file; `grep -c "@AGENT_SECURITY" AGENT_ENFORCEMENT.md` → 0.
- Fresh-init smoke passes; `/agent/task-implement` map shows the `security` node.

## Notes

- Same visibility rationale as N97: cross-cutting baselines belong flat and per-agent, not nested in another file.
- `AGENT_ENFORCEMENT.md` is generated from code (`buildEnforcementBlock`), not composer data — the enforcement *file* changes via the code edit, the role files via compose-apply. Two generators, both must be re-run.
- Branches from main (post N93–N97 merge).
