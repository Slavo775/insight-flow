# N190 — Native subagent emission (cross-harness: Claude + Cursor) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**PR:** (no PR yet — reviewed against the working tree on `feat/composer-mcp`)
**Verdict:** fix-needed

> This review covers the whole subagent/handover initiative (N189–N192), reviewed
> via a fan-out to parallel correctness + security subagents (dogfooding N192).
> Both blockers are rooted in N190; N189/N191/N192 are approved (see their REVIEWs).

## Summary

A new `subagent` module kind emitted cross-harness to `.claude/agents/<name>.md`
(union frontmatter), wired through emit/install/uninstall, the install plan, and
the composer MCP. The engine is clean, idempotent, and reference-safe, and the
full suite is green (309). Two real defects surfaced — a YAML frontmatter
**injection** in the emitter, and a delete-guard hole that can brick user-space
loading — both reachable over the autonomous MCP surface.

## Checklist verification

- [x] `subagent` kind added to `AgentModuleSchema` — pass
- [x] `AgentArtifacts.subagents` + `collectArtifacts` emit; `INSTALLABLE_MODULE_KINDS` — pass
- [~] `applySubagents` writes per-harness — **single `.claude/agents/<name>.md` with union frontmatter** (Cursor reads it for compat); a deliberate simplification of the spec's "two files" — acceptable but injection-vulnerable (B1)
- [x] Manifest ownership, idempotent, reference-safe uninstall; plan steps — pass (install/uninstall symmetry verified via `agents/<name>` namespace)
- [x] Composer MCP / dashboard surface the kind — pass (kind-parameterized; description updated)
- [ ] Reference-safety — **FAIL**: the delete-guard misses `subagents` references (B2)

## Blockers

1. **YAML frontmatter injection in `subagentFile()`** — `packages/taskflow/src/agents/emit.ts:429-430`.
   `model` and each `tools[]` entry are interpolated **raw + unquoted** into the
   frontmatter, and the schema (`core/schema/index.ts:427-428`,
   `z.string().min(1)`) permits newlines / YAML metacharacters. `description` is
   hardened (`JSON.stringify`) but these are not.
   **Repro:** a subagent with
   `"model": "sonnet\ntools: Read, Write, Bash\nis_background: true"` emits forged
   `tools` / `is_background` lines — i.e. grants `Bash` and flips background that
   the author never set; a `\n---\n` value breaks out of the frontmatter into the
   body. The composer MCP (`src/mcp/composer.ts`) creates/updates these
   **autonomously**, so no human author gates the malicious value. This forges
   exactly the security-relevant knobs (`tools`, `readonly`, `is_background`).
   **Fix:** quote in the emitter — `model: ${JSON.stringify(s.model)}` and
   `tools: [${s.tools.map((t) => JSON.stringify(t)).join(", ")}]` (YAML accepts
   JSON flow scalars/sequences, matching `description`); AND tighten the schema to
   a safe charset (e.g. `/^[A-Za-z0-9_.:/-]+$/`, no whitespace) for `model` and
   `tools[]` entries. Do both (defense in depth).

