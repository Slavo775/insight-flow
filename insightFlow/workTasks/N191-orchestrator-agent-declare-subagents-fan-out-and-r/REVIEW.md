# N191 — Orchestrator agent — declare subagents, fan out and rejoin — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**PR:** (no PR yet — working tree on `feat/composer-mcp`)
**Verdict:** approved

## Summary

`subagents: string[]` on a composed agent → installing it emits those subagents
and `composeAgent` injects a `## Subagents` delegation section. Reference
validation on both the write (custom-defs) and load (user-registry) paths. The
rejoin/hand-back is automatic. Clean and well-scoped.

## Checklist verification

- [x] `subagents?: string[]` on `ComposedAgentSchema` — pass
- [x] Refs validated to resolve to `subagent`-kind modules (write + load paths) — pass
- [x] `collectArtifacts`/`targetArtifacts` include declared subagents (deduped) — pass
- [x] `composeAgent` injects the delegation section — pass (tested)
- [x] Composer MCP description updated; example exercised by tests — pass

## Blockers

None of N191's own. **Dependency:** the delete-guard fix recorded as **N190 B2**
must land — `referencingIds` must count an agent's `subagents` references so a
custom subagent module can't be deleted out from under a custom orchestrator.
The `subagents` field is N191's, but the guard lives in the shared
`custom-defs.ts`; fixing it under N190 covers this.

## Non-blocking

None.

## Security & edge cases

- Validation prevents dangling/ wrong-kind refs at author time.
- Delegation section is permissive ("you can delegate") → graceful degradation.

## Notes

See N190's REVIEW.md for the consolidated initiative review.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-26
**Verdict:** fix-needed

### Summary

Human inspected the **Task Reviewer agent page** (`/agent/task-review`) after
installing it. The composition map shows its 11 modules but **not** its declared
subagents — so the orchestrator→subagent relationship is invisible on the agent
view. This is N191's "dashboard surfacing" of the `subagents` field, under-
delivered (schema/compose/MCP shipped; the agent detail view + `/api/agents` did
not).

### Blockers

1. (verbatim) "okej i see now the review/security but i dont see it in Task
   Reviewer why? how should this works"

   **Diagnosis:** the `subagents` field never reaches the agent view —
   `dashboard/server/index.ts` `/api/agents` maps only `def.modules` (no
   `subagents`); the client `AgentDto` (`api.ts`) has no `subagents`; and
   `AgentDetail.tsx` builds its map/legend/count purely from `agent.modules`. So
   the two subagents are absent from the Task Reviewer page (no node, not in the
   "11 modules in sequence" count, not in the legend).
   **Fix:**
   - `/api/agents`: include `subagents` on each agent (resolve to `{ id, title,
     kind }` like `modules`, or at least the ids).
   - `AgentDto` (`api.ts`): add `subagents`.
   - `AgentDetail.tsx`: render the declared subagents — as delegation nodes in
     the map (an edge agent → each subagent) and/or a "Subagents" panel — and
     reflect them in the header summary.

### Non-blocking

None — display-only; runtime wiring (composed `## Subagents` prompt + emitted
`.claude/agents/*.md` on install) is correct and verified.

### Security & edge cases

None new.

### Notes

Parallels the N190 Round-2 dashboard gaps (ModuleDetail + referencedBy). The
data/engine are correct; this is the agent-detail visualization of `subagents`.

---

## Fixes applied (Round 2)

**By:** task-review-fix · **Date:** 2026-06-26

- **FIXED.** Surfaced an orchestrator's subagents on the agent view:
  - `/api/agents` (`dashboard/server/index.ts`) now includes `subagents` per
    agent (resolved to `{ id, title, kind, description }`, like `modules`).
  - `AgentDto` (`api.ts`) gains `subagents?: AgentModuleRef[]`.
  - `AgentDetail.tsx` renders each subagent as a node in the composition map
    (right column, `agent → subagent` delegation edge, `⤳` prefix, clickable →
    module modal), adds `subagent` to the legend, and shows `· N subagents` in
    the header. `kindColor` gets a `subagent` case (green).
  So the Task Reviewer page now shows it fans out to `review/correctness` +
  `review/security`. Verified by a new `custom-defs-api` test asserting
  `/api/agents` returns `task-review.subagents` with both ids (kind `subagent`).

**Gates:** `tsc` (server + client) ✅ · `eslint` 0 errors ✅ · `pnpm build` ✅ ·
full suite **313/313** ✅. Display-only; runtime wiring unchanged.


---

## Round 3 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-26
**Verdict:** fix-needed

### Summary

Documentation completeness. The subagent/orchestrator/handover features are
documented only in scattered slices (the `subagent` row in `concepts/modules.md`,
the orchestrator section in `concepts/agents.md`, the `when` section in
`concepts/handover.md`, a line in `composer-mcp/index.md`). There is **no
cohesive page for the subagents *system***, and the **runtime mechanics** — how
an agent actually decides to run a subagent — are documented **nowhere** (they
only exist in chat). This is a cross-cutting docs deliverable spanning N189–N192.

