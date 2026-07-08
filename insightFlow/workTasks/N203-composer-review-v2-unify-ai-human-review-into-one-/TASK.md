# N203 — Composer review v2 — unify AI + human review into one dual-mode agent + consolidated requirements

**Type:** feat
**Priority:** high
**Created:** 2026-07-07

## Problem

The composer (authoring) flow has two separate review agents — `authoring-review` (AI) and `authoring-human-review` (human) — where one dual-mode agent fits, exactly as N202 merged the implementer + fixer. Separately, the rules a new definition must satisfy are implicit and partly duplicated: most live in `COMPOSER_RULES` (the `composer-authoring-conventions` module, already composed into every authoring agent), but two are missing, one is loosely worded, and some are restated inside individual role identities. The reviewer does not verify them as an explicit checklist. See `ANALYSIS.md`.

## Goal

1. One dual-mode **`authoring-review`** agent: **AI-review** mode and **human-feedback** mode, selected by intent — human feedback present → human mode; none → AI mode. The separate `authoring-human-review` agent is removed.
2. AI mode critically reviews the new module/agent/flow/relationship (via the 4 reviewer subagents) against the explicit requirements, then writes/updates REVIEW.md from `REVIEW.md.tpl` (`review-start/-end --type ai`). Human mode records the human's feedback and creates/updates REVIEW.md (`review-start/-end --type human`) — behaving like today's `task-review` + `task-human-review`.
3. All 8 authoring requirements live in **one** canonical home — the existing `composer-authoring-conventions` module — reaching analyst, taskmaster, implementer, and reviewer. No new module.
4. Duplicate requirement restatements are removed from the role identities.
5. `fix-needed` (AI or human) routes to the implementer (already true from N202); `approved` (after the human pass) routes to test.

## Scope

### In scope

- `packages/taskflow/src/agents/composer-conventions.ts` — in `COMPOSER_RULES`, **add** two rules (minimal module; no name collision), **sharpen** the small-adjustment rule (own `custom:` def + unreferenced + behaviour-preserving), so all 8 requirements are stated once. Keep it the single source (`describe` + the composed module both read it).
- `packages/taskflow/src/agents/modules/roles/authoring.json` — rewrite `authoring-review/identity` into a dual-mode reviewer (AI mode: review + verify requirements + write REVIEW.md; human mode: record feedback + write REVIEW.md; intent by feedback presence); **remove** `authoring-human-review/identity`; **dedupe** the custom-only/reuse restatements out of `authoring-analyze/identity` and `authoring-implement/identity` (keep their *method* steps, drop the rule text now owned by the conventions module).
- `packages/taskflow/src/agents/composed/authoring.json` — merge the two review agents into one `authoring-review` (compose `recorder-discipline` for the human path + the 4 reviewer subagents for the AI path); **delete** the `authoring-human-review` agent; keep the requirements reaching all agents via `composer-authoring-conventions` (already composed).
- `packages/taskflow/src/agents/project/authoring.json` — remove `authoring-human-review` from `agents`; rewire edges so `authoring-review` handles both passes: `review --fix-needed--> implement`, `review --approved--> test` (only after the human pass), keep `implement --implemented|fixed--> review`.
- `packages/taskflow/src/agents/modules/handovers-authoring.json` — fold the human-review handovers into `authoring-review` (`authoring-review/handover-test` for the approved→test edge); drop `authoring-human-review/*` handovers.
- `website/docs/authoring/agents-and-subagents.md` + `walkthrough.md` — one review agent (AI + human), the requirements list, 6 agents.
- `packages/taskflow/test/compose.test.mjs` — authoring agent-count floor `>= 7` → `>= 6`.

### Out of scope

- The base product flow's `task-review` and `task-human-review` (and their `templates/roles/` copies) — the model to imitate, left unchanged.
- A **new** requirements module (rejected in analysis — would duplicate `composer-authoring-conventions`).
- The composer MCP server and the reviewer subagents' internals (beyond wiring them onto the unified agent).
- Reconciling already-installed composer flows (a re-install handles the stale `task-authoring-human-review` artifact).

