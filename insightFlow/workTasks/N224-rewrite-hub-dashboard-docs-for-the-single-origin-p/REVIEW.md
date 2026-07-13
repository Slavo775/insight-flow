# N224 — Rewrite hub/dashboard docs for the single-origin PWA hub — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-13
**PR:** (no PR yet — branch `dashboard-improvements`, not yet committed)
**Verdict:** approved

## Summary

The hub/dashboard docs are rewritten to match the shipped single-origin PWA hub, and an **independent code fact-check found zero inaccuracies** — all 17 endpoint-table rows, ports (6100 / 6006 / 6007), New-project modal defaults, the `isTrustedLocalRequest` / `isTrustedActionRequest` security model, `hub.json` persistence, and the `/project/<id>/` proxy behavior were verified against `master/server.ts`, `overview.ts`, `index.ts`, `registry.ts`, `global-config.ts`, and `agents/init`. Every stale claim from the old prose is gone; the Docusaurus site builds clean (broken links throw by default). APPROVE. Docs-only, no code touched.

## Checklist verification

- [x] `built-ins/master-server.md` rewritten — hub reference (registry, `/project/<id>/` proxy, running/stopped switcher, New-project modal + install options, PWA + SW notifications/sounds, liveness/refresh, endpoint table, security model). Fact-checked accurate.
- [x] `guides/multi-project-master.md` rewritten — hub walkthrough (start, register, open/start, New project, PWA + phone via trusted host, legacy `bulk-*`). Accurate.
- [x] Mobile/PWA + `INSIGHT_FLOW_TRUSTED_HOSTS` + trust-boundary warning documented in both docs (matches `isTrustedActionRequest` semantics).
- [x] `bulk-*` labeled legacy; hub is the primary path (both docs + `cli/setup-and-dashboard.md`).
- [x] Touchpoints corrected + consistent — `dashboard/index.md`, `cli/setup-and-dashboard.md`, `built-ins/index.md`, `README.md` (line 61). All verified.
- [x] No stale claims — grep clean for "in-memory registry" / `prompt()` / "run in its folder to open" / "card grid" / "links to each project".
- [x] Docusaurus build SUCCESS (no broken-link / frontmatter errors).
- [x] Every claim verified against shipped code (independent fact-check pass, file:line cited).

## Blockers

None.

## Non-blocking

1. **LOW polish — `master-server.md` Refresh line** ("probes each registered project's `/health`") could add "(loopback ones)" — stopped projects have no url so aren't probed. The fact-checker judged the current wording the only sensible reading; optional.
2. **LOW polish — `INSIGHT_FLOW_CONFIG_DIR` row** lists "hub.json / port pointers" but the var also redirects `batch-ui.json`. An omission, not a false statement. Optional.
3. **Follow-up (not N224):** when 2.4.0 ships, cut the `versioned_docs/version-2.4` snapshot (a release step, per TASK.md out-of-scope).

## Security & edge cases

N/A — docs only, no code/behavior change. The docs *describe* the security model accurately (trust boundary warning present in both the reference and the guide).

## Notes

- Deliberate, correct omission: `INSIGHT_FLOW_PROJECTS_HOME` is documented **nowhere as the scaffold base** because the code audit found it unused in the New-project create flow (which scaffolds under the browsed `INSIGHT_FLOW_BROWSE_ROOT` dir). Good call to not document vestigial behavior.
- Depends-on N223 is satisfied (merged) — the trusted-hosts docs describe shipped behavior.
- Next (gated): human review (a fresh-reader skim) → `/task-git` merge to `dashboard-improvements` so the docs ship with 2.4.0.


---

## Round 2 — approved

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-13
**Verdict:** approved

### Summary

Human words: *"approved merge please into the base"* — accepted on the strength of the AI review (independent fact-check, zero inaccuracies, site builds clean). Merge N224 into `dashboard-improvements`.

### Blockers

None.

### Notes

- Docs ship with 2.4.0. The `version-2.4` snapshot is a release-time step (out of scope here).
- Proceeding to `/task-git` — merge to `dashboard-improvements`.
