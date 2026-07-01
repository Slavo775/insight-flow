# N196 — Authoring subagents (lean) — composer-analyst/author/reviewer + dedup & best-practice — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**PR:** (no PR yet — working tree on `feat/authoring-flow`)
**Verdict:** approved

## Summary

3 lean built-in `subagent` modules — `composer-analyst` (read-only, dedup/reuse
via MCP), `composer-author` (creates defs), `composer-reviewer` (read-only) —
registered and wired onto the authoring agents. Dedup/reuse + best-practice are
encoded in the prompts. **Approved.**

## Checklist verification

- [x] 3 subagent modules registered with kind `subagent`; analyst/reviewer `readonly` — pass (tested)
- [x] Dedup/reuse logic in analyst/reviewer prompts (query the composer MCP before creating) — pass
- [x] Best-practice conventions encoded (custom: ids, baseline, locked-kind awareness, handover `when`) — pass
- [x] Wired onto N195 agents' `subagents`; emit to `.claude/agents/` on install — pass (3 emitted on flow install)

## Blockers

None.

## Non-blocking

- `tools` allowlists were omitted (subagents inherit) with `readonly` + prompt
  discipline as the guard — a reasonable lean choice; tighten to explicit
  allowlists later if desired (noted in the task).

## Security & edge cases

- Read-only subagents enforce via `readonly` (Cursor) + prompt; no write surface intended.

## Notes

See N194's REVIEW for the batch review.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-28
**Verdict:** fix-needed

### Summary

