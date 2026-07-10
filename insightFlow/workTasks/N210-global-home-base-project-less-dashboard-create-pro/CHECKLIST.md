# N210 — Global home base — project-less dashboard, create-project from UI (non-coder onboarding) — Checklist

## Done criteria (MVP shipped)

- [x] **Global entry:** bare `insight-flow` with no project opens the master **home base** (instead of erroring) — `cli.ts` (`resolveProjectRoot` guard → `runMaster`).
- [x] **Create from UI:** `POST /api/projects/create` on the master — validates the name, scaffolds `~/insight-flow-projects/<slug>` (override `INSIGHT_FLOW_PROJECTS_HOME`), runs `initProject`, registers it. Path confined to the projects-home root (no traversal); duplicate → 409.
- [x] **Home UI:** "+ New project" button + `createProject()` in the overview (`overview.ts`).
- [x] Docs: getting-started "No terminal? Start from the home base".
- [~] **Deferred (follow-up):** master **spawns/launches** a project's dashboard on "Open" (child process + port + lifecycle). MVP: create tells the user to run `insight-flow` in the new folder.
- [~] **Deferred:** automated test for the create endpoint (manually verified end-to-end).

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (0 errors)
- [x] `pnpm --dir packages/taskflow test` passes (325/325)

## Verification

- [x] Bare `insight-flow` in an empty dir → home base serves `/overview` (HTTP 200), "+ New project" present.
- [x] `POST /api/projects/create {name}` → scaffolds + registers the project; `../evil` → 400 (traversal blocked); duplicate → 409.
