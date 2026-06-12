# N96 — Project layer — agent flow map + global install — Checklist

## Done criteria

- [ ] `ProjectSchema` with flow triggers constrained to real statuses/verdicts; invalid trigger fails a test
- [ ] `project/default.json` encodes the full current lifecycle incl. change-request + incident side-flows; referential integrity validated (agent ids ∈ COMPOSED_AGENTS, install ids resolvable incl. bundles)
- [ ] `ACTIVITY_AGENT` + `composed/activity.json` removed; `project.install` carries the activity modules; init/migrate-hooks apply it via the emitter
- [ ] Existing consumers migrate without duplicate hooks (playground verified, idempotent second run)
- [ ] `GET /api/project`; read-only `/project` page: flow map (agent nodes → `/agent/:id`, trigger-labeled edges) + install side panel; "Project" nav link
- [ ] Descriptive-now/prescriptive-later contract documented in code + README
- [ ] Drift suite untouched

## Quality gates

- [ ] `pnpm build` passes
- [ ] Lint passes (baseline)
- [ ] `pnpm --filter insight-flow test` passes incl. new project tests

## Verification

- [ ] Playground `migrate-hooks`: same hook-group count before/after, manifest coherent, second run all-idempotent
- [ ] `/project` renders the lifecycle; agent click-through works; install panel lists activity modules
