# N92 — Heterogeneous modules — MCP/hook/skill contributions + testing pilot — Checklist

## Done criteria

- [ ] `AgentModuleSchema` supports `mcp-server`, `hook`, `skill` contribution kinds (Zod-validated)
- [ ] MD composition ignores non-text kinds — 9-role drift suite untouched and green
- [ ] Emission layer: `.mcp.json` dedup-by-name (error on conflicting config), `.claude/settings.json` marked-block hook merge, `.claude/skills/<name>/SKILL.md` writer
- [ ] All emission idempotent — second apply reports every target `unchanged`
- [ ] CLI: apply path emits artifacts with per-file changed/unchanged/created report, resolved from project root
- [ ] `testing` pilot module authored (prompt + hook + skill) and adopted by a playground-scoped composed agent
- [ ] Playground end-to-end: apply → artifacts present and well-formed; reapply → unchanged; module removal cleans the marked block
- [ ] No shipped role MD or composed def changed (pilot agent is playground-only)

## Quality gates

- [ ] `pnpm build` passes
- [ ] Lint passes (no new findings vs main)
- [ ] `pnpm --filter insight-flow test` passes incl. new emission tests + untouched drift suite

## Verification

- [ ] Playground run: hook entry visible in `.claude/settings.json` inside taskflow markers; skill file readable; `prompt-build --compose --apply` twice → second run all `unchanged`
