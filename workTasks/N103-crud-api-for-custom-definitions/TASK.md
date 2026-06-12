# N103 — CRUD API for custom definitions

**Type:** feat
**Priority:** medium
**Created:** 2026-06-12

## Problem

- N102 makes custom definitions loadable but they can only be authored by hand-editing JSON. The dashboard forms and flow editor (N106–N111) need server-side write endpoints with the same validation guarantees as the loader.

## Goal

1. Dashboard server CRUD: `POST/PUT/DELETE /api/modules/:id?`, `/api/agents/:id?`, `/api/projects/:id?` writing only to the user-space dirs under `insightFlow/`.
2. Every write Zod-validates the full record and runs referential-integrity checks (agent → modules, project → agents/install ids) before touching disk; failures return 400 with field-level details.
3. Built-ins are untouchable: any write targeting a non-`custom:` id returns 403.
4. DELETE refuses when the target is referenced (module used by an agent, agent used by a project) unless the reference is removed first — 409 with the referencing ids.

## Scope

### In scope

- `packages/taskflow/src/dashboard/server/index.ts` — route handlers + JSON body parsing consistent with existing `/api/*` style.
- Shared validation reusing N102's loader checks (no duplicated rules).
- Atomic writes (tmp file + rename) matching `storage.ts` conventions.
- Tests: happy CRUD per kind, 400 invalid, 403 built-in, 409 referenced delete.

### Out of scope

- Any UI (N106+). Auth (dashboard remains local-trusted). CLI equivalents of CRUD.

## Implementation plan

1. **Routes** — wire the three resources into the HTTP server next to existing GET endpoints.
2. **Validation layer** — `validateCustomWrite(kind, record, registries)` shared with N102.
3. **Persistence** — one file per record `insightFlow/<kind>/<id>.json`, atomic replace, delete removes file.
4. **Live update** — after a successful write, emit the existing dashboard refresh signal (same channel N93 pages use).
5. **Tests** — HTTP-level integration against a temp project.

## Verification

- Package tests green; curl round-trip in the playground: create module → referenced by created agent → delete module returns 409 → delete agent → delete module 200.
- Invalid kind payload returns 400 with Zod issue paths; write to `task-implement` (built-in) returns 403.

## Notes

- Depends on N102. Forms (N106/N107), projects page (N108), and editor save (N111) all consume these endpoints.