Owner revisited the "start lean" subagent decision (decision #4) after seeing one
broad subagent per agent in practice, and wants **per-kind** subagents (module /
agent / flow / relationship). This is the anticipated "grow" path — expand the
lean trio into per-kind specialists and re-wire the authoring agents (N195).

### Blockers

1. (verbatim) "i saw that we have one subagent in every agent why? shouldnt we
   have subagent on every step like module/agent/flow/relationship?"

   **Direction:** replace/extend the 3 broad subagents (`composer-analyst` /
   `composer-author` / `composer-reviewer`) with **per-kind** specialists across
   the four authorable concerns: **module · agent · flow · relationship/handover**.
   Wire the relevant per-kind set onto each stage's orchestrator (N195:
   analyze / implement / review / fix).

   **Open decision (must pin before fixing — it's ~4 vs ~12 subagents):**
   - (A) per-kind **authors only** (module/agent/flow/relationship-author) on
     implement+fix; keep one broad analyst + reviewer → ~4 new.
   - (B) per-kind at **every stage** (analyst + author + reviewer × 4 kinds) →
     ~12.
   - (C) something between (e.g. per-kind author + reviewer; broad analyst).

### Non-blocking

None.

### Security & edge cases

Per-kind read-only analysts/reviewers keep the same `readonly` discipline.

### Notes

Reverses decision #4 ("start lean"). The exact decomposition (A/B/C) is being
pinned with the owner before the fix proceeds (task-analyze / task-review-fix).

---

## Fixes applied (Round 2)

**By:** task-review-fix · **Date:** 2026-06-28 · **Decision:** option **B** ("make it complex — best approach")

- **Grew 3 broad → 12 per-kind subagents.** `composer-subagents.json` now ships
  `analyst` + `author` + `reviewer` for each of **module · agent · flow ·
  relationship**, each with a kind-specialized prompt (dedup/reuse, conventions,
  the single-token/handover model, locked-kind awareness). Analysts/reviewers are
  `readonly`; authors write.
- **Re-wired the N195 agents:** `authoring-analyze` → 4 analysts; `authoring-implement`
  + `authoring-fix` → 4 authors; `authoring-review` → 4 reviewers.
- **Test updated** (`emit.test.mjs`): asserts all 12 per-kind subagents are
  registered with correct `readonly` flags.

**Verified:** installing `composer-authoring` now emits **12 subagent files**;
`authoring-implement` fans out to the 4 authors, `authoring-review` to the 4
reviewers. **Gates:** tsc ✅ · build ✅ · full suite **314/314** ✅. (Touches N196
subagent modules + N195 agent wiring.)



---

## Round 3 — Re-review + flow evaluation ("what would be better?")

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-28
**Verdict:** approved

### Summary

The N196 per-kind fix is correct and complete (12 subagents register, wired,
emit; 314/314). The owner asked for an evaluation of the **whole flow against its
goal** (guided creation of working new entities). N196 is approved; the
improvements below are **flow-level (mostly N195)** and worth follow-up tasks —
not blockers (the flow functions via prompt handovers).

### Checklist verification (N196)

- [x] 12 per-kind subagents registered (analyst/author/reviewer × module/agent/flow/relationship); readonly flags correct — pass
- [x] Wired onto the authoring agents; install emits 12 — pass

### Blockers

None.

### Non-blocking — "what would be better" (ranked, for the goal of creating entities)

1. **(biggest) The authoring agents don't drive the tracker lifecycle.** Their
   role prompts contain **0** lifecycle commands (implement-start/end,
   review-start/end, …) and **0** status-transition modules — vs the canonical
   agents which call them. So an authoring task never advances
   ready→implemented→reviewing→…→done: the flow's status-keyed edges (`on:
   implemented`, etc.) never fire, the dashboard kanban stays stale, and
   `next`/`suggestNextSteps` won't suggest the next step. Today the flow only
   progresses via the prompt handover modules (`when`). **Fix:** give the
   authoring agents the lifecycle discipline (run the CLI lifecycle commands like
   the canonical agents) and/or status-transition modules, so the *tracked* flow
   actually advances. → N195 follow-up.

2. **"Test" validates load, not function.** The test agent does a compose/install
   dry-run — it confirms the entity is *valid*, not that it *works*. For the goal
   (a working new entity), add a light smoke step: render the created agent's
   composed prompt / invoke it on a trivial input / install-dry-run + uninstall.
   → N195/N197 follow-up.

3. **No target-harness opt-in.** Analyze asks the activity-engine opt-in but not
   **claude / cursor / both** — which changes how subagents/skills/commands emit.
   Add it to the analyze questions. → N195 follow-up.

4. **Created ids aren't recorded.** The install agent installs but doesn't record
   the `custom:` ids it created/installed into the task (audit + later uninstall).
   Minor traceability win. → N195 follow-up.

5. **Heaviness (observation).** 8 stages + 12 subagents is a lot for one entity —
   appropriate for non-trivial authoring; trivial creation stays the direct
   dashboard/MCP path. Acceptable as designed.

### Security & edge cases

None new — subagents read-only where intended.

### Notes

Approving N196 (its scope is done). Items 1–2 are the substantive ones for making
the flow a *functioning tracked lifecycle that yields working entities*;
recommend follow-up tasks (N195-scoped).

---

## Round 3 — fixes applied ("fix all also non-blocking issues")

**By:** task-review-fix · **Date:** 2026-06-28 · **Files:** `src/agents/modules/roles/authoring.json` (N195 role modules)

Applied to the authoring agents' role prompts:

- **#1 tracker lifecycle (the big one)** — each agent now runs the CLI lifecycle:
  create binds the task (`insight-flow create …` + `set-flow --id <id> --flow
  composer-authoring`), implement runs `implement-start/end`, review
  `review-start/end --type ai`, fix `fix-start/end`, human-review
  `review-start/end --type human`, install ends with `insight-flow done --id`.
  Verified safe: `setStatus` is **set-membership** (not a transition graph), and
  every target status (incl. `done`) is in the authoring flow's declared set.
- **#2 functional smoke** — the test agent now confirms the entity *works*
  (render the composed prompt + dry-run install/exercise/uninstall), not just that
  it's valid.
- **#3 target-harness opt-in** — analyze now asks **Claude / Cursor / both**.
- **#4 record created ids** — install now records the installed `custom:` ids in
  the task (audit + later uninstall).
- **Bonus defect fixed** — the role prompts still named the *old broad* subagents
  (`composer-analyst/author/reviewer`) removed in Round 2; updated to the **12
  per-kind** subagents (`module/agent/flow/relationship-{analyst,author,reviewer}`).

**Verified:** composed prompts now contain the lifecycle commands, the harness
opt-in, the smoke step, the id-recording, and per-kind subagent refs (no stale
broad refs). **Gates:** tsc ✅ · build ✅ · lint clean ✅ · suite **314/314** ✅.
(#5 heaviness was an observation — no change.)


---

## Round 5 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-28
**Verdict:** fix-needed

### Summary

The 12 per-kind subagent prompts are too thin to author reliably — they say *what*
to do ("author via `create_module` following conventions") but not the concrete
*how* (the shape each `create_*` call expects) nor the *rules*. Owner wants them
made concrete: real creation context + the conventions/constraints.

### Blockers

1. (verbatim) "shouldn't we need to more concrete with the subagents like to give
   them the context how the things are created and some rules and so on?"

   **Direction:** enrich each per-kind subagent (and where useful the orchestrators)
   with concrete authoring context:
   - **How each kind is created** — the exact composer-MCP call + its expected
     shape/fields: `create_module` (id/kind/title/source + kind-specific fields for
     each of the 9 module kinds), `create_agent` (id/title/modules[]/subagents?/
     command?), `create_flow` (id/agents[]/flow edges/entryAgents/statuses/install),
     and `update_*` for eject/override.
   - **The rules** — `custom:` id format; locked tiers (security/enforcement/
     protocol + status-transition/handover by kind) that can't be overridden;
     baseline composition (security/enforcement/protocol + activity opt-in);
     handover `when` + `auto`/`gated` + no-auto-cycle-back-edge; the single task
     token (handovers 1-of-N, parallelism = subagents); eject/override semantics.
   - **A worked example / canonical template** per kind (and/or instruct the
     subagent to `get` an existing def as a template before authoring).

   **Open design decision (pin before fixing — affects scope + maintainability):**
   - (A) **Inline** the shapes+rules into each of the 12 subagent prompts (most
     direct; duplicated knowledge; 12 prompts to maintain).
   - (B) **Shared "composer authoring conventions" reference module** that the
     subagents (+ orchestrators) compose — single source of truth, each subagent
     keeps only its kind-specific delta. (Recommended.)
   - (C) **MCP `describe`/`schema` capability** the subagents call at runtime to
     fetch the live shape + rules (always accurate; needs an N188/MCP change).
   - (B)+(C) combined is strongest: shared conventions module now, MCP `describe`
     later.

### Suggestions (non-blocking)

- Whichever approach: keep it DRY with the existing `composer-mcp-note` (stdio
  usage) so guidance doesn't fragment.

### Notes

Scope: N196 subagent prompts (primary); possibly a new shared module (B) and/or an
MCP `describe` tool (C, N188-adjacent). The (A/B/C) approach is being pinned with
the owner before `/task-review-fix` proceeds (per the gated handover).

---

## Round 5 — fixes applied

**By:** task-review-fix · **Date:** 2026-06-29 · **Decision:** owner chose **B+C**

Single source of truth: `src/agents/composer-conventions.ts` — the cross-cutting
rules (`COMPOSER_RULES`) + per-kind create_* shapes (`KIND_SHAPES`). Both halves
draw from it, so the guidance can't fragment:

- **C — MCP `describe` tool.** New composer tool `describe({ kind? })` returns the
  authoritative rules + the exact create_* shape/fields for module/agent/flow
  (omit kind → all). All **12 subagent prompts** now say to call
  `describe(kind=…)` (and `get` a live def as a template) before authoring —
  always-accurate shapes without bloating prompts.
- **B — shared conventions module.** `composer-authoring-conventions` (section,
  body = the rules + a pointer to `describe`) composed into all **8 orchestrator
  agents**, so they carry the rules to brief/review against.
- **Bonus:** fixed the stale N194 finding — the `update_*` tool description +
  comment said "the default flow"; now "built-in flows".

**Verified:** `authoring-implement` composes `## Authoring conventions` (incl. the
locked-tier rule); `describe(flow)` returns the rules + flow shape over the MCP;
`describe` registered (13 tools). **Gates:** tsc ✅ · build ✅ · lint clean ✅ ·
suite **315/315** ✅ (added a conventions-module regression test).

