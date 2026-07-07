# N202 — Composer implementer + fixer v2 — shared build core, self-contained context, checklist tracking, no-install guard — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-07
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

Prompt/docs-only change: adds a shared `authoring-build/core` section module for the Composer Implementer + Fixer, trims both identities, turns the taskmaster's implementer subtasks into a checkbox list, and updates the authoring docs. The content is well-written and captures every requirement (self-contained context, no-install guard, scope-lock, small-edits allowance, checklist-to-completion, shared core). **One blocker:** the new module's id violates the codebase's module-id scoping convention and breaks the test suite (`compose.test.mjs`). Low risk, single-line fix.

## Checklist verification

- [x] `authoring-build/core` section module added to `modules/roles/authoring.json` — present, content complete. **(id needs fixing — see Blocker 1)**
- [x] `authoring-implement/identity` trimmed; "Do NOT install" moved to core; adds "follow checklist, finish with all boxes ticked" — done.
- [x] `authoring-fix/identity` trimmed and references the shared core — done.
- [x] shared core added to `modules` of both `authoring-implement` and `authoring-fix`, right after the identity module — done.
- [x] `authoring-spec-structure.json` implementer subtasks now a `- [ ]` checkbox list written into `CHECKLIST.md` — done.
- [x] docs (`agents-and-subagents.md` Implementer + Fixer rows, `walkthrough.md`) updated — done.
- [ ] Quality gate "No regressions in the other `authoring-*` agents" — **agents still compose, but the full test suite regresses (1 fail)**; the gate was verified only via `composeAgentById`, not `pnpm test`.

## Blockers

1. **`packages/taskflow/src/agents/modules/roles/authoring.json:20` (and its two references in `composed/authoring.json:52` and `:99`) — shared module uses a role-scoped (`/`) id.**
   - **Why:** `compose.test.mjs:80` ("registry holds shared include + section modules and role-scoped modules") enforces that any module id containing `/` is *private to one agent* — `modId.startsWith("<agentId>/")` (line 101-102). `authoring-build/core` is composed into **two** agents (`authoring-implement`, `authoring-fix`) and its `authoring-build` prefix matches neither agent id, so the assertion fails with `authoring-build/core is scoped to a different role`. Result: `pnpm --dir packages/taskflow test` → **320 pass / 1 fail**. Every other shared section module in these agents uses a **flat** id (`composer-mcp-note`, `composer-authoring-conventions`, `template-copy`, `authoring-spec-structure`, `plain-language`, `recorder-discipline`, `actions`) — the `/` form is reserved for a single role's private modules (e.g. `authoring-implement/identity`).
   - **Fix:** rename the module to a flat id, e.g. `authoring-build-core`. Update the `id` in `roles/authoring.json` and both entries in `composed/authoring.json`. (Docs reference it as prose "build-discipline core", not by id, so no doc change needed.) Re-run `pnpm --dir packages/taskflow test` to confirm 321/321.

## Non-blocking

1. Minor redundancy: `authoring-implement/identity` now says "Work the checklist item by item and finish with every box ticked (see the shared build discipline)" while the shared core says the same thing. Intentional emphasis is fine; could be trimmed to just the cross-reference if you prefer leaner prompts. Not required.

## Security & edge cases

- No executable code, input handling, or auth surface in this diff (prompt text + markdown only) — `review-security` / `review-correctness` subagents not applicable. No security concerns.

## Notes

- Builds on N200 (analyze v2) and N201 (taskmaster v2), which are merged into `agents-approved`. This branch (`feat/N202-...`) is one commit ahead of `agents-approved`.
- The blocker is a naming/convention issue only — the module content and wiring are otherwise correct and the composed prompts render as intended.

## Fix (2026-07-07, task-review-fix)

