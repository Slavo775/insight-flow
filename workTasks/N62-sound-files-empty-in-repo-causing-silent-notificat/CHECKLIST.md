# N62 — sound files empty in repo causing silent notifications since 0.9.0 — Checklist

## Done criteria

- [ ] `playStatusSound()` in `dashboard.ts` uses Web Audio API (no `new Audio()` / no `/sounds/` fetch)
- [ ] `var beep = function(...)` (not a block-scoped function declaration)
- [ ] `src/server/sounds/` directory and all mp3 files deleted from repo
- [ ] `/sounds/` HTTP endpoint removed from `server/index.ts`
- [ ] `.mp3` MIME entry removed from `server/index.ts` MIME map
- [ ] `package.json` build script is `"tsup"` only (no sounds copy)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0
- [ ] `pnpm --dir packages/taskflow test` passes (no regressions)
- [ ] No regressions in dashboard rendering or activity feed

## Verification

- [ ] `ls packages/taskflow/src/server/sounds/` → directory does not exist
- [ ] `ls packages/taskflow/dist/sounds/` → directory does not exist after build
- [ ] Manual: `pnpm play`, open dashboard, trigger idle/permission status — audio plays audibly
