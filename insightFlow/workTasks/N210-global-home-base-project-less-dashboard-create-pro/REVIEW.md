# N210 — Global home base — project-less dashboard, create-project from UI (non-coder onboarding) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-10
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

Global home base MVP: bare `insight-flow` (no project) opens the master overview instead of erroring; a "+ New project" button posts to a new `POST /api/projects/create` endpoint that scaffolds `~/insight-flow-projects/<slug>` via `initProject` and registers it; getting-started doc added. Functionally works (325/325, manual E2E). **One security blocker:** the new write endpoint is exposed on all network interfaces, contradicting its own "localhost only" comment.

## Checklist verification

- [x] Global entry — bare `insight-flow` with no project opens the home base (`cli.ts`, `resolveProjectRoot` guard → `runMaster`). Verified (HTTP 200 on `/overview`).
- [x] `POST /api/projects/create` — name validation, path confined to projects-home, dup → 409, scaffolds + registers. Verified.
- [x] Home UI "+ New project" + `createProject()`; getting-started doc.
- [ ] **"localhost only" claim** — **FALSE (Blocker 1):** the server binds all interfaces.

## Verification performed

- `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **325 / 325** ✅ · typecheck ✅ · lint 0 errors.
- Manual: bare `insight-flow` in an empty dir → home base serves `/overview`; `create {name}` scaffolds + registers; `../evil` → 400 (name regex); duplicate → 409.

## Blockers

1. **`POST /api/projects/create` is network-exposed but does filesystem writes + runs init — and the code comment falsely claims "localhost only."**
   - **Where:** `packages/taskflow/src/master/server.ts` — the create handler (comment says "localhost only (the server binds to localhost)"), and `server.listen(config.port, () => resolve())` at ~L269.
   - **Why:** `server.listen(port)` with **no host arg** binds to **`0.0.0.0` (all interfaces)** — Node's default. So the master, including the new create endpoint, is reachable from the **LAN**. Unlike the pre-existing register/update/status endpoints (in-memory registry only), this endpoint **writes to the host filesystem** (`mkdirSync` + `initProject`, which also installs hooks / `.claude` files). On shared wifi, anyone on the network could scaffold projects and trigger init writes under the user's home. The comment asserting localhost-only is untrue and misleading.
   - **Fix:** gate the create endpoint to **localhost callers** — at the top of the handler, reject if the peer isn't loopback:
     ```ts
     const remote = req.socket.remoteAddress ?? "";
     if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) {
       res.writeHead(403, { "Content-Type": MIME_JSON });
       res.end(JSON.stringify({ error: "create-project is localhost-only" }));
       return;
     }
     ```
     (Binding the whole server to `127.0.0.1` would also work but changes the existing register behaviour — out of N210's scope. The per-endpoint guard is the surgical fix.) Correct the comment to describe the actual guard. Re-verify: a loopback POST still creates; a non-loopback peer gets 403.

## Non-blocking

1. **Global-entry masks non-project errors.** `cli.ts` catches *any* `resolveProjectRoot()` throw as "no project" → home base. A genuinely broken project (e.g. malformed config up-tree) would silently open the home base instead of surfacing the error. Narrow the catch to `TaskflowProjectNotFoundError` (already imported).
2. **"Open" isn't wired** — creating a project tells the user to run `insight-flow` in the folder; the home base can't launch a project's dashboard yet (deferred, per the checklist). Fine for MVP; noted so it isn't forgotten.
3. **No automated test** for the create endpoint (manually verified). Add one when "Open"/launch lands.

## Security & edge cases

- **Path traversal:** defended twice — the name regex `^[A-Za-z0-9 _-]{1,60}$` forbids `/` and `.`, and the resolved dir is checked to stay inside the projects-home root. Good.
- The Blocker above is the one real gap: network exposure of a filesystem-writing endpoint.

## Notes

- MVP of "C" (the global/non-coder onboarding). Deferred: per-project dashboard launch from the home base; automated create-endpoint test.
- Blocker is a small, contained fix (a loopback guard) — not a design problem.

---

## Fix (2026-07-10, task-review-fix)

- **Blocker 1 — resolved.** `POST /api/projects/create` now rejects non-loopback callers up front: `req.socket.remoteAddress` must be `127.0.0.1` / `::1` / `::ffff:127.0.0.1`, else **403** `create-project is localhost-only`. Per-endpoint guard (server bind unchanged, so register/status behaviour is untouched). Comment corrected to describe the real guard. Verified: a loopback POST still creates the project (HTTP 200); the 403 branch is in the build.
- **Non-blocking 1 — resolved.** `cli.ts` global entry now only routes to the home base on `TaskflowProjectNotFoundError` (re-throws any other `resolveProjectRoot()` error), so a broken project surfaces instead of being masked.
- **Deferred (unchanged):** per-project dashboard "Open"/launch + an automated create-endpoint test — follow-ups.
- **Gates:** `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **325 / 325** ✅ · typecheck ✅.