- **Blocker 1 — resolved.** Renamed the shared module `authoring-build/core` → flat id **`authoring-build-core`** in `modules/roles/authoring.json:19` and both references in `composed/authoring.json:52,100`. No slash → no longer treated as role-private, matching the other shared section modules.
- **Gates:** `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **321 pass / 0 fail** (was 320/1) ✅ · both `authoring-implement` and `authoring-fix` still render the build-discipline core ✅ · no stale `authoring-build/core` references remain.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-07
**Verdict:** fix-needed

### Summary

Human wants the Composer Implementer to also own fixing after review, and the separate Composer Fixer removed. Verbatim request:

> please make task-implementer for composer also for fixing the review after so the review provide fix needed also human review provide fix needed and task implementere grab it and fix it

Confirmed decisions (via follow-up):
- **Remove the Fixer** — delete the `authoring-fix` agent; the `authoring-implement` (Composer Implementer) becomes dual-mode (build + fix), like the base `task-implement` role.
- **Fold into N202** (this task), not a new task.

### Blockers

1. **Route `fix-needed` to the Implementer, not a separate Fixer.**
   - **What:** In `packages/taskflow/src/agents/project/authoring.json` (the `composer-authoring` flow), change the `fix-needed` routing so both reviews go to the Implementer:
     - `authoring-review` `--on fix-needed-->` **`authoring-implement`** (was `authoring-fix`).
     - add `authoring-human-review` `--on fix-needed-->` **`authoring-implement`** (currently human-review has no `fix-needed` edge at all).
     - the Implementer's return edge on `fixed` (and/or `implemented`) goes back to `authoring-review`.
   - **Why:** the human wants one agent (the Implementer) to both build and fix; no separate fixer.
2. **Delete the `authoring-fix` agent and its now-unused pieces.**
   - Remove `authoring-fix` from the flow's `agents` list (`project/authoring.json`) and from `composed/authoring.json`; remove `authoring-fix/identity` and its handover module(s) from `modules/roles/authoring.json`; drop any `authoring-fix/*` handover module files.
3. **Make the Composer Implementer dual-mode (build + fix).**
   - Update `authoring-implement/identity` (and/or the shared `authoring-build-core`) so the Implementer detects fix mode: on a `fix-needed` task it applies only the review blockers (via the author subagents / composer MCP `update_*`) using the `fix-start` / `fix-end` lifecycle, and on a fresh task it builds the full spec via `implement-start` / `implement-end`. Fold the removed Fixer's "apply only what review flagged; hand back to review" wording in here.
4. **Docs.** Update `website/docs/authoring/agents-and-subagents.md` (drop the Fixer row, revise the Implementer row to cover fixing) and `walkthrough.md` (the "Review → (fix) → human review" step now loops back to the Implementer).

### Non-blocking

- (none)

### Security & edge cases

- No security surface (prompt/flow-definition change only).

### Notes

- This supersedes N202's original separate-Fixer + shared-core design: the shared `authoring-build-core` now lives on the Implementer alone (still fine as a composable module). Keep the self-contained / no-install / scope-lock / checklist guards intact.
- Watch the flow validator: every `fix-needed` edge must point to a declared agent, and the flow must still have a valid terminal path. Re-run `pnpm --dir packages/taskflow test` (compose/flow tests) after the change.


---

## Round 3 — Human Review (wording of `authoring-build-core`)

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-07
**Verdict:** fix-needed

### Summary

Human refines the wording of the shared `authoring-build-core` module (3 points). The current text is too absolute in two places and mis-states what "small adjustments" means. Verbatim:

> You already have everything you need. The approved spec (TASK.md), its checklist, and the composer conventions describe the whole customization. Do NOT read or search the insight-flow project source to do this work. If you find you genuinely cannot build an item without looking into the project, STOP — that is a bug in the spec or the agent. Report it and hand back; do not work around it by exploring the codebase. **the searching insight flow is not prohibited strictly just if the agent needs to checking into project is the bug in agent and needs to be adjusted something there** also section: Scope-lock. Your only job is to create (or make the small adjustments the spec asks for) the modules, agents, flows, and the relationships/handovers between them, so every agent and its subagents know exactly how to run. Any task that is not part of building this customization is prohibited — do not fix unrelated things, do not refactor, do not run project builds/tests. If asked to do something outside this, STOP and hand back. **job is the create and update the custom things in insight flow** also this Small adjustments are allowed. When the spec calls for it, you may make a small edit to an existing agent/module — a few lines within a single file. Anything larger than that is out of scope; stop and hand back. **please i tought small adjustments like user call the implementer without taskmaster**

### Blockers

1. **Soften the "do not read the project" rule — it is not a strict prohibition.**
   - **Human's words:** *"the searching insight flow is not prohibited strictly just if the agent needs to checking into project is the bug in agent and needs to be adjusted something there."*
   - **Change:** Reword the first bullet of `authoring-build-core` so searching/reading the insight-flow project is **not strictly forbidden**. The intent is: the implementer should already have everything it needs from the spec + checklist + conventions, so it *shouldn't need* to look into the project — and if it does need to, that signals a **bug in the agent (or spec) that should be adjusted/fixed**, and it should surface it. Drop the absolute "Do NOT read or search … do not work around it by exploring the codebase" framing. (This matches the original brief: *"its not prohibited but the implementer needs to have all in context … if any agent from composer flow needs to look into project its a bug in agent."*)

2. **Scope-lock — state the job as create *and update* custom things in insight-flow.**
   - **Human's words:** *"job is the create and update the custom things in insight flow."*
   - **Change:** Keep the scope-lock guard (no unrelated work / no refactor / stop and hand back), but make the positive statement of the job explicit: the implementer's job is to **create and update the custom** modules / agents / flows / relationships in insight-flow.

3. **Reinterpret "small adjustments" — it means the user can call the Implementer directly, without the taskmaster.**
   - **Human's words:** *"please i tought small adjustments like user call the implementer without taskmaster."*
   - **Change:** The current wording ("a small edit to an existing agent/module — a few lines within a single file") is not what the human meant. "Small adjustments" = when the **user invokes the Implementer directly for a small change without going through the taskmaster** (no full spec produced first). Reword so this allowance covers that direct-invocation case: for a small ad-hoc change the Implementer may act on the user's request directly; larger work still routes through analyze → taskmaster first (stop and hand back).

### Non-blocking

- (none)

### Security & edge cases

- No security surface (prompt-text change only).

### Notes

- All three are wording changes to the shared `authoring-build-core` module (and, where the same phrasing was copied, the Implementer identity + the authoring docs). Apply together with the Round 2 blockers (remove Fixer / Implementer does the fixing) in the same fix pass.

---

## Fix (2026-07-07, task-review-fix — Rounds 2 + 3 together)

**Round 2 — remove the Fixer; Implementer builds AND fixes.**
- `project/authoring.json` (flow): dropped `authoring-fix` from `agents`; rerouted edges — `authoring-review --fix-needed--> authoring-implement`, added `authoring-human-review --fix-needed--> authoring-implement`, `authoring-implement --fixed--> authoring-review` (plus the existing `--implemented-->`). Updated the flow description.
- `modules/handovers-authoring.json`: `authoring-review/handover-fix` now targets `authoring-implement`; added `authoring-human-review/handover-fix` → `authoring-implement`; removed `authoring-fix/handover-review`; broadened `authoring-implement/handover-review` `when` to cover build + fix.
- `composed/authoring.json`: deleted the `authoring-fix` agent; added `authoring-human-review/handover-fix` to the human-review agent; updated the implementer description ("Builds AND fixes").
- `modules/roles/authoring.json`: removed `authoring-fix/identity`; rewrote `authoring-implement/identity` as dual-mode (build via `implement-start/-end`; fix `fix-needed` via `fix-start/-end`, only flagged blockers, hand back to review); updated the reviewer + human-review identities to "hand back to the implementer".
- Docs: dropped the Fixer row and revised the Implementer row in `agents-and-subagents.md` (8 → 7 agents); updated the walkthrough's implement + review→fix steps.
- Test: `compose.test.mjs` agent-count floor `>= 8` → `>= 7` (fixer removed).

**Round 3 — reworded `authoring-build-core` (renamed heading/title to "implementer"; it's the implementer's core now).**
1. Reading the project is **not strictly forbidden** — the implementer shouldn't need to, and needing to signals a bug in the agent/spec to surface and fix.
2. Scope-lock now states the job positively: **create and update the custom things** (modules/agents/flows/relationships).
3. "Small adjustments" reworded — for a small change the **user can call the implementer directly, without the taskmaster**; larger work still goes analyze → taskmaster first.

**Gates:** `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **321 pass / 0 fail** ✅ · `authoring-fix` fully removed (no source refs) ✅ · all 7 authoring agents compose; implementer prompt carries both build + fix modes and the Round 3 wording; human-review composes the new fix handover ✅.


---

## Round 4 — Human Review (MCP secrets guidance → mention the UI path)

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-07
**Verdict:** fix-needed

### Summary

The composer flow's MCP-secrets guidance only tells the user to hand-edit `.insight-flow/secrets.local.json`. The human wants it to also point the user at the **dashboard UI**, where secrets can be added. Verbatim:

> MCP secrets. If a server needs a key or token, author it as an mcp-server module with a ${VAR} placeholder in its config and an inputs entry marked secret. Then tell the user to put the real value in this project's .insight-flow/secrets.local.json — the file at the project root (gitignored), not the global ~/.insight-flow/. Secrets live per-project, never globally. Never hard-code a secret. **or you should navifate the user into UI where user can add the secrets so .insight-flow or UI base**

Confirmed decisions (via follow-up):
- **Fold into N202** (this task).
- **Offer both paths** — keep the manual `secrets.local.json` instructions AND add the UI path; the user chooses either.

Grounding (verified in code): the dashboard already has this — the **InstallModal** (N165, `packages/taskflow/src/dashboard/client/components/InstallModal.tsx`) collects the `${VAR}` inputs when installing an mcp-server module, renders `secret` inputs as masked password fields, and the install handler writes them to the project's `.insight-flow/secrets.local.json` via `writeSecrets(resolveProjectRoot())` (`dashboard/server/index.ts`). So the UI path is real, not aspirational.

### Blockers

1. **Add the UI path to the MCP-secrets rule in `packages/taskflow/src/agents/composer-conventions.ts` (`COMPOSER_RULES`, the `**MCP secrets.**` sentence, ~line 32).**
   - Keep the current rule: `${VAR}` placeholder in the mcp-server module `config` + an `inputs` entry marked `secret`; never hard-code; secrets are per-project (`.insight-flow/secrets.local.json` at the project root, gitignored), never the global `~/.insight-flow/`.
   - **Add:** the user can supply the secret value **either** (a) through the **dashboard install UI** — the install modal prompts for each `${VAR}`, masks `secret` inputs, and writes them to `.insight-flow/secrets.local.json` for them — **or** (b) by editing `.insight-flow/secrets.local.json` by hand. Same file, two ways in.

2. **Mirror the same addition in the analyst's MCP-pass note.**
   - `authoring-analyze/identity` in `packages/taskflow/src/agents/modules/roles/authoring.json` has the step 6 "MCP pass" that currently says to "note that the user must add the secret to this project's `.insight-flow/secrets.local.json`". Reword so it also mentions the UI install-modal path (both ways), consistent with the convention above. (This is the agent that plans the mcp-server module + secret placeholder, so it should tell the user both ways.)

### Non-blocking

- If the shared `COMPOSER_RULES` update already reaches the analyst via the `composer-authoring-conventions` module, the change to `authoring-analyze/identity` can be light — just make sure the two don't contradict.

### Security & edge cases

- No new secret handling introduced — this only documents the existing (already-gitignored, masked) UI flow. No secret is ever hard-coded or committed. No security regression.

### Notes

- This is composer-flow *conventions*/analyst wording (N200 area) folded into N202 per the human's choice; it does not touch the implementer/fixer changes from Rounds 2–3.
- Verify after: `pnpm --dir packages/taskflow test` (the compose tests assert composer-conventions text reaches the authoring agents — keep those passing) and render `authoring-analyze` to confirm the both-ways wording appears.

