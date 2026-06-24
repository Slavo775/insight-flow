# N176 — insight-flow 2.0.0 release docs — CHANGELOG highlights + README + docs refresh — Checklist

## Done criteria

- [ ] Change inventory derived from `git log v1.0.0..main` (70 PRs), grouped by theme — not from memory.
- [ ] `[2.0.0]` CHANGELOG rewritten: ~8–12 curated themed Added/Changed/Fixed bullets (no per-task wall); history below preserved.
- [ ] Breaking Changes / Migration section complete: composition v2 (N89) + insightFlow/ layout migration (N99–N101, `migrate-layout`) + `batch*→bulk*` alias removal if it happened — each with a Migration line.
- [ ] `packages/taskflow/README.md` line 7 header → "What's new in 2.0.0"; stale `workTasks/` refs fixed; sections added for flows/flow-editor, install/uninstall, flow-driven statuses, composition v2.
- [ ] Root `README.md` "What You Get" + quick start aligned with 2.0.0 and consistent with the package README.
- [ ] `docs/architecture-diagrams.md` refreshed (React/Vite dashboard, composition v2, flows); `docs/local-testing-with-yalc.md` verified.

## Quality gates

- [ ] Docs-only: `git diff --name-only` lists only `*.md` / CHANGELOG (no `src/` changes)
- [ ] No broken relative links introduced in edited markdown
- [ ] `pnpm --dir packages/taskflow run lint` still clean (no accidental non-doc edits)

## Verification

- [ ] `grep -n "What's new in 2.0.0" packages/taskflow/README.md` matches; no stale "What's new in 1.0.0".
- [ ] `grep -rn "workTasks/" README.md packages/taskflow/README.md docs/` shows only `insightFlow/workTasks/` in current-state prose.
- [ ] `[2.0.0]` CHANGELOG covers every theme from `git log v1.0.0..main` with ≤ ~12 highlight bullets + complete breaking section.
- [ ] Root + package READMEs make consistent feature claims (flows, install, layout).
