# N135 — Suppress map node navigation in edit/create surfaces — Checklist

## Done criteria

- [x] `CompositionMap` accepts a `readOnly` (suppress-navigation) prop and honors it.
- [x] `AgentForm` preview map no longer navigates on click (opens
      `ModuleInfoModal`); unsaved form state is preserved.
- [x] Dead `/agent/__preview` navigation can no longer be triggered.
- [x] `FlowMap` exposes the same `readOnly` capability (default: navigates).
- [x] Read-only `AgentDetail` / `ModuleDetail` maps unchanged.

## Quality gates

- [x] `pnpm build` passes (tsc strict)
- [x] `pnpm --dir packages/taskflow test` passes (219/219)
- [x] `pnpm typecheck` + `lint` (0 errors) + `format:check` (changed files) pass

## Verification

- [ ] `pnpm play` → `/agent/new` with 2+ modules → preview node click does NOT
      navigate; form preserved.
- [ ] `/agent/edit/:id` → preview node click never leaves the form.
- [ ] `/agent/:id` and `/module/:id` detail maps still navigate / open modals.