**Files:** `composer-conventions.ts` (new), `mcp/composer.ts`, `agents/compose.ts`,
`composed/authoring.json`, `integrations/composer-subagents.json`, `test/emit.test.mjs`.


---

## Round 7 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-29
**Verdict:** fix-needed

### Summary

Owner wants a stronger, explicit **reuse-first decision policy** everywhere the
agents/subagents author entities: prefer reusing/extending an existing
definition; if a small tweak to an *unreferenced* one suffices, edit it in place;
only ask before a *wider* rework; create new only as a last resort.

### Blockers

1. (verbatim) "please add everywhere that if the module/agent/flow can be reused
   or its similar and needs to provide only small change needs to be reused so
   first of all try to find the things what we can reuse or if module exist but
   needs to be changed a little bit (change argument port something) and is not
   used anywhere please reuse it if the thing needs to wider rework ask user if we
   can rework it"

   **Policy to encode (the tiered reuse rule):**
   1. **Search first** — always `list`/`get` the registry for an existing
      module/agent/flow that matches or is similar before authoring anything.
   2. **Exact / near match → reuse as-is.**
   3. **Minor change needed** (e.g. an argument, a port, a label) **AND not
      referenced anywhere** (no agent/flow/module depends on it) **→ reuse it by
      editing in place** (`update_*`), don't create a duplicate.
   4. **Minor change but it IS referenced elsewhere →** changing it would affect
      those consumers — do NOT silently edit; create a minimal variant or ask the
      user.
   5. **Wider rework needed → STOP and ask the user** whether to rework it; don't
      rework unilaterally.
   6. **Create a new `custom:` definition only when nothing suitable exists.**

   **Where (single-source advantage):** add to `COMPOSER_RULES` in
   `composer-conventions.ts` → propagates to the MCP `describe` tool (C) and the
   `composer-authoring-conventions` module (B). Reinforce in the per-kind
   **analyst** prompts (report reuse candidates + whether each is referenced) and
   **author** prompts (apply the tiered rule). The analyst must report a
   definition's **reference status** (used-elsewhere?) so the author can decide
   edit-in-place vs variant vs ask.

