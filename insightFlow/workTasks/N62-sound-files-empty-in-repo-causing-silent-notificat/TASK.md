# N62 — sound files empty in repo causing silent notifications since 0.9.0

**Type:** fix
**Priority:** high
**Created:** 2026-05-27

## Problem

`packages/taskflow/src/server/sounds/idle-ping.mp3` and `permission-alert.mp3` are 0-byte empty files committed to the repository. The build script (`tsup && rm -rf dist/sounds && cp -r src/server/sounds dist/sounds`) faithfully copies these empty files to `dist/sounds/`, so the HTTP server serves 0-byte responses. `new Audio(src).play()` on an empty file produces silence — no error is thrown, so the bug is invisible. The real audio files (26 KB and 78 KB) exist only in the globally-installed npm package and were never committed to source.

## Goal

1. Sound notifications play in the dashboard when status transitions to `idle` or `permission-needed`.
2. No binary audio assets in the repository — no build-copy step, no HTTP sound endpoint.
3. `pnpm build` is simplified to `tsup` only.

## Scope

### In scope

- `packages/taskflow/src/server/dashboard.ts` — replace `new Audio(src).play()` with Web Audio API tone generation.
- `packages/taskflow/src/server/index.ts` — remove dead `/sounds/` HTTP endpoint and `.mp3` MIME entry.
- `packages/taskflow/package.json` — remove sounds copy from build script.
- `packages/taskflow/src/server/sounds/` — delete the empty mp3 placeholder files and directory.

### Out of scope

- Master server — has no sound files.
- Adding new notification sounds or changing trigger logic.

## Implementation plan

1. **Replace `playStatusSound()` in `dashboard.ts`** — swap `new Audio(src).play()` for Web Audio API:
   - `idle`: soft descending two-tone ping (880 Hz → 660 Hz).
   - `permission-needed`: urgent triple-beep pattern (660 → 880 → 660 Hz).
   - Use `var beep = function(...)` (not a block-level function declaration) for unambiguous scoping.
   - Create fresh `AudioContext` per call; close after 1.2 s. Wrap entire function in `try/catch`.

2. **Remove dead `/sounds/` endpoint from `server/index.ts`** — delete the 18-line handler block at `url.pathname.startsWith("/sounds/")` and remove `".mp3": "audio/mpeg"` from the MIME map.

3. **Delete `src/server/sounds/` directory** — remove `idle-ping.mp3`, `permission-alert.mp3`, and the now-empty directory.

4. **Simplify build script in `package.json`** — change `"build": "tsup && rm -rf dist/sounds && cp -r src/server/sounds dist/sounds"` to `"build": "tsup"`.

5. **Build and test** — `pnpm build && pnpm test` must pass.

## Verification

```bash
pnpm --dir packages/taskflow run build   # exits 0, no dist/sounds
pnpm --dir packages/taskflow test         # 6/6 pass
```

Manual: `pnpm play`, open dashboard, trigger an `idle` status transition — confirm audio beep plays.

## Notes

- Root cause: the original sound files were committed as 0-byte placeholders and the real binaries never existed in the repo (global install also 0B). Web Audio API tones are the correct long-term fix — no binary assets, works on CI, works on fresh checkouts.
- The original plan assumed the global install had real files; it does not. Approach was adapted during implementation.
