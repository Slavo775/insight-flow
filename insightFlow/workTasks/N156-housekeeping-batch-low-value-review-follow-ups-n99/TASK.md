# N156 — housekeeping batch — low-value review follow-ups (N99-N150)

**Type:** chore
**Priority:** low
**Created:** 2026-06-18

## Problem

- A pile of low-value, safe polish items surfaced across N99–N150 review follow-ups (see N151 ANALYSIS.md). Individually too small to track; bundled here as one housekeeping pass. Implementer does the cheap, still-applicable ones and notes any that turn out non-trivial or moot.

## Goal

1. Knock out the trivial, low-risk polish items below.
2. Skip (with a one-line note) any candidate that's already moot post-N150 or turns out non-trivial.
3. No behavior change beyond the listed polish; gates stay green.

## Scope

### In scope (candidates — verify each is still applicable first)

- **DRY `LOCKED_MODULE_IDS`** into a shared zod/fs-free constants module imported by server (`agents/user-registry.ts`) and client (`dashboard/client/locked.ts`) so the lock set can't drift (N119/N143).
- **Handover section append-position** (`agents/compose.ts`): when a flow-only handover section is appended (agent has no handover module), insert it **before** the terminal `actions` block instead of after; optionally assert/doc "keep handover modules contiguous" (N142/N149).
- **`builtins` default-Set memo** + FlowEditor alias `flowStates` source (N144/N146) — **verify first**: N150 removed much of this plumbing; skip if moot.
- **Bundle-picker parity** (`dashboard/client/ModuleForm.tsx`): add kind-color dots + the `CompositionMap` preview the `AgentForm` shows (N137).
- **3-digit/named-hex note** in the status form: a `#rgb` or named color silently falls back; add an author hint/validation note (N130).
- **CRUD response-key doc**: one-line note that delete returns `{reverted}` (default) vs `{deleted}` (custom) so API consumers branch correctly (N120).

### Out of scope (note, do NOT implement — design changes, not housekeeping)

- Live-SSE streaming rework so install progress is observed live (N126/N127).
- "Hide empty canonical kanban columns" toggle (N129).
- Cross-flow stage-weight rescale in the pickers (N132).
- `useRegistry` lazy-fetch on read-mode / friendlier `agents.min(1)` 400 message (N115) — optional, include only if trivial.

## Implementation plan

1. **Triage.** For each in-scope candidate, confirm it still applies against current `main` (some may be moot post-N150). Drop moot ones with a note in the PR/REVIEW.
2. **Apply the trivial ones** (DRY constants, append-position, response-key doc, hex note, bundle-picker dots) with minimal diffs.
3. **Re-run gates** after each cluster.

## Verification

- `pnpm --dir packages/taskflow run typecheck` + `lint` + `format:check` clean; build OK.
- `pnpm --dir packages/taskflow test` passes (incl. the drift guard — no role-MD change expected; if append-position changes any composed output, regenerate via `prompt-build --compose --apply` and confirm the diff is intended).
- PR notes which candidates were done vs skipped-as-moot.

## Notes

- Source: the ⚪ cosmetic/micro bucket in N151 ANALYSIS.md (mined N99–N150). Lowest priority; safe to defer or trim. Independent of N153/N154/N155.
- **Gotcha:** the append-position change touches `composeAgent` output for the flow-only-handover case — keep an eye on the byte-identical drift guard (`compose.test.mjs`).
