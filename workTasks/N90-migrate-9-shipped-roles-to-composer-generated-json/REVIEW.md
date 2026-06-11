# N90 — Migrate 9 shipped roles to composer-generated (JSON canonical) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-11
**PR:** https://github.com/Slavo775/insight-flow/pull/65
**Verdict:** approved

## Summary

Round 3 source-of-truth flip (PR #65, commit `b2011b6`): the 9 shipped `*_ROLE.md` files are now generated from the JSON module registry — 49 role-scoped modules (`modules/roles/*.json`) + 3 shared includes, a v3 exact-emission renderer (continuation rule, extra-blank encoding, no trim/squeeze), `prompt-build --compose --apply` with per-file change reporting, and a byte-equality drift test for all 9 roles. **Risk profile is the inversion the spec predicted, and the mitigation held**: independently re-verified that the 9 role files do not appear in the PR diff at all and compose-apply reports all 9 `unchanged` — the switchover is byte-exact, zero behavioral change. Gates green (build, 99/99 tests, lint at main baseline). Verdict: **approved**.

## Checklist verification

- [x] Renderer continuation rule — pass (`compose.ts`; synthetic test asserts `NEVER\n\n- own bullet\n- shared bullet\n`)
- [x] All 9 roles as composed defs + role-scoped modules; shared modules only where byte-matching — pass (only the 3 includes matched; registry test enforces `<role>/<slug>` scoping + identity module per agent)
- [x] Byte-identical drift test — pass (headline test, all 9 vs committed files, actionable failure message)
- [x] `--compose --apply` per-file changed/unchanged/created summary; unknown agent throws before any write — pass
- [x] `agents.extend` survival — pass (playground: extensions appended with markers intact; enforcement patcher skips generated files since they contain `@AGENT_ENFORCEMENT.md`; test artifact reverted)
- [x] Empty `git diff` over the 9 role files — pass (re-verified during review: absent from `main...HEAD` diff entirely)
- [x] `sync-role-templates.mjs` unchanged — pass (12 templates, 0 copied)
- [x] `init` scaffolds with resolving `@includes` — pass via the init integration tests in the suite; not re-exercised manually (see Non-blocking #3)
- [x] `compose.ts` header comment: JSON canonical — pass
- [x] No `AGENT_*.md` partial modified — pass (diff grep clean)
- [x] Gates: build ✅ · 99/99 tests ✅ · lint = main baseline ✅ · `prompt-build` non-compose path untouched ✅

## Blockers

None — approved.

## Non-blocking

1. **`--compose --apply` writes to `cwd`, not the project root.** Run from a subdirectory it would *create* role files there (`join(cwd, fileName)`, prompt-build.ts). `readRawGitPerms` in the same file already uses `resolveProjectRoot` — reuse it for the apply target. One-line hardening for Round 4.
2. **Migration script not committed.** The decomposition tool (round-trip-verified) lived in `/tmp` and is discarded. Defensible — JSON is canonical now and the drift test proves the result — but the PR reviewer can't inspect the generator. Recorded here for the audit trail: deterministic split on standalone `@include` lines + ALL-CAPS headings, fence-aware, extras-as-trailing-newlines.
3. **Playground `init` not manually re-exercised** — covered by the suite's init integration tests only. Acceptable; a consumer-project smoke test would be a nice Round 4 add.
4. **Unknown-agent failure is a raw throw** (stack trace) rather than `console.error` + `exit(1)` like other CLI errors. Pre-existing style from N88/N89; tidy when prompt-build is next touched.
5. **`minimal-diff` / `scope-guard` / `recorder-discipline` now have zero referents** — kept for custom composition, but they're untested against real usage. Consider exercising them in Round 4's heterogeneous-module pilot or pruning.

## Security & edge cases

- `--apply` writes only to filenames from the hard-coded `AGENT_ROLE_FILE_MAP` — no user-controlled path segments; unknown ids throw before any write. Module ids with `/` still never reach file paths.
- Byte-exact emission means module JSON now carries significant whitespace; the schema's heading-or-body refinement plus the drift test catch accidental mangling.
- The drift test is the integrity backstop for the whole new editing workflow (edit JSON → compose-apply → commit both); it fails with a message that names the likely mistake.

## Notes

- 49 role-scoped modules and **zero cross-role byte-level section duplication** — empirically confirms the N88 audit; the composer's value is now structural (one model, one renderer, registry) rather than text dedup. Real text sharing arrives when wording is intentionally unified (the deferred wording task).
- Reviewer caveat: implemented and reviewed in the same session; human review on PR #65 is the independent gate.
- Roadmap: Round 4 — heterogeneous modules (MCP/hook/skill contributions, one real integration pilot); Round 5 — dashboard agent-creator UI. Plus the deferred wording-unification task now that drift is guarded.
