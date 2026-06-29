# N194 — Authoring flow skeleton + self-setup categorization (second built-in flow) — Checklist

## Done criteria

- [ ] Second built-in flow shipped + registered (appears in `/api/projects` + Flows browser)
- [ ] Lifecycle edges: analyze→create→implement→review→(fix)→human-review→test→install→done
- [ ] Gated `create → analyze` edge (no auto cycle); `analyze` is the primary entry agent
- [ ] Terminal `install` step gated on human-review approval; terminal `done` node
- [ ] Tasks bind to the flow (`create --flow <id>`) and are filterable by `flowId` ("self-setup" category) in dashboard + `list`
- [ ] No new task `type` enum introduced

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes (flow load + edge resolution + entry/terminal)

## Verification

- [ ] A task created under the new flow shows the authoring lifecycle in the flow map and is separable from default-flow tasks
- [ ] Flow validates against its agent set (placeholder/stub agents until N195)
