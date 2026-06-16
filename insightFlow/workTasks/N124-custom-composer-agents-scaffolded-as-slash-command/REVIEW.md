# N124 — Custom composer agents as slash commands — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`composerAgentSkills()` scaffolds `/<agent-id>` slash commands for `custom:`
composer agents (body = composed prompt + `$ARGUMENTS`), appended to the skill
list. Guarded with try/catch returning `[]` so a registry failure degrades to
the default-only set (byte-identical when there are no custom agents).

## Checklist verification

- [x] Custom composer agents become `/agent-id` skills — `init-layout.test.mjs`.
- [x] Default-only init unchanged (`composerAgentSkills()` returns `[]`).
- [x] `description ?? title` fallback (the typecheck fix) is correct.

## Blockers

None.

## Non-blocking

- A custom agent id colliding with a shipped skill name would shadow it; not currently possible (custom ids are `custom:`-prefixed and stripped to a distinct slug), but worth a guard if naming rules ever loosen.

## Security & edge cases

- `overwrite: true` is intended (regenerates the slash command); skill name derives from the validated id slug — no path traversal.

## Notes

Unifies composer custom agents with the slash-command surface; N133 renders their transition wording.
