# N180 — Rework npm package README as funnel/landing page + fix stale CLAUDE.md dashboard description — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-25
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Two-file docs change: `packages/taskflow/README.md` (funnel rework of the top 18
lines) and `CLAUDE.md` (correcting the stale dashboard architecture). Reference
body of the README untouched; no source code changed. Docs-only, low risk.
Verified the funnel reads correctly, the accuracy fix matches ground truth, and
all link targets resolve. Approving.

## Checklist verification

- [x] README opens H1 → badges → elevator pitch → docs link (no release-notes wall above the fold) — pass
- [x] Badge row: npm version, downloads, license (shields.io, all linked) — pass
- [x] "What's new in 2.0.0" inlined highlights removed; one-line CHANGELOG pointer remains — pass (`grep` for the header → 0 matches)
- [x] Docs link → `https://slavo775.github.io/insight-flow/` — pass
- [x] 60-second quickstart intact (install → init → create → ui) — pass (untouched, lines below the funnel)
- [x] Deeper README reference sections preserved — pass (diff only touches lines 1–18)
- [x] `CLAUDE.md` line 7 corrected → React + Vite dashboard — pass
- [x] `CLAUDE.md` server bullet corrected → built React client + native SSE (not Socket.IO / vanilla JS); a `src/dashboard/client/` bullet added — pass; matches verified ground truth (react 18 + vite + `useDashboardStream.ts`)
- [x] No stale `server-rendered` / `Socket.IO` / `vanilla JS` / `React frontend` in `CLAUDE.md` — pass (grep empty)
- [x] Root `README.md` not modified — pass
- [x] No source/dashboard code changed — pass (diff = 2 docs files only)

## Quality gates

- [x] `prettier --check packages/taskflow/README.md CLAUDE.md` — pass
- [x] License badge link target exists — pass (root `LICENSE` present; also `packages/taskflow/LICENSE`)
- [x] In-page anchor `#upgrading-from-1x-to-20` resolves — pass (`### Upgrading from 1.x to 2.0` at README:783; anchor was already used pre-change)

## Non-blocking

1. The three shields.io badge images can't be fetched at review time (offline), but
   the URLs follow the canonical `img.shields.io/npm/{v,dm,l}/insight-flow` pattern
   and the package is published, so they will render on npm/GitHub. No action.

## Notes

- No PR yet (`branch`/`mrUrl` null) and no `agents.extend.task-review` command
  configured → reviewed the local working tree; REVIEW.md is the review surface.
- The CLAUDE.md fix is the real landing of a correction that auto-memory obs 7911
  claimed was already done — the file was still stale when implemented, now fixed.
- Part of the docs program: N180 (this) → N181 (docs-site IA + versioning, still
  `ready`). Next: `/task-git` to ship.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-25
**Verdict:** approved

> "looks good merge it"

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

Approved for merge after viewing the docs site locally. Handing off to `/task-git` to branch, push, open PR, and merge.
