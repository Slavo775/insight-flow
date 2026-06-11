# N92 — Heterogeneous modules — MCP/hook/skill contributions + testing pilot — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-11
**PR:** https://github.com/Slavo775/insight-flow/pull/68
**Verdict:** fix-needed

## Summary

Round 4 (PR #68, commit `f9e1700`): `mcp-server`/`hook`/`skill` module kinds, the `agents/emit.ts` artifact emitter with per-kind merge rules and a managed manifest, CLI `--def` + artifact emission in `--compose --apply`, and the local `testing` pilot validated end-to-end in the playground. The schema, collection, single-agent emission, and pilot are solid (110/110, role files byte-stable, traversal-proofed skill names). **However, review found one destructive cross-command interaction** — reproduced empirically — where the routine role-regen command deletes a previously installed integration's artifacts. Verdict: **fix-needed** (1 blocker).

## Checklist verification

- [x] Schema: three new kinds, Zod-validated, safe skill names — pass (incl. traversal test)
- [x] MD composition ignores non-text kinds; 9-role drift suite untouched and green — pass
- [x] Emission merge rules: `.mcp.json` dedup-by-name + conflict error, managed settings hooks, skill writer — pass for the single-agent case
- [~] All emission idempotent — pass for the same agent reapplied; **fails across agents** (Blocker 1)
- [x] CLI apply path emits artifacts, per-target report, project-root resolved — pass
- [x] `testing` pilot authored + adopted by playground-scoped def via `--def` — pass (also reuses `minimal-diff`, closing N90 #5)
- [x] Playground E2E: apply / reapply-unchanged / removal cleans + preserves user hooks — pass as exercised
- [x] No shipped role MD or composed def changed — pass
- [x] Gates: build ✅ · 110/110 ✅ · lint = baseline ✅

## Blockers

1. **`prompt-build --compose --apply` destroys previously installed integration artifacts.** `emit.ts`: the managed manifest (`.claude/taskflow-managed.json`) is project-global but agent-agnostic — `applyArtifacts` reconciles *the whole manifest* against *one agent's* artifacts, so any apply for a different agent (including the nine artifact-less built-ins iterated by the routine `--compose --apply`) treats every previously-managed hook/skill as "no longer contributed" and removes it. **Repro (run during review):** install the pilot in a temp project → run `applyArtifacts` for the 9 built-ins (what `--compose --apply` does) → pilot skill file deleted and managed hook gone from settings.
   **Why it matters:** the everyday role-regen command silently uninstalls integrations.
   **Fix:** key the manifest per agent — `{ "agents": { "<id>": { hooks, skills } } }` — and pass the agent id into `applyArtifacts` so reconciliation only touches that agent's bucket. Add a regression test: pilot install → built-ins apply → pilot artifacts intact. Consider a same-skill-name collision check across buckets while there.

## Non-blocking

1. **MCP config comparison is key-order-sensitive** (`JSON.stringify` deep-equal in `applyMcpServers`) — semantically identical configs with different key order raise a false conflict. A stable-stringify (sorted keys) comparison avoids spurious errors.
2. **First managed write reformats user `settings.json`** to 2-space JSON (parse → stringify round-trip). Content-preserving, formatting-not. Acceptable; worth a line in README when integrations are documented.
3. `--def` accepts one file; adopting two integrations from a project would need either one def referencing both or repeat runs — fine for the pilot, revisit with the integration catalogue.

## Security & edge cases

- Skill `name` is schema-restricted (`^[a-z0-9][a-z0-9-]*$`) and is the only artifact-derived path segment — traversal-proof, with tests. MCP names are JSON keys only; hook commands are written to settings but never executed by insight-flow.
- `.mcp.json` conflict policy errs on the side of never overwriting an existing server definition — good default.
- User-owned hooks and unrelated settings keys verified preserved through apply/reapply/remove (unit + live playground).

## Notes

- The blocker is an interaction bug, not a design flaw — the per-agent manifest bucket is a contained fix in `emit.ts` + `prompt-build.ts` call site + tests.
- Reviewer caveat: implemented and reviewed in the same session, but the blocker was found by adversarial re-testing during review, which is the process working as intended.
- After the fix: `/task-review-fix` → re-review → human gate on PR #68.


---

## Fix — Round 1 blocker + non-blocking items resolved

**By:** task-review-fix · **Date:** 2026-06-11 · human authorized "fix all issues"

1. **Blocker (manifest clobbering)** ✅ — manifest re-keyed per agent (`{ "agents": { "<id>": { hooks, skills } } }`); `applyArtifacts(artifacts, projectRoot, agentId)` reconciles only that agent's bucket. Regression test reproduces the exact review scenario (pilot install → all 9 built-ins applied → pilot hook + skill intact, reapply still idempotent). Legacy pre-release manifest keys are dropped on next write. Live-verified in the playground: the routine `--compose --apply` no longer removes the pilot's artifacts.
2. **Non-blocking #1 (key-order false conflict)** ✅ — `stableStringify` (recursive sorted-key) comparison for MCP configs, with a test asserting reordered-key configs don't conflict.
3. **Non-blocking #2 (settings reformatting)** ✅ — documented: emitter header note + README "Integration artifacts (composer modules)" subsection under Customizing agents.
4. **Non-blocking #3 (`--def` single file)** — deferred by design per the review's own wording ("revisit with the integration catalogue"); repeated runs already compose multiple defs.
5. **Skill-name collision check** (suggested with the blocker fix) ✅ — a skill name claimed by another agent's bucket throws instead of silently overwriting; tested.
6. **Collateral fix (disclosed, found while verifying):** running `--compose --apply` inside a *consumer* project used to **create** the 9 root role files there (observed live in the playground). The apply path now only updates role files that already exist (`skipped <file> (not present in this project)` otherwise) — no behavior change in the canonical repo, where they always exist. Stray files created during verification were removed.

**Gates:** build ✅ · tests **112/112** (regression + collision + key-order tests added) ✅ · lint at main baseline ✅ · role files byte-stable · playground end-to-end re-verified (apply → routine regen → pilot intact → reapply unchanged).
