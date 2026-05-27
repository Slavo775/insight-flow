# N62 — sound files empty in repo causing silent notifications since 0.9.0

**Type:** fix
**Priority:** high
**Created:** 2026-05-27

## Problem

`packages/taskflow/src/server/sounds/idle-ping.mp3` and `permission-alert.mp3` are 0-byte empty files committed to the repository. The build script (`tsup && rm -rf dist/sounds && cp -r src/server/sounds dist/sounds`) faithfully copies these empty files to `dist/sounds/`, so the HTTP server serves 0-byte responses. `new Audio(src).play()` on an empty file produces silence — no error is thrown, so the bug is invisible. The real audio files (26 KB and 78 KB) exist only in the globally-installed npm package and were never committed to source.

## Goal

1. Real audio content for `idle-ping.mp3` and `permission-alert.mp3` committed to `src/server/sounds/` (non-zero size).
2. `pnpm build` produces a `dist/sounds/` directory with the same non-zero files.
3. A running dev server at `http://localhost:6006/sounds/idle-ping.mp3` returns a valid playable mp3.
4. Sound notifications play correctly in the dashboard when status transitions to `idle` or `permission-needed`.
5. A `.gitignore` or `.gitattributes` safeguard is in place so future binary replacements are not accidentally zeroed.

## Scope

### In scope

- `packages/taskflow/src/server/sounds/idle-ping.mp3`
- `packages/taskflow/src/server/sounds/permission-alert.mp3`

### Out of scope

- Dashboard playback logic (`packages/taskflow/src/server/dashboard.ts`) — playback code is correct.
- Master server sounds — master has no sound files.
- Adding new notification sounds or changing notification trigger logic.

## Implementation plan

1. **Locate real audio files** — find them in the globally-installed package:
   - `$(npm root -g)/insight-flow/dist/sounds/idle-ping.mp3` (≈26 KB)
   - `$(npm root -g)/insight-flow/dist/sounds/permission-alert.mp3` (≈78 KB)

2. **Copy real files into source** — replace the 0-byte placeholders:
   ```bash
   cp "$(npm root -g)/insight-flow/dist/sounds/idle-ping.mp3" \
      packages/taskflow/src/server/sounds/idle-ping.mp3
   cp "$(npm root -g)/insight-flow/dist/sounds/permission-alert.mp3" \
      packages/taskflow/src/server/sounds/permission-alert.mp3
   ```

3. **Verify sizes** — `ls -lh packages/taskflow/src/server/sounds/` should show > 0B for both files.

4. **Add `.gitattributes` entry** (if not already present) to mark mp3 files as binary, preventing git from treating them as text and corrupting them on checkout:
   ```
   *.mp3 binary
   ```

5. **Build and verify dist** — `pnpm build` then confirm:
   ```bash
   ls -lh packages/taskflow/dist/sounds/
   ```
   Both files should match the source sizes.

6. **Manual smoke test** — `pnpm play`, open dashboard, trigger a status change to `idle` or cause a permission prompt, confirm audio plays.

## Verification

```bash
# Source files non-zero
ls -lh packages/taskflow/src/server/sounds/
# dist files non-zero after build
pnpm build && ls -lh packages/taskflow/dist/sounds/
# HTTP endpoint returns audio/mpeg
curl -sI http://localhost:6006/sounds/idle-ping.mp3 | grep content-type
```

Manual: open dashboard, wait for or simulate an `idle` status transition — confirm audio plays.

## Notes

- Root cause introduced when sound files were first committed — empty placeholders were added instead of the real binaries. The global install predates this and has the originals.
- If the global install is not available (CI, fresh machine), a fallback source is needed: either bundle the files via LFS or find a royalty-free alternative. For now, copying from global install is sufficient.
- Related: `packages/taskflow/scripts/build.mjs` controls the sounds copy step — no changes needed there.