### Blockers

1. (verbatim) "okej but we probably needs to docuemnts new subagents system and
   handovers and what we did there"

   **Deliverable (for `/task-review-fix`):** a dedicated, cohesive docs page
   (recommend a new top-level **"Subagents & orchestration"** section in
   `website/docs/`, with `_category_.json`, "Next" version only) covering:
   - **What subagents are** — the `subagent` module kind; cross-harness emit
     (`.claude/agents/` read by Claude *and* Cursor; union frontmatter; tools /
     model / readonly / background).
   - **Orchestrators** — the `subagents` field; fan out + **automatic rejoin**
     ("worker hands back" = subagent return, which is free).
   - **How delegation works at runtime** (the missing piece): the agent's
     `## Subagents` prompt section + **description-based auto-delegation** + the
     **Task tool**; the *harness* spawns and rejoins; it's **recommended, not
     forced** (graceful degradation); and the **fresh-session caveat** (harnesses
     load `.claude/agents` at session start).
   - **Subagents vs handovers** — the model: **1-of-N branch = a handover (+ the
     `when` intent)**, **parallel fan-out = subagents**; why an N→1 join is free
     via the parent. (Tie the four-cardinality analysis together.)
   - **Authoring** — via the dashboard, the composer MCP, or JSON; use the
     `delivery-pipeline` example as a worked walkthrough.
   - **Cross-link** the existing modules/agents/handover/composer-mcp sections so
     they point at this hub.
   - Refresh the README "Composer MCP" sections / `built-ins` inventory if the
     subagent kind belongs there.

### Non-blocking

The hand-maintained `built-ins/default-modules.md` / `default-agents.md`
inventory still omits the review subagents + `mcp-composer` (carried over from
N192) — fold the refresh into this docs pass.

### Security & edge cases

None — documentation only.

### Notes

This is the documentation half of the subagents initiative; the code is done
(N189 approved, N190/N191 fixed, N192 approved). A single docs pass closes it.

---

## Fixes applied (Round 3)

**By:** task-review-fix · **Date:** 2026-06-26

- **FIXED.** Added a dedicated top-level **"Subagents & orchestration"** docs
  section (`website/docs/subagents/` — `_category_.json` at position 5.5 +
  `index.md`), the cohesive hub the feedback asked for. It covers: what a
  subagent is (cross-harness emit, union frontmatter, fields), orchestrators
  (`subagents` field, fan out + automatic rejoin), **how delegation works at
  runtime** (the previously-undocumented part — `## Subagents` prompt +
  description-based auto-delegation + the Task tool; recommended-not-forced /
  graceful degradation; the fresh-session caveat), the **subagents-vs-handovers**
  model (1-of-N branch + `when` vs parallel fan-out; why N→1 join is free),
  authoring (dashboard / MCP / JSON) with the `delivery-pipeline` worked example,
  and a See-also hub.
- **Cross-linked** the existing slices into the hub: `concepts/modules.md`
  (subagent bullet), `concepts/agents.md` (orchestrator section lead),
  `concepts/handover.md` (`when` section).
- **Built-ins inventory refresh** (the non-blocking item): added the **Composer
  integration** (`mcp-composer`, N188) and **Review subagents**
  (`review/correctness`, `review/security`, N192) sections to
  `built-ins/default-modules.md` + the counts table.

**Gates:** `pnpm --dir website build` ✅ (no broken links). Docs-only — no source
changes, suite unaffected.


---

## Round 4 — Re-review (verify fixes)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**Verdict:** approved

### Summary

Re-review of the `fixed` task — confirming Round-2 (human: agent-view subagents)
and Round-3 (human: docs) fixes landed. Verified each site + re-ran gates.
**Approved.**

### Checklist verification

- [x] **R2** `/api/agents` includes `subagents` (`index.ts:1089`, `def.subagents && def.subagents.length`); `AgentDto.subagents` present (`api.ts:183`); `AgentDetail.tsx` renders subagent nodes + `agent → subagent` edges (lines 90/99) + legend + header count; `custom-defs-api` test asserts `/api/agents` returns `task-review.subagents`.
- [x] **R3** dedicated **Subagents & orchestration** docs hub exists (`website/docs/subagents/index.md` + `_category_.json`); concept pages cross-link it; built-ins inventory refreshed (Composer + review subagents).
- [x] Round-1 items (subagents field, ref validation, delegation prompt) still pass.

### Blockers

None — all prior blockers resolved (incl. the N190-B2 dependency, now fixed).

### Non-blocking

None outstanding.

### Security & edge cases

None new — R2/R3 are display + docs only.

### Notes

Gates: full suite **313/313** ✅ · `pnpm --dir website build` ✅ (no broken links).
The subagent/handover initiative (N189–N192) is complete and green.