---

## Round 2 — AI re-review (security fix)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-10
**Verdict:** approved

### Summary

Round-1 security blocker fixed and verified. `POST /api/projects/create` now rejects non-loopback callers (403); the misleading comment is corrected; the global-entry catch is narrowed to `TaskflowProjectNotFoundError`. The rest of the MVP is unchanged and works. **Approved.**

### Checklist verification

- [x] Create endpoint gated to loopback (`server.ts:207-211`) — `req.socket.remoteAddress` ∈ {127.0.0.1, ::1, ::ffff:127.0.0.1} else 403. In `dist/index.js` + `dist/cli.js`.
- [x] Global entry re-throws non-`TaskflowProjectNotFoundError` errors (`cli.ts:204`).
- [x] Global entry, create-from-UI, "+ New project", getting-started doc — unchanged, still pass.

### Verification performed

- Loopback `POST /api/projects/create {name}` → **HTTP 200**, project scaffolded + registered (the guard allows 127.0.0.1). 403 branch present in the build for LAN peers.
- `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **325 / 325** ✅ · typecheck ✅.

### Blockers

- None.

### Non-blocking

- Deferred (unchanged, not required for MVP): per-project dashboard "Open"/launch from the home base; automated create-endpoint test. Tracked in the checklist.

### Security & edge cases

- The filesystem-writing endpoint is now loopback-only; path traversal is blocked twice (name regex + in-root check). No remaining concern.

### Notes

- N210 (MVP of "C") is clean end-to-end. Targets `agents-approved`. Next: human review + merge.


---

## Round 3 — AI review (documentation)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-10
**Verdict:** approved

### Summary

Closed the two documentation gaps found in a human-review question: the home base wasn't in the master reference, and the `install-flow` command (N208) had no prose docs. Docs added/updated. **Approved.**

### Checklist verification

- [x] `built-ins/master-server.md` — intro mentions the home base; new **"Home base — create projects from the UI"** section (global install, "+ New project", `~/insight-flow-projects` + `INSIGHT_FLOW_PROJECTS_HOME`, loopback-only note); the `POST /api/projects/create` endpoint added to the Endpoints table (with `400`/`409`/`403`).
- [x] `cli/setup-and-dashboard.md` — new **`install-flow <flow-id>`** row (installs a built-in/custom flow; `default` / `composer-authoring` examples; idempotent; `--force`); `master` row notes bare `insight-flow` (no project) opens the home base.
- [x] `get-started/getting-started.md` — the "No terminal? Start from the home base" section (already present from the MVP).

### Verification performed

- Both features now appear in the docs: `install-flow` in the CLI reference; the home base in `master-server.md` (dedicated section + endpoint) and getting-started.
- Docs are markdown only (no code change); `pnpm --dir packages/taskflow run build` ✅ · test **325 / 325** ✅ (unaffected).

### Blockers

- None.

### Non-blocking

- Fragile heading-anchor cross-link avoided (linked to the page, not a `—`-containing anchor).
- Deferred (unchanged): "Open"/launch from the home base + an automated create-endpoint test.

### Security & edge cases

- The docs correctly state the create endpoint is localhost-only and that names are validated / confined to the projects-home root.

### Notes

- N210 now lands **complete with docs** (home base reference + `install-flow` command). Targets `agents-approved`; next is human review + merge.


---

## Round 4 — human review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-10
**Verdict:** approved

### Summary

Human sign-off on the global home base MVP + its docs. All three AI rounds were clean (security blocker fixed in Round 1, re-verified Round 2; docs added Round 3). Approved to merge into `agents-approved`.

### Checklist verification

- [x] Bare `insight-flow` (no project) opens the home base.
- [x] `POST /api/projects/create` scaffolds + registers; loopback-only (403 for LAN peers); name validated + confined to projects-home root.
- [x] Docs: home base in `master-server.md` + endpoint row; `install-flow` in CLI reference; getting-started section.

### Blockers

- None.

### Non-blocking

- Deferred (agreed, follow-ups): per-project dashboard "Open"/launch from the home base; automated create-endpoint test.

### Security & edge cases

- Filesystem-writing create endpoint is loopback-only; path traversal blocked twice (name regex + in-root check). Reviewed, no concern.

### Notes

- Merges into `agents-approved` alongside N207/N208. `install-flow` docs also cover the already-merged N208.
