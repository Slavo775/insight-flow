# N184 — Guides: author and install modules, agents, and custom flows — Checklist

## Done criteria

- [ ] `wire-pr-creation.md` — `agents.extend.task-git` recipe for `gh`/`glab`/prefill.
- [ ] `quality-gates.md` — typecheck/lint/test via `agents.extend` for implement + review-fix.
- [ ] `custom-module.md` — author a `custom:<slug>` module (kinds + user registry + validation).
- [ ] `custom-agent.md` — compose a custom agent; generate role via `prompt-build --compose`.
- [ ] `custom-flow.md` — define a flow + bind types via `flows.byType` / `set-default-flow`.
- [ ] `install-engine.md` — install/uninstall, `${VAR}` inputs, manifest, undo/rollback.
- [ ] `multi-project-master.md` — run master, register projects, view overview.
- [ ] `upgrade-1x-to-2.md` — layout + composition-v2 migration.
- [ ] Guides landing lists the real pages; links to Concepts (N182) + Reference (N183) resolve.
- [ ] Each recipe has numbered steps + real commands + expected output.
- [ ] No source-code change; commands invoke existing CLI/config only.

## Quality gates

- [ ] `pnpm --dir website build` passes, zero broken-link/anchor warnings.
- [ ] Commands match real CLI flags / config keys (spot-check `cli.ts` + `config.ts`).
- [ ] `npx prettier --check` passes on new files.

## Verification

- [ ] Build renders all guides under the Guides section.
- [ ] Follow one recipe end-to-end (e.g. wire-pr-creation) — steps are accurate.
