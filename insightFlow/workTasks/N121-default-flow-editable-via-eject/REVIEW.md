# N121 — Default flow editable via eject — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

ProjectPage relaxes the edit gate so the default flow is editable (saving ejects
to `insightFlow/projects/default.json`); a "Revert to shipped" action removes the
override. The server exposes `ejected` on `/api/project`. The SourceBadge shows
"shipped · ejected". Clean.

## Checklist verification

- [x] Default flow editable; save ejects the override — `custom-defs-api.test.mjs` (ejected flag).
- [x] Revert removes the override; id falls back to the package default.
- [x] `saveDraft` carries `entryAgents` verbatim (only ones still in the agent set) — prevents dropping main agents on edit.

## Blockers

None.

## Non-blocking

- `saveDraft` resends the whole record; correct for whole-record validation, but a future optimistic-merge could shrink the payload. Not needed now.

## Security & edge cases

- Stale-revision (409) handling preserved; the eject write goes through the same validated CRUD path as custom flows.

## Notes

The canonical status set on the default flow becomes read-only per Epic 4 (N128).
