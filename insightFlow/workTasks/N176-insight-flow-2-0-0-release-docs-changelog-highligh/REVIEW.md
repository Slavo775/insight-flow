# N176 — insight-flow 2.0.0 release docs — CHANGELOG highlights + README + docs refresh — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-24
**PR:** (no PR yet — reviewed working-tree diff)
**Verdict:** fix-needed

## Summary

Docs-only change across 4 files (CHANGELOG, both READMEs, docs/architecture-diagrams.md). The shape is right — curated themed `[2.0.0]` (3 breaking + 11 highlight bullets, no per-task wall), history preserved, layout refs fixed, new feature sections added, new CLI commands verified against `cli.ts`. Coverage of the 70 PRs is accurate and well-grouped. **One factual blocker:** the realtime-transport claim is wrong in every file — it states "native WebSocket/SSE (served at `/ws`)", but N83 replaced socket.io with **Server-Sent Events only**, served at **`/sse`** (`client/useDashboardStream.ts` → `new EventSource("/sse")`; `server/transport.ts`/`index.ts` expose `/sse`; master uses `/events`). There is no WebSocket and no `/ws` route anywhere in `src/`. Shipping that in a release changelog would misdescribe a documented breaking change.

## Checklist verification

- [x] Change inventory derived from `git log v1.0.0..main` (70 PRs), themed — pass
- [x] `[2.0.0]` curated (3 breaking + 8 Added + 1 Changed + 2 Fixed); history preserved — pass
- [~] Breaking/Migration section complete — composition v2 ✓, layout migration ✓, `batch→bulk` correctly NOT listed (verified still-deprecated, not removed) ✓ — **but the transport breaking item is factually wrong (see Blocker 1)**
- [x] Package README header → "What's new in 2.0.0"; stale `workTasks/` fixed; flows/install/statuses/composition sections added — pass
- [x] Root README "What You Get" + quick start aligned, consistent with package README — pass
- [~] `docs/architecture-diagrams.md` refreshed (paths, Diagram 5 flows, Diagram 6 composition) — pass **except** the transport wording (Blocker 1)
- [x] Docs-only: `git diff --name-only` is 4 `*.md`/CHANGELOG files, no `src/` — pass
- [x] New CLI flags (`set-flow`, `rename`, `migrate-layout`) match `cli.ts` — pass

## Blockers

1. **Realtime transport mislabeled as "WebSocket/`/ws`" — it is SSE at `/sse`.** Evidence: `packages/taskflow/src/dashboard/client/useDashboardStream.ts:34` `new EventSource("/sse")`; `server/transport.ts` + `server/index.ts:1414` ("native Server-Sent Events (replaced socket.io)"); no `/ws` route or `new WebSocket` exists in `src/`. **Fix** — change the realtime-channel wording to "native Server-Sent Events (SSE), served at `/sse`" in the lines I introduced/edited:
   - `packages/taskflow/CHANGELOG.md:23` — "now a native WebSocket/SSE transport (served at `/ws`)" → SSE at `/sse`.
   - `packages/taskflow/CHANGELOG.md:25` — "switch to the native WebSocket/SSE endpoint" → "switch to the native SSE endpoint (`/sse`)".
   - `packages/taskflow/README.md:18` — breaking-note "socket.io → native WebSocket/SSE transport" → "socket.io → native SSE transport".
   - `packages/taskflow/README.md:154` — "A native WebSocket/SSE channel on `/ws`" → "A native Server-Sent Events stream on `/sse`".
   - `packages/taskflow/README.md:859` — "over the native WebSocket/SSE channel" → "over the native SSE channel".
   - `README.md:75` — "live-reloads over a native WebSocket/SSE channel" → "…over a native SSE (`/sse`) channel".
   - `docs/architecture-diagrams.md:14` — maintenance note "native WebSocket/SSE transport" → "native SSE transport (`/sse`)".
   - `docs/architecture-diagrams.md:263` — "Live push (native WebSocket/SSE, project server)" → "(native SSE, project server)".
   - `docs/architecture-diagrams.md:287` — "native WebSocket/SSE \"activity\" frame" → "native SSE \"activity\" frame".

## Non-blocking

1. **Pre-existing "WebSocket" mentions left inconsistent.** After fixing Blocker 1, the maintenance note will say SSE while older diagram-prompt text still says WebSocket: `docs/architecture-diagrams.md:154,158,201,213,223,261` (Diagrams 2–4) and the "HTTP/WebSocket port" labels at `README.md:172`, `packages/taskflow/README.md:230,320`. These predate this task and aren't strictly wrong for the port (SSE rides HTTP), but since the doc is being refreshed for 2.0.0, normalizing them to "SSE"/"HTTP port" would avoid a confusing mixed message. Optional.
2. **CHANGELOG not shipped in the npm tarball** (`files` excludes it; the README links were pointed at GitHub to compensate). Adding `"CHANGELOG.md"` to `packages/taskflow/package.json` `files` would give npm a Changelog tab and let the links be relative — but that's a packaging change, reasonably deferred.

