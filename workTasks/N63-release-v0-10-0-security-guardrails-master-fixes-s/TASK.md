# N63 — release v0.10.0 — security guardrails, master fixes, sound fix, README

**Type:** chore
**Priority:** high
**Created:** 2026-05-28

## Problem

Four tasks merged since v0.9.1 (N59 security guardrails, N60 master UUID dedup fix, N61 overview grid layout fix, N62 sound files fix) need a versioned release. `packages/taskflow/package.json` is still on `0.9.1`; CHANGELOG and README `What's new` section both need updating before an npm publish.

## Goal

1. Bump `packages/taskflow/package.json` version to `0.10.0`.
2. Write the `[0.10.0]` entry in `packages/taskflow/CHANGELOG.md` covering N59–N62.
3. Update the `## What's new in 0.10.0` section in `packages/taskflow/README.md` (replace the 0.9.1 blurb).
4. Add the `[0.10.0]` entry to the root `CHANGELOG.md` (which mirrors the package changelog for human browsing).
5. Build and publish the package to npm as `insight-flow@0.10.0`.

## Scope

### In scope

- `packages/taskflow/package.json` — version field only
- `packages/taskflow/CHANGELOG.md` — prepend `[0.10.0]` entry
- `packages/taskflow/README.md` — replace `## What's new in 0.9.1` with `## What's new in 0.10.0`
- `CHANGELOG.md` (repo root) — prepend `[0.10.0]` entry
- Build (`pnpm build`) and npm publish

### Out of scope

- Any code changes — all code is already merged
- Bumping any other packages or workspace root `package.json`
- Docs other than the files listed above

## Implementation plan

1. **Bump version** — Edit `packages/taskflow/package.json`: change `"version": "0.9.1"` → `"version": "0.10.0"`.

2. **Write CHANGELOG entry (package)** — In `packages/taskflow/CHANGELOG.md`, insert after `## [Unreleased]`:

   ```
   ## [0.10.0] — 2026-05-28

   ### Security

   - **N59** — `AGENT_SECURITY.md` added at repo root with ≤ 30-line prompt-injection guardrail rules covering hidden-instruction suppression, URL exfiltration, action hijacking, and persona override. Imported via `AGENT_ENFORCEMENT.md` so all 8 agents receive the guardrails without individual edits. Synced to `packages/taskflow/templates/roles/AGENT_SECURITY.md`.

   ### Fixed

   - **N60** — Master registry no longer generates a new UUID on every re-registration; project cards deduplicate correctly when a server restarts.
   - **N61** — Overview grid uses equal-width columns (`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`) with a single-column fallback below 400 px viewport width.
   - **N62** — `/sounds/` endpoint restored with explicit `Content-Length` header. `playStatusSound()` tries the mp3 via a `HEAD` check first; falls back to Web Audio API tones when no file is present or file is empty. Placeholder `idle-ping.mp3` and `permission-alert.mp3` shipped in package.
   ```

3. **Update README** — In `packages/taskflow/README.md`, replace the `## What's new in 0.9.1` heading and its bullet block with the new `## What's new in 0.10.0` section describing the four changes above (condensed, one bullet per task).

4. **Write CHANGELOG entry (root)** — In `CHANGELOG.md`, insert a new `## [0.10.0] — 2026-05-28` section after `## [Unreleased]` mirroring the same four bullets.

5. **Build** — Run `pnpm build` from repo root; confirm it exits 0 and `packages/taskflow/dist/cli.js` is present.

6. **Publish** — Run `npm publish --access public` from `packages/taskflow/`; confirm the published version is `0.10.0` via `npm view insight-flow version`.

## Verification

```bash
# version bump
node -e "console.log(require('./packages/taskflow/package.json').version)"  # → 0.10.0

# changelog entry exists
grep '0.10.0' packages/taskflow/CHANGELOG.md
grep '0.10.0' CHANGELOG.md

# readme section updated
grep 'What.s new in 0.10.0' packages/taskflow/README.md

# build clean
pnpm build

# npm published
npm view insight-flow version   # → 0.10.0
```

## Notes

- Related tasks: N59, N60, N61, N62 (all merged on main).
- Previous release tasks: N57 (v0.9.0), N55 (v0.8.0), N44 (v0.7.0), N39 (v0.6.0).
- npm publish requires the publisher to be logged in (`npm whoami`). If not logged in, the implementer must run `npm login` first.
- `pnpm build` rebuilds both the taskflow CLI and insight-flow-master; both must succeed.
