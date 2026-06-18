# ANALYSIS — reliability hardening (N151 + N152), mined from N99–N150 reviews

_Pre-taskmaster strategy record. Output of a /task-analyze mining pass over the REVIEW.md files N99→N150._

## Problem framing

Asked to go through all tasks N99→current, read their REVIEW.md files, and surface deferred suggestions / noted-but-unfixed bugs / improvements worth implementing. Read 34 REVIEW.md files (N112→N150) and extracted every Non-blocking / Suggestions / caveat item. Most are explicitly marked cosmetic / acceptable / micro-opt (noise). The signal sorted into four buckets:

- 🔴 **Reliability bugs:** dashboard server has no request-level error boundary (N118) → a malformed/missing `master.json` (hit in practice during merges) crashes the long-running process; `/api/task-flow` oversize body hangs (N118); `writeStatus` silently fails open to canonical validation on a bad def (N131).
- 🟠 **Emit/install correctness (N138):** skill-namespace collision not cross-checked; skill frontmatter not escaped; empty-prompt command.
- 🟡 **Handover-feature completeness:** ModuleDetail/AgentDetail don't render the new kinds (N143); custom-flow statuses not selectable in pickers (N143/N146); `$ARGUMENTS` parity (N149).
- ⚪ **Cosmetic/micro (~12):** live-SSE-is-cosmetic (N126/N127), empty kanban columns (N129), hex fallback (N130), append-position/contiguity (N142/N149), `LOCKED_MODULE_IDS` DRY (N119), bundle-picker parity (N137), cross-flow weight (N132), etc.

(Note: some review notes were already resolved later — e.g. N139's duplicate `resolveTaskFolder` was unified by N140 — and excluded.)

## Goal

Turn the highest-value mined findings into actionable tasks; skip the noise.

## Options considered

Presented the four buckets; owner selected **Reliability bugs only** (the 🔴 bucket), then chose to **split** it by layer rather than one combined task. (Emit hardening, handover completeness, and the cosmetic batch were not selected this pass — they remain mined and available.)

## Decision

Two independent tasks:
- **N151** (fix, high) — dashboard server request error boundary + oversize-body 413 (N118 #1/#2). The substantive reliability fix; prevents dashboard crashes on bad `master.json`.
- **N152** (fix, low) — surface the silent fail-open in `writeStatus` flow resolution with a one-line stderr warning (N131). Trivial, different layer (CLI).

Deliberately excluded: a process-level `uncaughtException` backstop (could mask unrelated bugs) — the targeted handler boundary is the fix.

## Open questions

- N151: exact set of async body callbacks that need guarding beyond `/api/task-flow` — audit during implementation (any `req.on("end")` reading disk / parsing JSON).
- Whether to extract a shared `readBody`/`sendError` helper or guard inline — implementer's judgment; helper preferred if the pattern repeats.

## Sources

- REVIEW.md non-blocking sections N112→N150 (mined). Primary: **N118** (server error boundary + oversize hang), **N131** (silent fail-open).
- `packages/taskflow/src/dashboard/server/index.ts:507` (`createServer` handler, no top-level boundary; per-endpoint try/catch only).
- `packages/taskflow/src/cli/commands/status-write.ts:14` (the swallowing catch around `mergedProjects()`).

## Handoff brief

Two fix tasks, independent. N151 (high): wrap the dashboard request handler + async body callbacks → 500; `/api/task-flow` oversize → 413; add a malformed-master regression test; no `uncaughtException` backstop. N152 (low): one-line stderr warning in `status-write.ts`'s flow-resolution catch, behavior otherwise unchanged. Both reliability-only; the other mined buckets (emit hardening, handover completeness, cosmetic) are documented here and deferred.