---

## Fix (2026-07-07, task-review-fix — Round 4)

- **Blocker 1 — resolved.** `composer-conventions.ts` (`COMPOSER_RULES`, the **MCP secrets** rule): kept the `${VAR}` + `inputs: secret` + per-project `.insight-flow/secrets.local.json` (never global, never hard-coded) rule, and added the **both-ways** wording — (a) the **dashboard install UI** prompts for each `${VAR}`, masks `secret` inputs, and writes the file for the user, or (b) edit the file by hand.
- **Blocker 2 — resolved.** `authoring-analyze/identity` MCP-pass note: same both-ways addition (install UI *or* hand-edit), consistent with the convention.
- **Gates:** `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **321 pass / 0 fail** ✅ · rendered `authoring-analyze` mentions the dashboard install UI + "either way" and still names the per-project file; the shared convention also reaches `authoring-implement` ✅.
- No security regression — only documents the existing gitignored/masked UI flow; no secret is stored, hard-coded, or committed by this change.


---

## Round 5 — AI re-review (full change set, Rounds 1–4)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-07
**Verdict:** approved

### Summary

Re-review of the whole accumulated diff for N202 (Rounds 1–4) vs `agents-approved`. Prompt/flow-definition + docs + one test-assertion change; no runtime logic. Everything the human asked for is in and coherent, the composer flow validates through the real loader, and the full suite passes. **Approved.**

### Checklist verification (against the evolved intent)

- [x] **Shared build core** (`authoring-build-core`, flat id) present, now implementer-only (title/heading updated) — renders into `authoring-implement`.
- [x] **Fixer removed** — `authoring-fix` gone from flow `agents`, `composed/authoring.json`, `roles/authoring.json`, and `handovers-authoring.json`; zero `authoring-fix` / `task-authoring-fix` references left in `src`.
- [x] **Implementer is dual-mode** — `authoring-implement/identity` documents build mode (`implement-start/-end`) and fix mode (`fix-start/-end`, only flagged blockers, hand back to review).
- [x] **`fix-needed` routes to the implementer** — flow edges `authoring-review --fix-needed--> authoring-implement` and `authoring-human-review --fix-needed--> authoring-implement`; implementer returns on both `implemented` and `fixed` to review. Handover modules match the edges; reviewer + human-review identities updated to "hand back to the implementer".
- [x] **Round 3 wording** in `authoring-build-core` — project-read not strictly forbidden (needing it = a bug to surface); job = "create and update the custom things"; "small adjustments" = user can call the implementer directly without the taskmaster.
- [x] **Round 4 secrets** — both-ways guidance (dashboard install UI **or** hand-edit `secrets.local.json`) in `composer-conventions.ts` (`COMPOSER_RULES`) and the `authoring-analyze` MCP-pass note.
- [x] **Docs** — `agents-and-subagents.md` (7 agents, Fixer row dropped, Implementer row covers build+fix) and `walkthrough.md` (review→fix loop back to implementer) updated; no stale "Composer Fixer" / "8 agents".
- [x] **Quality gates** — `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **321 pass / 0 fail** ✅.

