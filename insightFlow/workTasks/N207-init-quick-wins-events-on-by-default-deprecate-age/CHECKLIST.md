# N207 — Init quick wins — events on by default, deprecate agents.extend — Checklist

## Done criteria — implementer subtasks

- [x] `init/index.ts` scaffolds `activityEngine.enabled: true` (new projects get full events; activity hooks install by default).
- [x] Re-init over an existing config does **not** force-flip a user's explicit `activityEngine.enabled: false`.
- [x] `buildConfigWithExamples` no longer promotes `agents.extend` — the stub is replaced by a deprecation note (or `--examples` clearly marks it deprecated).
- [x] `agents.extend` still works (`applyAgentExtensions` intact); optional one-line deprecation warning when a config uses it.
- [x] Docs updated — `configuration.md`, `packages/taskflow/README.md`, `CLAUDE.md`: events on by default + `agents.extend` deprecated (still functional, slated for removal).

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (0 errors)
- [x] `pnpm --dir packages/taskflow test` passes (init integration tests updated if they assert the old default)

## Verification

- [x] `insight-flow init` in a throwaway dir → config has `activityEngine.enabled: true` and no promoted `agents.extend` stub.
- [x] Existing `enabled: false` config survives re-init unchanged.
- [x] A config with `agents.extend` still applies the extensions (non-breaking).
- [x] Docs show events-on-by-default and the deprecation.