## Security & edge cases

- No security surface (docs only). No secrets or credentials in the diff. Diff confirmed docs-only (no `src/` changes), so no behavior risk.

## Notes

- Everything else verified accurate against source: `set-flow`/`rename`/`migrate-layout` exist with the documented flags; `batch*→bulk*` aliases confirmed still present (correctly omitted from breaking changes); socket.io confirmed removed from `dependencies`; layout back-compat shim confirmed in `core/paths.ts`.
- No PR yet (branch `null`); no `agents.extend.task-review` configured → REVIEW.md is the review surface (fallback per output contract).
- After the fix, this is ready to land; then the human cuts `v2.0.0` via `gh release create v2.0.0` (RELEASING.md / N175).
- Related: N175 (publish pipeline), N83 (the SSE transport this must describe correctly).

---

## Fix — Round 1 (task-review-fix, 2026-06-24)

**Blocker 1 — RESOLVED.** Corrected the realtime-transport wording from "native WebSocket/SSE (`/ws`)" to "native **Server-Sent Events (SSE)**, served at `/sse`" across all 9 flagged lines:
- `packages/taskflow/CHANGELOG.md:23,25` — transport + migration now say SSE at `/sse` (consumed with `EventSource`).
- `packages/taskflow/README.md:18,154,859` — breaking note, "How it works" step 4, and master broadcast now say SSE/`/sse`.
- `README.md:75` — live-reload channel now "Server-Sent Events (SSE) (`/sse`)".
- `docs/architecture-diagrams.md:14,263,287` — maintenance note + Diagram 4 now say SSE; the maintenance note also clarifies that the older "WebSocket" wording in Diagrams 2–4 refers to this same SSE channel (neutralizes the inconsistency without rewriting pre-existing prompt text).

Verified: `grep` for `WebSocket/SSE` / `/ws` realtime claims returns 0; diff remains docs-only.

**Non-blocking — not actioned** (not authorized; pre-existing): the "HTTP/WebSocket port" labels (`README.md:172`, `packages/taskflow/README.md:230,320`) and standalone "WebSocket" mentions in the Diagram 2–4 prompt bodies remain. The maintenance note now points readers to read these as the SSE channel. Shipping CHANGELOG in the npm `files` allowlist also deferred.


---

## Round 2 — re-review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-24
**Verdict:** approved

### Summary

Blocker 1 fix verified against source. The realtime transport now reads "native Server-Sent Events (SSE), served at `/sse`" everywhere it was wrong — matching `client/useDashboardStream.ts` (`new EventSource("/sse")`) and `server/transport.ts`. No regressions; diff remains docs-only.

### Checklist verification

- [x] Blocker 1 — all 9 flagged lines corrected to SSE/`/sse`; `grep -E "WebSocket/SSE|/ws\b"` over the 4 changed docs returns 0 — pass
- [x] `[2.0.0]` still curated + single section, history preserved — pass
- [x] Docs-only (deliverable content); CLI flags, breaking set, layout shim still accurate — pass

### Blockers

None.

### Non-blocking

- Unchanged from Round 1: the pre-existing "HTTP/WebSocket port" labels (`README.md:172`, `packages/taskflow/README.md:230,320`) remain — acceptable (the port is HTTP; SSE rides it). The fixer added a clause to the architecture maintenance note clarifying that the older Diagram 2–4 "WebSocket" mentions refer to the SSE channel, which adequately neutralizes the inconsistency.
- Correctly **not** touched: the historical `[0.4.x]`/`[0.x]` CHANGELOG entries that mention `socket.io` / hand-rolled WebSocket (`CHANGELOG.md:255,263`) — those are accurate history and must stay.
- CHANGELOG-in-`files` packaging tweak still deferred.

### Security & edge cases

- None. Docs only; no secrets; no `src/` behavior change.

### Notes

- Approved. Ready to land via `/task-git`; then the human cuts `v2.0.0` (`gh release create v2.0.0`, RELEASING.md / N175).


---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-24
**Verdict:** approved

### Summary

Human verdict, verbatim: "approved merge it". No additional feedback or change requests.

### Blockers

None.

### Notes

Approved for merge. Proceeding to `/task-git` (branch → commit → push → PR → squash-merge into main). After merge, the human cuts `v2.0.0` via `gh release create v2.0.0` (RELEASING.md / N175).
