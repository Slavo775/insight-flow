# N191 — Orchestrator agent — declare subagents, fan out and rejoin — Checklist

## Done criteria

- [ ] `subagents?: string[]` added to `ComposedAgentSchema`
- [ ] Reference validation: each id resolves to a `subagent`-kind module (custom-defs `validateReferences` + user-registry load)
- [ ] `collectArtifacts`/`targetArtifacts` include declared subagents so install/uninstall own them reference-safely
- [ ] `composeAgent` injects a `## Subagents` delegation section (each subagent's name + description + when-to-spawn + fan-out/synthesize/then-handover guidance)
- [ ] Composer MCP + dashboard agent form expose the `subagents` field
- [ ] One example `custom:` orchestrator (declaring 2 subagents) included

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] `pnpm build` passes

## Verification

- [ ] Installing the example orchestrator emits both subagent files (N190) + the orchestrator command/skill whose prompt lists them and instructs fan-out + synthesis
- [ ] Uninstall removes orchestrator + subagents reference-safely
- [ ] Composer MCP can author the orchestrator + its subagents
