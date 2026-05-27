# N62 — sound files empty in repo causing silent notifications since 0.9.0 — Checklist

## Done criteria

- [ ] `packages/taskflow/src/server/sounds/idle-ping.mp3` is non-zero (≥ 1 KB)
- [ ] `packages/taskflow/src/server/sounds/permission-alert.mp3` is non-zero (≥ 1 KB)
- [ ] `pnpm build` copies both files to `packages/taskflow/dist/sounds/` at the same sizes
- [ ] `*.mp3 binary` entry present in `.gitattributes` at repo root or package root
- [ ] HTTP endpoint `GET /sounds/idle-ping.mp3` returns `content-type: audio/mpeg` (non-empty body)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0
- [ ] `pnpm --dir packages/taskflow test` passes (no regressions)
- [ ] No regressions in dashboard rendering or activity feed

## Verification

- [ ] `ls -lh packages/taskflow/src/server/sounds/` shows > 0B for both mp3 files
- [ ] `ls -lh packages/taskflow/dist/sounds/` shows matching sizes after build
- [ ] Manual: `pnpm play`, open dashboard, trigger idle/permission status — audio plays audibly