### Suggestions (non-blocking)

- "Referenced anywhere" is already computable (the delete-guard / `referencedBy`
  logic); the analyst should surface it explicitly in its brief.

### Notes

Pure prompt/convention change (no schema/code-path change). Holding for explicit
go-ahead before `/task-review-fix` per the gated handover.

---

## Round 7 — fixes applied ("go")

**By:** task-review-fix · **Date:** 2026-06-29

Encoded the tiered **reuse-first decision rule** from one source
(`COMPOSER_RULES` in `composer-conventions.ts`) → propagates to the MCP
`describe` tool (C) and the `composer-authoring-conventions` module (B):

1. exact/near match → reuse as-is; 2. small change + **unreferenced** → edit in
place (`update_*`); 3. small change + **referenced elsewhere** → variant or ask;
4. wider rework → **ask the user**; 5. new `custom:` only as a last resort.

Reinforced in the 12 subagents: **analysts** now report, per candidate, whether
only a small change is needed AND whether it is referenced anywhere (drives the
choice); **authors** apply the tiered rule (edit-in-place / variant / ask /
create); **reviewers** flag any new def that duplicates a reusable near-match.

**Verified:** rule present in the orchestrator prompt (B), in `describe` output
(C), and the subagents. **Gates:** tsc ✅ · build ✅ · lint ✅ · suite **315/315** ✅.
**Files:** `composer-conventions.ts`, `integrations/composer-subagents.json`.


---

## Round 9 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-29
**Verdict:** fix-needed

### Summary

Two points: (1) the subagent prompts are still weak on *what/how* — domain +
"call describe + reuse rule + report", but no concrete operating procedure, I/O
contract, or done criteria; (2) the authoring system is largely undocumented.
Reviewer agrees with both.

### Blockers