### Verification performed

- Loaded `composer-authoring` via the real loader (`BUILTIN_PROJECTS`): **7 agents, 11 edges, no dangling endpoints**, valid path to the `done` terminal; `entryAgents` (`authoring-analyze`, `authoring-create`) both exist.
- `fix-needed` edges = `authoring-review→authoring-implement`, `authoring-human-review→authoring-implement`; implement edges = `implemented→review`, `fixed→review`.
- All 7 authoring agents compose and carry `plain-language`.
- Rendered `authoring-analyze` shows the install-UI + "either way" secrets wording; `authoring-implement` shows both build and fix modes + the Round 3 wording.

### Blockers

- None.

### Non-blocking

1. **Stale install artifacts in already-installed projects.** Removing `authoring-fix` means a project that previously installed the composer flow (e.g. `is-test`) still has a `task-authoring-fix` command/agent artifact on disk. That's install state, reconciled by a re-install/uninstall of the flow — out of scope for this source change, but worth remembering when testing an old install.
2. `authoring-implement/handover-review` is `mode: auto` and serves both the `implemented` and `fixed` transitions (same target, `authoring-review`). Fine as-is; noting that a human-review `fix-needed` therefore loops the fix back through **AI** review before returning to human review — a reasonable re-check, not a defect.

### Security & edge cases

- No executable code, input handling, or auth surface. The Round 4 change only documents the pre-existing, gitignored, masked UI secrets flow — no secret is stored, hard-coded, or committed. No concern.

### Notes

- Working tree is ahead of the last commit (only Round 1 was committed earlier); Rounds 2–4 are uncommitted. Recommend `/task-git` to commit the full set before merge.
- Builds on N200/N201 (merged into `agents-approved`).


---

## Round 6 — Human Review (approval)

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-07
**Verdict:** approved

### Summary

Human approved. Verbatim:

> approved merge into same branch as previous one

Direction: merge N202 into `agents-approved` (the same integration branch as N200 and N201).

### Blockers

- None.

### Notes

- Approval covers the full change set (Rounds 1–4) plus the spec/doc catch-up (TASK.md + CHECKLIST.md now match the final design).
- Next: `/task-git` — commit + push `feat/N202-composer-implementer-fixer-v2`, then merge into `agents-approved`.
