# N195 — Authoring flow agents — analyze/create/implement/review/fix/human-review/test/install — Checklist

## Done criteria

- [ ] 8 composed agents shipped + registered: analyze, create, implement, review, fix, human-review, test, install
- [ ] Every agent baseline-composed: `security` + `enforcement` + `protocol` + `activity`
- [ ] Handovers carry `when` intent (N189); modes auto/gated per spec
- [ ] Gated `create → analyze` (analyze-first when started at create); `install` sequenced after human-review approval
- [ ] `analyze` prompts the user about the activity engine (+ opt-ins) for the generated artifact
- [ ] `implement` authors defs via composer MCP `create_*`; `install` installs via composer MCP `install`
- [ ] Each agent declares its `subagents` (ids from N196)
- [ ] Role files re-synced via `prompt-build --compose --apply` + `sync-role-templates.mjs` (drift guard clean)

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes (compose + drift guard + handover rendering)

## Verification

- [ ] Agents compose with baseline present; handovers render with `when` (incl. gated create→analyze + install-after-approval)
- [ ] Drift guard (`compose.test`) passes
