# N204 — Composer install v2 — one install+validate agent (install-first), edge-case checklist, rollback-on-failure — Checklist

## Done criteria — implementer subtasks (tick each as built)

- [x] `composer-install-checklist` section module added (flat id): pre-flight plan → install (agents/modules/flows) → post-install validate → done; edge cases (unknown target, `.mcp.json` conflict on unrelated entry → human approval, missing secret, not-installable, file conflict); boundary (fix installs not definitions; no unrelated-settings change without approval; record installed ids).
- [x] `authoring-install/identity` rewritten as plan→install→validate→done; composes the checklist; rollback→`fix-needed` path on validation failure; keeps `done` terminal + records installed `custom:` ids.
- [x] `authoring-test/identity` removed.
- [x] `composed/authoring.json` — `authoring-test` agent deleted; `authoring-install` composes `composer-install-checklist` + `authoring-install/handover-fix`.
- [x] `project/authoring.json` — `authoring-test` removed from `agents`; edges `review --approved--> install`, `install --> done`, `install --fix-needed--> implement`; description updated.
- [x] `handovers-authoring.json` — `authoring-test/handover-install` removed; `authoring-install/handover-fix` (→ implement, gated) added; review's approved edge lands on install.
- [x] Installer can emit `fix-needed` on rollback via a chosen composer-scoped mechanism (documented); base-flow behaviour unchanged.
- [x] Docs (`agents-and-subagents.md`, `walkthrough.md`, `index.md`) — 5 agents, install-first + validate, edge-case checklist, rollback path.

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes (JSON valid, composes)
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (0 errors)
- [x] `pnpm --dir packages/taskflow test` passes (agent-count floor 6 → 5)

## Verification

- [x] `composer-authoring` loads via the real loader: 5 agents (no `authoring-test`), no dangling edges, valid path to `done`; `review --approved--> install`, `install --> done`, `install --fix-needed--> implement` present.
- [x] Rendered `authoring-install` shows plan → install → validate → done, installs flows, and carries the edge-case checklist (incl. the human-approval boundary + rollback).
- [x] No `authoring-test` / `task-authoring-test` left in `src` or docs.
