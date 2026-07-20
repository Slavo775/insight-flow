# N254 — Extract shared http-util and unify both Node servers onto it — Analysis

**Created:** 2026-07-18
**Author:** task-analyze

## Problem framing

The ponytail audit's single strongest finding, confirmed independently by both the master-backend and dashboard-server scanners: the two Node HTTP servers are twins reimplementing one micro-framework. This is not cosmetic — it's the root cause of (a) a real unbounded-request-body hole in master (no 256KB cap where dashboard has one) and (b) divergent HTML-escaping that lets an escaping fix land in one server but not the other. The lazy fix is the root-cause fix: one shared helper module both servers route through, rather than patching each duplicated site.

## Goal

- Collapse the duplicated JSON-response, body-read, static-serve, MIME, escHtml, and SSE logic into one module.
- Close the master unbounded-body hole as part of the consolidation.
- Do it WITHOUT re-architecting routing (no new router) — keep blast radius to helper extraction.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Extract shared `http-util.ts`, route both servers through it, reuse existing `SseTransport` | Kills the biggest duplication; closes the body-cap hole; small conceptual surface | Touches both large files; needs live verify | M |
| B — Also introduce a real router + per-route handler files | Addresses the 870-line god-handlers too | Much larger blast radius; mixes two concerns; risky in one PR | L |
| C — Leave as-is | No effort | Duplication + unbounded-body hole persist; every future server edit done twice | — |

## Decision

- Chosen option: **A**
- Rationale: A captures nearly all the payoff (hundreds of lines, plus the security fix) at moderate risk, and reuses `SseTransport` which already exists — pure ladder rung 2 (reuse what's here). B's router rework is a separate, larger task; bundling it would make this un-reviewable. Explicitly deferring the god-handler split.

## Open questions

- `[blocking]` Where does `http-util.ts` live so both `dashboard/server` and `master` can import it without a bad dependency edge? Likely `src/core/` (core depends on nothing) or a neutral shared path. Resolve before writing imports.
- `[non-blocking]` Does the existing `SseTransport` cover BOTH master's `/events` broadcast AND its per-project `/api/hub/live` needs, or only the former? Audit says `/api/hub/live` is genuinely different — keep it separate.
- `[non-blocking]` Confirm 256KB is the right cap for master's `/api/projects/create` payloads (dashboard already uses it) — don't reject legitimate large registrations.

## Sources

- None — discussion was self-contained. Findings from the in-repo ponytail audit (2 of 4 scanners independently flagged this), 2026-07-18.

## Handoff brief

Extract shared http-util and unify both Node servers onto it. type: refactor, priority: high, tags: refactor, dedup, server. Create one `http-util.ts` (`sendJson`, `readJsonBody` with 256KB cap, SSE frame/headers, MIME, `serveStaticFile`, `escHtml`) and route both `dashboard/server/index.ts` (63 JSON + 7 body sites) and `master/server.ts` (61 JSON sites, own `readBody`, hand-rolled SSE) through it — replacing master's SSE with the existing `SseTransport` class and adding the 256KB body cap to master POSTs. No router re-architecture. Behavior-touching (body cap + SSE swap) → run `/verify` on both servers.
