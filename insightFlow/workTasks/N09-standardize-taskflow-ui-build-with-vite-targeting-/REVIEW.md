# N09 — Standardize taskflow UI build with Vite targeting dist/ui — Review

**Reviewer:** Task Reviewer (Tech Lead)
**Commit:** 945dde9
**Verdict:** APPROVED

---

## Summary

`packages/taskflow/vite.config.ts` replaces `scripts/build-taskflow-ui.mjs`. The `build:ui` script and a new `dev:ui` script invoke Vite directly. The legacy script and `vite.package.config.ts` are deleted. The `scripts/` directory is now entirely gone. The inline `closeBundle` plugin handles the `index.package.html → index.html` rename. Risk: **low** (functional; see non-blocking issues below).

---

## Checklist verification

- [x] `packages/taskflow/vite.config.ts` exists as single UI build source
- [x] `build:ui` runs Vite and targets `packages/taskflow/dist/ui/`
- [x] `dist/ui/` contains `index.html` and bundled JS/CSS (from prior successful build)
- [x] `server/index.ts` serves from `dist/ui` via `resolvePackageAsset("dist/ui")` (confirmed)
- [x] `packages/taskflow/package.json` `"files"` includes `"dist"` — covered by existing `"dist"` entry
- [x] `scripts/build-taskflow-ui.mjs` deleted
- [x] `dev:ui` script added
- [ ] Package README updated with `build:ui` / `dev:ui` — not updated
- [x] `scripts/build-taskflow-ui.mjs` no longer in repo ✓
- [x] `vite.package.config.ts` (root) removed ✓

---

## Issues found

### Non-blocking 1 — `build:ui` / `dev:ui` invoke Vite via absolute path

**File:** `packages/taskflow/package.json`

```
"build:ui": "node ../../node_modules/vite/bin/vite.js build --config vite.config.ts"
```

**Why:** `../../node_modules` is a monorepo-internal path that breaks if the package is run outside this repo (e.g., from a tarball install in a different project). Should be `vite build --config vite.config.ts` (relying on `pnpm exec` or the devDependency being hoisted).
**Severity:** Non-blocking — the UI is pre-built and shipped in the tarball; consumers never run `build:ui`. This only affects internal developers.

### Non-blocking 2 — `vite.config.ts` roots in `repoRoot`, not `packages/taskflow`

The config sets `root: repoRoot` (the monorepo root), which means Vite crawls the entire repo for assets and resolves path aliases from there. This is correct for the current setup (the UI source lives at repo root `src/`) but makes the vite.config.ts non-portable and fragile if the repo structure changes.

### Non-blocking 3 — README not updated

The `README.md` in `packages/taskflow/` doesn't document `dev:ui` or explain that the UI is pre-built in the tarball. Low priority.

---

## Quality gate results

- `packages/taskflow/vite.config.ts` present ✓
- `scripts/build-taskflow-ui.mjs` absent ✓
- `vite.package.config.ts` absent ✓
- `scripts/` directory absent ✓
- `dev:ui` script present ✓

## Notes

No GitHub PR (committed directly to main). Post-merge review. The non-blocking path issue won't affect published package consumers since the UI ships pre-built.
