# N190 — Native subagent emission (cross-harness: Claude + Cursor) — Checklist

## Done criteria

- [ ] New `kind: "subagent"` variant in `AgentModuleSchema` (name, description, content, optional tools/readonly/is_background/model)
- [ ] `AgentArtifacts` gains `subagents[]`; `collectArtifacts` emits it; `"subagent"` added to `INSTALLABLE_MODULE_KINDS`
- [ ] `applySubagents` writes `.claude/agents/<name>.md` (tools/model dialect) and `.cursor/agents/<name>.md` (readonly/is_background dialect), per editor target
- [ ] Manifest-bucket ownership: idempotent re-install, reference-safe uninstall; `uninstallPlan`/`uninstallTarget` cover subagents
- [ ] `planFromArtifacts` includes subagent install steps
- [ ] Subagent kind surfaces in composer reads (dashboard `/api/modules` + composer MCP `list`/`get`); create/install/uninstall/delete ride existing N188 paths
- [ ] Dashboard module form supports the subagent kind

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes (emit, install-targets, custom-defs, user-registry)
- [ ] `pnpm build` passes

## Verification

- [ ] A `custom:` subagent bundled by an agent/flow installs to the correct per-editor path(s) with correct frontmatter
- [ ] Re-install is idempotent; uninstall is reference-safe (retained when still owned)
- [ ] Composer MCP `create_module` + `install` work for a subagent
