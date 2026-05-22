# N04 — Publish package to npm as `insight-flow` under sslavo account — Review

**Reviewer:** Task Reviewer (Tech Lead)
**PR:** https://github.com/Slavo775/insight-flow/pull/5
**Verdict:** APPROVED (with non-blocking notes)

---

## Summary

The implementation renames the publishable artifact in `packages/taskflow/` from `taskflow` to `insight-flow` and bumps to `0.3.0`. Five files changed (package.json, README.md, packages/taskflow/README.md, packages/taskflow/src/cli.ts, packages/taskflow/src/init/index.ts) plus the tracker shard. Internal artifact names (`taskflow.config.json`, `.taskflow-activity.jsonl`, the `packages/taskflow/` folder, hook filename) are intentionally kept — minimizes diff and doesn't affect the published name or CLI UX, matching the TASK.md scope rule.

Risk: **low**. No new dependencies, no schema/API changes, no auth or runtime behavior changes. The actual `npm publish` step is deferred to a manual post-merge run, as specified.

## Checklist verification

### Done criteria

- [x] `packages/taskflow/package.json` has `name: "insight-flow"` — verified line 2
- [x] `packages/taskflow/package.json` has `bin: { "insight-flow": "./dist/cli.js" }` — verified line 7
- [x] Version bumped to `0.3.0` — verified line 3
- [x] Package README install/usage references `insight-flow` — verified
- [x] CLI banner / help output uses `insight-flow` — `node dist/cli.js help` confirmed
- [x] Root `README.md` documents `npm i insight-flow` / `npx insight-flow` — verified
- [x] `npm pack` produces a valid tarball — `npm pack --dry-run` produced `insight-flow-0.3.0.tgz` (277 kB, 14 files including dist, schema, README, LICENSE)
- [ ] `npx insight-flow init` from packed tarball scaffolds expected files — **NOT VERIFIED in this PR** (no live install test was performed; pack dry-run only inspects metadata, not runtime behavior). See Notes.
- [ ] `npm publish` succeeded under `sslavo` — intentional deferral to manual post-merge step
- [ ] `npm view insight-flow` shows the package live — same, deferred

### Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow run build` produces `dist/cli.js`, `dist/index.js`, and bundled UI assets
- [x] Lint on changed files (`pnpm exec eslint packages/taskflow/src/cli.ts packages/taskflow/src/init/index.ts`) clean
- [ ] `pnpm lint` repo-wide passes — **NO**, but failures are pre-existing prettier issues in unrelated files (e.g. `src/commands/change.ts`, `src/lib/sample-data.ts`). Not introduced by this PR.
- [ ] `pnpm dev` still boots the dashboard SPA — **NOT TESTED**, but no SPA code paths were touched.

### Verification

- [ ] `npm whoami` returns `sslavo` before publishing — manual pre-publish step, not part of this PR
- [ ] `npx insight-flow@0.3.0 init` in fresh dir — deferred to post-publish
- [x] `grep -ri "npx taskflow|npm i taskflow|npm install taskflow" packages/taskflow/ README.md` returns zero hits — confirmed
- [x] PR description notes `npm publish` is a manual post-merge step — confirmed in the handoff report

## Issues found

### Non-blocking 1 — Lingering "taskflow" brand strings in `insight-flow init` output

`packages/taskflow/src/init/index.ts` lines 108, 117, 124 still emit "taskflow" in user-visible console messages:

```
console.log("Created CLAUDE.md with taskflow context");        // line 108
console.log("Updated taskflow section in existing CLAUDE.md"); // line 117
console.log("Appended taskflow section to existing CLAUDE.md");// line 124
```

After running `insight-flow init`, the user sees mixed branding (the welcome line says "insight-flow initialized!" but earlier lines say "taskflow context" / "taskflow section"). Not a functional issue — the CLAUDE.md markers (`<!-- taskflow:start --><!-- taskflow:end -->`) genuinely still use the literal "taskflow" prefix internally — but it's a small UX wart.

**Suggested fix (follow-up):** rephrase to "Created CLAUDE.md with insight-flow context" / "Updated insight-flow section". If the MARKER strings are also renamed to `<!-- insight-flow:start -->`, the wording becomes accurate; otherwise these logs technically describe the literal section marker name. Either is fine.

### Non-blocking 2 — Hardcoded version string in `cli.ts`

`packages/taskflow/src/cli.ts:120` returns `"insight-flow 0.3.0"` as a string literal. This will drift the next time `package.json` version bumps if someone forgets to update both. Reading from `package.json` at runtime (e.g. via `import pkg from "../package.json" assert { type: "json" }` or `JSON.parse(readFileSync(...))`) eliminates the dual-source-of-truth.

**Suggested fix (follow-up):** sync version from package.json. Low priority — N03 had the same pattern (was `"taskflow 0.1.0"` while package.json was already 0.2.0).

## Quality gate results

| Gate                            | Status                                                                 |
| ------------------------------- | ---------------------------------------------------------------------- |
| typecheck (package)             | ✅ pass                                                                |
| build (package + UI)            | ✅ pass (`dist/cli.js` 84 kB, `dist/index.js` 51 kB, UI bundle 850 kB) |
| eslint (changed files)          | ✅ pass                                                                |
| eslint (repo-wide)              | ⚠️ pre-existing failures, none in this diff                            |
| `npm pack --dry-run`            | ✅ produces `insight-flow-0.3.0.tgz` with correct file allowlist       |
| CLI smoke (`--version`, `help`) | ✅ both print `insight-flow` branding                                  |

## Notes

- The TASK.md spec said "verify locally" via `npm pack` + install in a scratch dir + `npx insight-flow init`. The implementation went as far as `npm pack --dry-run` and CLI smoke-test (`--version`, `help`), but did not actually install from the tarball in a temp directory and run `init` end-to-end. **Recommendation:** before the manual `npm publish` post-merge step, do one local install-from-tarball + `init` smoke run to catch any packaging gaps (missing files, broken imports). This is a pre-publish gate, not a PR blocker.
- The root `package.json` has an unstaged rename (`tanstack_start_ts` → `insight-flow`) that predates this PR. It's thematically aligned with N04 but was correctly excluded from this commit per the role's "unrelated changes" guidance. The user has been asked to decide whether to fold it in or ship separately.
- After merge, the actual publish sequence is: `npm whoami` (must be `sslavo`, `npm login` if not) → `cd packages/taskflow` → `npm publish`. The `prepublishOnly` hook will rebuild + typecheck automatically.
- No GitHub token at `~/.github-token`, so this review is REVIEW.md-only. Please post the verdict comment on PR #5 manually if a GitHub-side review record is needed.
