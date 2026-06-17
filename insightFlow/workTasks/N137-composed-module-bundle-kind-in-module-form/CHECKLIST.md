# N137 — Composed-module (bundle) kind in module form — Checklist

## Done criteria

- [ ] `ModuleForm` lists "Composed module" as a creatable kind that produces `kind: "bundle"`.
- [ ] The bundle branch shows a multi-select of existing modules; selections persist to `modules`.
- [ ] Self-reference is impossible (own id excluded) and empty selection is rejected.
- [ ] A saved bundle file (`insightFlow/modules/<id>.json`) has `kind: "bundle"` + the chosen `modules`.
- [ ] No change to `core/schema/index.ts` or `agents/compose.ts`.

## Quality gates

- [ ] `pnpm typecheck` (server + client) passes
- [ ] `pnpm --dir packages/taskflow lint` passes
- [ ] `pnpm --dir packages/taskflow format:check` passes
- [ ] No regressions to the other module kinds in `ModuleForm`

## Verification

- [ ] Create a "Composed module" bundling the chrome MCP + chrome prompt modules; confirm the saved JSON and that an agent referencing it composes with both children expanded.
