# N213 — Unified persistent project registry + init opt-in to the master hub

**Type:** feat
**Priority:** high
**Created:** 2026-07-10

## Problem

There are **two disjoint registries**: `bulk-ui`'s `~/.insight-flow/batch-ui.json` (list of project paths) and the master server's **in-memory** registry (populated at runtime when a dashboard registers). Nothing is the single source of truth for "which projects belong to the hub", and the master forgets everything on restart. The PWA hub (roadmap) needs **one persistent list of registered projects**, and `insight-flow init` should be able to add a project to it.

## Goal

1. One **persistent** registry of hub projects (id, label, path, assigned port, `bulkRegistered` flag), owned by the master (e.g. `~/.insight-flow/hub.json`), reconciled with `batch-ui.json` (migrate/fold, don't duplicate).
2. Master loads it on boot and seeds its in-memory registry from it; runtime `register`/`update` enrich the live view without losing the persisted list.
3. `insight-flow init` **asks** (when the project is not already registered) "Register this project with the insight-flow hub?" → on yes, add it to the persistent registry.
4. Port assignment recorded per project so launches don't collide (default: assign next free from a base, persisted; overridable).

## Scope

### In scope

- `packages/taskflow/src/core/global-config.ts` — the persisted hub registry read/write (extend or supersede the `batch-ui.json` helpers); a migration that folds existing `batch-ui.json` entries in.
- `packages/taskflow/src/master/registry.ts` + `server.ts` — load persisted entries on boot; a `POST /api/hub/register` (or reuse register) that persists; keep the live/online view layered on top.
- `packages/taskflow/src/agents/init/index.ts` — the opt-in prompt (respect `--yes` = skip/ask default) and the registry write.
- `packages/taskflow/src/core/types.ts` — the registry entry type (add `path`, `port`, `bulkRegistered`).

### Out of scope

- Liveness/healthcheck + token (N214).
- The app shell / proxy / switcher (N215), notifications (N216), PWA (N217).
- Changing how a running dashboard pushes state (that still works; here we only persist the *membership* list).

## Implementation plan

1. **Persisted schema.** Define the hub registry entry (`id`, `label`, `path`, `port`, `bulkRegistered`, `registeredAt`) + Zod validation; read/write in `global-config.ts` at `~/.insight-flow/hub.json`.
2. **Migration.** On first master boot / first read, fold `batch-ui.json` entries into the hub registry (idempotent); keep `bulk-*` CLI working against the unified store.
3. **Master boot seed.** `registry` loads persisted entries as known-but-maybe-offline; runtime `register`/`update` mark them online + attach the live URL/state.
4. **init opt-in.** In `initProject`, if the project path isn't registered, prompt (skip on `--yes` unless a flag says register); on yes, append to the hub registry and assign a free port.
5. **Port assignment.** Reuse `findFreePort`-style logic; persist the chosen port; document base (`6007+`).
6. **Tests.** Registry read/write + migration idempotency; init opt-in adds an entry (mock prompt / `--yes`).

## Verification

- After `init` + opt-in, `~/.insight-flow/hub.json` contains the project; master boot shows it in `/overview` even before its dashboard starts (as offline).
- `batch-ui.json` entries appear in the unified registry after migration; no duplicates.
- Build ✅ · tests green · typecheck ✅.

## Notes

- **Roadmap Phase 1.** First safe backend win; no UI rewrite. Independent of the proxy spike ([[N212]]) but feeds [[N214]] liveness and [[N215]] switcher.
- Keep it local-first: the registry lives under `~/.insight-flow/`, never a project dir.
- Decision locked: reverse-proxy hub model; this task just makes membership persistent + opt-in.