## Implementation plan

1. **Consolidate the requirements** in `COMPOSER_RULES` (`composer-conventions.ts`). Ensure all 8 are stated once, adding the two missing and sharpening #6:
   - *Minimal module* — each authored definition is as small as possible; one concern per module.
   - *No name collision* — a new `custom:` id/name must not duplicate or shadow an existing definition; `list`/`get` first.
   - *Guarded small adjustments* — edit a current def in place only if it is your own `custom:` def, referenced nowhere, and behaviour-preserving (no hidden consequences).
   - (Already present: valid MCP JSON, externalized secrets, reuse-first, locked/read-only off-limits, custom-only.)
   - Keep this the single source consumed by `describeComposer()` and `CONVENTIONS_MODULE_BODY`.
2. **Dedupe the role identities.** In `authoring-analyze/identity` and `authoring-implement/identity`, remove the sentences that restate custom-only/reuse/locked rules (now owned by the conventions module); keep the *method* (analyst's reuse/impact passes; implementer's "reuse what the analyst flagged"). Every authoring agent already composes `composer-authoring-conventions`, so the rules still render.
3. **Write the unified `authoring-review/identity`.** Dual-mode:
   - **Mode select:** if the human provides feedback → human mode; else → AI mode. Guard: human mode requires a prior AI review this round (don't let an empty pass masquerade as AI).
   - **AI mode:** fan out to `module-/agent-/flow-/relationship-reviewer`; be critical; **verify each requirement** against the new definitions; `review-start --type ai` → write/update REVIEW.md (from template) → `review-end --type ai --verdict approved|fix-needed`. `fix-needed` → implementer; `approved` → hand to the human pass.
   - **Human mode:** record the human's exact feedback (`recorder-discipline`); `review-start --type human` → create/update REVIEW.md → `review-end --type human --verdict approved|fix-needed`. `fix-needed` → implementer; `approved` → test.
4. **Remove `authoring-human-review`.** Delete `authoring-human-review/identity`, the agent in `composed/authoring.json`, its entry in the flow `agents`, and its handover modules; fold `recorder-discipline` + the `→ test` handover onto `authoring-review`.
5. **Rewire the flow** (`project/authoring.json`): `implement --implemented|fixed--> review`, `review --fix-needed--> implement`, `review --approved--> test`. Update the flow description. The unified agent runs the AI pass then the human pass before firing `→ test`.
6. **Docs + test.** Update the two authoring docs (one review agent doing AI + human, the requirements list, 6 agents) and the compose-test agent-count floor (7 → 6).

## Verification

- `pnpm --dir packages/taskflow run build` ✅ and `pnpm --dir packages/taskflow test` → all pass (agent-count floor 6).
- `composer-authoring` loads via the real loader: **6 agents** (no `authoring-human-review`), no dangling edges, valid path to `done`; `fix-needed` edges target `authoring-implement`; `review --approved--> test` present.
- Rendered `authoring-review` prompt shows **both** AI and human modes, the intent rule, and the explicit requirements verification.
- `authoring-analyze` and `authoring-implement` still render the custom-only/reuse rules (via the conventions module) but no longer restate them in their own identity bodies.
- The 8 requirements appear **once** (in `COMPOSER_RULES`), reaching all authoring agents.
- No `authoring-human-review` / `task-authoring-human-review` left in `src` or docs.

## Notes

- Third in the composer-v2 series: N200 (analyze), N201 (taskmaster), N202 (implementer builds + fixes) → N203 (review unified). All merged into `agents-approved`; N203 targets the same branch.
- Mirrors N202's dual-mode pattern; the one wrinkle is that AI + human review are **sequential**, not either/or — see the guard in step 3 and `ANALYSIS.md` open questions.
- This repo's own tasks track on the `default` flow (the composer-authoring flow is a built-in shipped to consumers), so N203 is a normal source edit — it does not run the composer flow.
