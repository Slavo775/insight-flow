# N11 — Enforce CLI-only mutations in agent roles and add gh + git permissions — Review

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-21
**Verdict:** FIX NEEDED

### Blockers

- **Centralize the STRICT ENFORCEMENT block** — The same enforcement text is copy-pasted into all 8 role files. Extract it into a single shared file (e.g. `AGENT_ENFORCEMENT.md`) and have each role file reference it via `@AGENT_ENFORCEMENT.md` — or have `prompt-build --apply` always regenerate from one source of truth.

### Suggestions (non-blocking)

- None beyond the above.

### Notes

- Human asked: "maybe we can have some general STRICT ENFORCEMENTS when its all same?" — meaning: one canonical source, not N copies that can drift.