2. **Delete-guard misses `subagents` references** — `packages/taskflow/src/dashboard/server/custom-defs.ts:134-152` (`referencingIds`).
   The module-delete guard treats a module as referenced by an agent only via
   `agent.modules.includes(id)`, not `agent.subagents.includes(id)`. A custom
   `subagent`-kind module referenced **only** through an orchestrator's
   `subagents` array (the canonical pattern — cf. N192's `task-review`) can be
   `delete`d with a 200 instead of a 409. The orchestrator is then left with a
   dangling ref and `loadUserRegistries` (`user-registry.ts:173-181`) throws on
   the **next** load — bricking the entire user space until hand-fixed.
   Reachable over the MCP `delete` tool. Mirrors the N188 B1 brick.
   **Fix:** in `referencingIds`' `modules` branch, also
   `for (const agent of Object.values(user.agents)) if (agent.subagents?.includes(id)) refs.push(agent.id);`
   (dedup with the existing `modules` push).

## Non-blocking

1. Note the deliberate single-file (`.claude/agents/`, union frontmatter) choice
   in this task's ANALYSIS/CHECKLIST so the spec's "two files" language doesn't
   read as unfinished. No code change.

## Security & edge cases

- **Path traversal: safe.** `name` regex `/^[a-z0-9][a-z0-9-]*$/` (anchored, no
  `.`/`/`/`\`) bounds the write to `.claude/agents/<name>.md` — equivalent to the
  skill-name discipline.
- Install/uninstall ownership mirrors `applySkills`/`applyCommands`; reference-safe
  shared-ownership retention verified.
- B1 is the one injection vector; B2 the one corruption vector. Both fixable in a
  few lines, in the shared core (so they also harden the dashboard HTTP path).

## Notes

- Idempotency, `when` threading (N189), dedup, and `applyArtifacts` tolerance of
  artifacts missing `subagents` all verified clean.
- Both fixes belong in the shared core (`emit.ts` + `custom-defs.ts`), benefiting
  the dashboard too — same single-source-of-truth principle as N188.

---

## Fixes applied (Round 1)

**By:** task-review-fix · **Date:** 2026-06-26

- **B1 — FIXED.** Tightened the schema (`core/schema/index.ts`): `model` and each
  `tools[]` entry must match `/^[A-Za-z0-9._-]+$/` (no whitespace/newlines/quotes/
  commas/`---`), and the emitter (`emit.ts subagentFile`) now JSON-quotes `model`.
  The injection repro (`model: "sonnet\ntools: Bash\nis_background: true"`) now
  fails validation (400). Verified by a new `custom-defs-api` case + an emitter
  quoting test. Charset covers every real tool name (incl. `mcp__server__tool`)
  and model id.
- **B2 — FIXED.** `referencingIds` (`custom-defs.ts`) now also counts an agent's
  `subagents` references, so deleting a subagent module still referenced by an
  orchestrator returns 409 (with the referencing id) instead of bricking the
  load. Verified by a new `custom-defs-api` delete-409 case.

**Gates:** `tsc` ✅ · `eslint` 0 errors ✅ · `pnpm build` ✅ · full suite **311/311** ✅
(2 new tests). Both fixes are in the shared core, hardening the dashboard HTTP
path as well.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-26
**Verdict:** fix-needed

### Summary

Human inspected the new `subagent` module kind in the dashboard composer
(`/module` → `review/correctness`). The engine works, but the **dashboard hasn't
been taught to render the kind**: the detail view is empty and the referenced-by
count is wrong. These are the N190 "dashboard surfacing" checklist item, under-
delivered (only the schema/engine/MCP landed).

### Blockers

1. (verbatim) "but the subagent is empty is that correct?"

   **Diagnosis:** `dashboard/client/ModuleDetail.tsx` `switch (module.kind)` has
   no `subagent` case, so it renders no panel — the prompt `content`, `tools`,
   `model`, and `readonly` are not shown (the body + map look empty). Its local
   `INSTALLABLE_MODULE_KINDS` also omits `"subagent"`, so there's no Install
   button, and the one-line `summarize` switch has no `subagent` arm.
   **Fix:** add a `subagent` case to ModuleDetail (render `content` markdown +
   tools/model/readonly metadata, like the `skill` case), add `"subagent"` to the
   client `INSTALLABLE_MODULE_KINDS`, and a `summarize` arm. (Optionally a
   `subagent` panel in `ModuleInfoModal.tsx` too if it mirrors ModuleDetail.)

2. **"REFERENCED BY 0 AGENTS" is wrong** — `dashboard/server/index.ts:1049-1051`.
   The `/api/modules` `referencedBy` map scans only `def.modules`, not
   `def.subagents`, so a subagent referenced by an orchestrator (e.g.
   `task-review` → `review/correctness`) shows 0. NOTE: this is a **separate**
   computation from the Round-1 B2 delete-guard fix (`referencingIds` in
   `custom-defs.ts`) — that one was fixed; this display map was not.
   **Fix:** also iterate `def.subagents` when building `referencedBy`.

### Non-blocking

None (this is dashboard-surfacing; the engine/MCP/install paths are correct).

### Security & edge cases

None new — display-only.

### Notes

Round-1 (AI) blockers B1/B2 remain fixed; this round adds the dashboard rendering
gaps. The subagent definitions, install/uninstall, and MCP authoring are all
verified working — the data is correct; only the dashboard *display* is missing.

---

## Fixes applied (Round 2)

**By:** task-review-fix · **Date:** 2026-06-26

- **HR1 (empty detail) — FIXED.** Added a `subagent` case to
  `dashboard/client/ModuleDetail.tsx` `KindPanels` (renders `tools` / `model` /
  `readonly` / `background` + the prompt `content` as markdown, mirroring the
  `skill` panel), added `"subagent"` to the client `INSTALLABLE_MODULE_KINDS`
  (Install button now shows), and a `facetLabel` arm. Extended `ModuleDto`
  (`api.ts`) with the `subagent` kind + `tools`/`model`/`readonly`/`background`
  (and `when` for handovers). (Also surfaced the handover `when` in its panel.)
- **HR2 ("0 agents") — FIXED.** `/api/modules` `referencedBy`
  (`dashboard/server/index.ts`) now also iterates `def.subagents`, so a subagent
  delegated to by an orchestrator (e.g. `task-review`) shows its referencing
  agents. Verified by a new `custom-defs-api` test asserting
  `referencedBy["review/correctness"]` includes `task-review`.

**Gates:** `tsc` (server + client) ✅ · `eslint` 0 errors ✅ · `pnpm build` ✅ ·
full suite **312/312** ✅. Display-only changes; engine/MCP/install paths unchanged.


---

## Round 3 — Re-review (verify fixes)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**Verdict:** approved

### Summary

Re-review of the `fixed` task — confirming the Round-1 (AI: B1/B2) and Round-2
(human: dashboard) fixes all landed and nothing regressed. Verified each fix site
in code + re-ran the gates. **Approved.**

### Checklist verification

- [x] **B1** schema charset on `model`/`tools[]` (`/^[A-Za-z0-9._-]+$/`) — present (`core/schema/index.ts`, "must be a safe token" ×2); emitter JSON-quotes `model` (`emit.ts:432`). Injection repro rejected (400) — `custom-defs-api` test present.
- [x] **B2** delete-guard counts `subagents` — `referencingIds` has `agent.subagents?.includes(id)` (`custom-defs.ts:149`); delete-409 test present.
- [x] **R2** ModuleDetail `subagent` case (panel + facet) + `subagent` in client `INSTALLABLE_MODULE_KINDS`; `/api/modules` `referencedBy` scans `def.subagents` (`index.ts:1054`).
- [x] All subagent emit / idempotency / reference-safety items from Round 1 still pass.

### Blockers

None — all prior blockers resolved.

### Non-blocking

None outstanding.

### Security & edge cases

- B1 (frontmatter injection) closed at both layers (schema + emitter). B2
  (delete-brick) closed. Path-traversal safety (name regex) unchanged.

### Notes

Gates: full suite **313/313** ✅ · `pnpm --dir website build` ✅. Ready to ship.