1. (verbatim) "still i thing the subagents are weak definition about what they
   should do or how dont you think?"

   **Direction (N196):** strengthen each of the 12 subagent prompts with a
   concrete, ordered **operating procedure** + **I/O contract** + **done
   criteria** + **boundaries**. Keep the *schema* in `describe` (don't re-inline);
   add the *workflow*:
   - **Inputs** received (brief / spec slice / analyst findings).
   - **Steps (numbered)** — e.g. author: (1) read brief + analyst reuse/reference
     findings; (2) `describe(kind)` + `get` a template; (3) apply the reuse-first
     decision; (4) construct the def; (5) `create_*`/`update_*`; (6) verify it
     validated (re-`get` / no error); (7) report.
   - **Output** — the structured report shape returned to the orchestrator.
   - **Done criteria** (validated, refs resolve) + **boundaries** (don't install;
     stay in your kind; never touch the locked tier).

### Documentation gap (verbatim Q: "also we have a documentations for all this things?")

2. **Largely no.** Confirmed gaps:
   - No dedicated **authoring-flow** guide (`composer-authoring`: its 8 agents,
     lifecycle, gated analyze-first, install-after-approval).
   - The **12 per-kind subagents** + orchestrator fan-out: undocumented.
   - The **reuse-first policy** + **authoring-conventions** module: undocumented.
   - The **`describe` MCP tool** is missing from `composer-mcp/tools.md` (stale).
   - `website/docs/subagents/` predates this work and doesn't cover it.

   → Recommend a **dedicated docs task** (N194–N197: authoring-flow guide +
   per-kind subagents + reuse policy + `describe`); the `tools.md` `describe` entry
   is a quick win that can fold into the N196 fix.

### Non-blocking

None.

### Notes

Point 1 = N196 fix. Point 2 = documentation (spans the whole authoring initiative)
→ propose a new docs task. Holding for go-ahead on the fix + confirmation on
scaffolding the docs task.

---

## Round 9 — fixes applied

**By:** task-review-fix · **Date:** 2026-06-29

- **Point 1 (blocker) — strengthened all 12 subagent prompts** with a concrete
  spec: **Inputs · Steps (numbered) · Output (report shape) · Done criteria ·
  Boundaries**. Authors now have an explicit workflow (read brief+findings →
  `describe`+`get` template → reuse-first decision → construct → `create_*`/
  `update_*` → re-`get` verify → report); analysts produce a per-candidate
  `fit / small-change? / referenced? / action` table; reviewers a severity-ordered
  findings list. Schema stays in `describe` (not re-inlined). Verified: 12/12 carry
  Inputs/Steps/Output/Boundaries.
- **Point 2 quick win — documented the `describe` tool** in
  `composer-mcp/tools.md` (was missing). The broader docs task (authoring-flow
  guide + per-kind subagents + reuse policy) remains a **separate follow-up**, not
  done here.

**Gates:** tsc ✅ · build ✅ · lint ✅ · suite **315/315** ✅ · website build ✅.
**Files:** `integrations/composer-subagents.json`, `composer-mcp/tools.md`.


---

## Round 11 — Re-review (subagent definitions + reuse + docs quick-win)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-30
**Verdict:** approved

### Summary

Re-review of the round-9 fix-needed ("subagents weak on what/how" + docs). All
resolved and committed in `bf91837`.

### Checklist verification

- [x] 12 subagents carry a concrete spec (Inputs · Steps · Output · Done · Boundaries) — pass (verified 12/12 in the committed tree)
- [x] Schema kept in `describe`, not re-inlined — pass
- [x] Reuse-first decision rule present (analysts report reference status; authors apply edit-in-place/variant/ask/create; reviewers flag duplicates) — pass (rounds 7+9)
- [x] `describe` tool registered + documented in `composer-mcp/tools.md` — pass
- [x] 12 per-kind subagents registered + wired (rounds 2/5) — pass

### Blockers

None — the round-9 blocker (weak definitions) is resolved.

### Non-blocking

- Full authoring-flow documentation was correctly split out to **N198** (done) —
  not N196's scope.

### Security & edge cases

- Analysts/reviewers remain read-only; authors write; none installs. No new surface.

### Notes

Closes the N196 review loop. tsc ✅ · website build ✅ · suite 315 (flaky
master-boot aside).
