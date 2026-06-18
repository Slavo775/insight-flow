# N142 — handover module kind — schema + compose render + locked canonical set — Checklist

## Done criteria

- [ ] `handover` kind added to `AgentModuleSchema` in `core/schema/index.ts` with `{to, on?, mode(auto|gated, default gated), label?}`
- [ ] `handoverSection` added to `compose.ts` and wired into `composeAgent`, rendering a `## Handover` section with auto/gated language + `deriveCommandName(to)`
- [ ] Canonical handover modules shipped in `agents/modules/handovers.json`, registered in `MODULE_REGISTRY`, and locked via `user-registry.ts`
- [ ] Canonical handovers wired onto the relevant `agents/composed/*.json` (analyze→taskmaster gated; implement/review-fix/request-changes→task-git auto; review→human-review/review-fix gated)
- [ ] `*_ROLE.md` regenerated via `prompt-build --compose --apply`; diff limited to intentionally-handover'd agents

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] Lint/style consistent with surrounding `core/` + `agents/` code (2-space, double quotes)
- [ ] `pnpm --dir packages/taskflow test` passes (incl. compose byte-identical check)
- [ ] No regressions to `status-transition` / `advance` behavior

## Verification

- [ ] New compose test asserts `## Handover` section text for both `auto` and `gated`
- [ ] Schema test asserts `mode` defaults to `"gated"` when omitted
- [ ] `git diff` confirms only intended `*_ROLE.md` files changed
