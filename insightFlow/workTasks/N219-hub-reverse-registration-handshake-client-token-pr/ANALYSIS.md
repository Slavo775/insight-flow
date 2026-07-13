# N219 — Hub reverse-registration handshake + client token privacy — Analysis

**Created:** 2026-07-11
**Author:** task-analyze

## Problem framing

The user's spec ("Start of the master server") describes a reverse-registration handshake: on boot the master should ask each registered project to register itself, and "the registration key shouldn't be exposed to client — only some id." Investigation of the current code found two divergences from that intent:

- **Symptom:** cards can show "online" with a dead token after a master restart; there is no decline path. **Cause:** N218's boot handshake (`handshakeRegistered` in `master/index.ts`) merely GETs `/health` and calls `registry.markUp`, which fabricates online state without a real registration or key exchange.
- **Symptom / latent bug:** the per-project `token` is present in the browser. **Cause:** the client sinks serialize the full `MasterProjectEntry` (`registry.getAll()`), which carries `token` — via `getOverviewHtml`, `GET /api/hub/projects`, and `broadcast("project-update", entry)`.

## Goal

- `token` (and the unnecessary `url`/`path`) never reach any client surface.
- Master start triggers a real re-register per project (Diagram 1), reusing the project's existing `reregister()` path.
- Projects can decline (standalone → declined), preparing for a real refuse case.
- Remove the `markUp` fake-online path; online state derives only from real register + the liveness SSE.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Real trigger endpoint (`POST /hub/reregister`) + public projection | Matches both diagrams; never fabricates state; single source of truth for online; closes token leak | Adds one project endpoint + wiring `reregister` into dispatch | M |
| B — Keep `/health` probe + `markUp`, just strip token from client | Smaller diff | Still fabricates online without a key; no decline path; two liveness mechanisms diverge | S |
| C — Both (probe for instant UI + trigger for correctness) | Instant optimistic mark | Two mechanisms to keep consistent; more moving parts for little gain | M–L |

## Decision

- Chosen option: **A** (confirmed with the user via AskUserQuestion — "Real trigger endpoint").
- Rationale: it is the only option that both honors the diagrams and removes the fabricated-state inconsistency, while the public projection fixes the token leak the user explicitly called out. B leaves the core correctness problem; C adds surface for no real benefit given the project already re-registers on its own liveness 401.

## Open questions

- `[non-blocking]` Decline signalling: for now standalone → `{ declined: true }`. A richer policy (per-project opt-out flag) can come later.
- `[non-blocking]` Should `path` stay server-only? Yes — the client never needs it; only the proxy (server-side) does.
- `[non-blocking]` Timing: master may POST `/hub/reregister` before a project finished its first register; `reregister()` handles a null `masterId` by doing a fresh register, so this is safe.

## Sources

- None — discussion was self-contained (code read directly: `master/server.ts`, `master/registry.ts`, `master/index.ts`, `dashboard/server/index.ts`).

## Handoff brief

Title: Hub reverse-registration handshake + client token privacy · type: feat · priority: high. Close the token leak by projecting a client-safe registry view (id, projectId, label, online, lastSeenAt, state) at the overview page data, `GET /api/hub/projects`, and SSE frames. Replace N218's `/health`+`markUp` boot probe with a real reverse handshake: the master POSTs a new localhost-only `POST /hub/reregister` on each project, which performs a real `/api/register` (or declines when standalone). Remove `markUp`. Add tests for token absence and the handshake.
