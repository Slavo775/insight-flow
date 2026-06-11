# N89 — Agent composition model v2 — everything is a module + registry — Checklist

## Done criteria

- [ ] `AgentModuleSchema` is a discriminated union `kind: "section" | "include"`; `ComposedAgentSchema` has a single ordered `modules: string[]` — `sections`/`includes`/`trailingIncludes` removed
- [ ] Registry catalogues shared modules (`enforcement`, `protocol`, `events`, `minimal-diff`, `scope-guard`, `recorder-discipline`) + role-scoped `<role>/<slug>` modules
- [ ] `indexById` throws on duplicate module/agent id (with a test)
- [ ] Composer renders pure sequence in declared order; heading-targeted merging removed; `compose.ts` source-of-truth comment states hand-written roles remain canonical
- [ ] `task-implement` + `task-review-fix` re-expressed as ordered module-id lists, both still referencing `minimal-diff` + `scope-guard`
- [ ] Composed MD semantically reproduces both hand-written roles (normalized section-set test, not phrase-grep)
- [ ] Playground behavioral run with a composed prompt completed and outcome recorded in PR body
- [ ] No shipped `TASK_*_ROLE.md` / `AGENT_*.md` file modified

## Quality gates

- [ ] `pnpm build` passes (tsc)
- [ ] Lint passes
- [ ] `pnpm --dir packages/taskflow test` passes incl. updated `compose.test.mjs`
- [ ] No regressions in `prompt-build`'s non-compose path

## Verification

- [ ] `insight-flow prompt-build --compose` emits both agents; manual diff vs hand-written roles shows semantic-only deltas
- [ ] Playground task driven with composed `task-implement` prompt behaves per role contract
