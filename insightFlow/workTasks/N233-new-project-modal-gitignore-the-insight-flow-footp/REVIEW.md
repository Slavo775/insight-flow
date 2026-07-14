# N233 — New-project modal — gitignore the insight-flow footprint (shared or local) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-14
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Adds a gitignore choice to the master "New project" modal. `GET /api/fs/list` now
returns `hasGit` (shallow `.git` check on the browsed folder); when true the modal
shows a `shared` / `local` radio (default shared). On create, the server helper
`ignoreProjectFolder(repoRoot, slug, mode)` idempotently appends `<slug>/` to the
repo's `.gitignore` (shared) or `.git/info/exclude` (local). Small, well-scoped
change (3 files, +138/-3). Low risk: the write is behind the existing
`isTrustedActionRequest` gate, `mode` is validated to a literal union, and `slug`
is a single clean segment (name regex `[A-Za-z0-9 _-]{1,60}`), so no traversal or
content injection. Verified live: detection, both write modes, `git check-ignore`,
idempotency, and non-git no-op all pass. Approved — findings below are non-blocking.

## Checklist verification

- [x] `hasGit` on `/api/fs/list` — pass (server.ts:1108–1110)
- [x] Radio shown only when git present, hidden otherwise — pass (NewProjectModal.tsx:502)
- [x] Radio defaults to `shared` — pass (NewProjectModal.tsx:326)
- [x] Payload `gitIgnore?: "shared"|"local"`, server-validated to the union — pass (api.ts:66; server.ts:1197–1201)
- [x] shared → `.gitignore`, local → `.git/info/exclude` — pass (server.ts:64–80; verified live)
- [x] Idempotent + confined under `realParent` — pass (exact-match; realpath-confined)
- [x] No `.git` → no write, today's behavior — pass (server.ts:1222; verified live)
- [x] Quality gates: tsc clean, lint 0 errors, build green — pass

## Non-blocking

1. **`.git`-as-a-file (git worktree / submodule) breaks "local" mode** —
   server.ts:1108 (`hasGit`) + :72 (`mkdirSync`). `existsSync(".git")` is `true`
   when `.git` is a gitlink *file*; "local" then does `mkdirSync(<root>/.git/info)`
   which throws `ENOTDIR`. It is caught and surfaced as a warning (project still
   created), but the folder is never ignored — and even a successful write would
   target the wrong exclude file (a worktree's real exclude lives under the common
   gitdir). Fix: `statSync(gitPath).isDirectory()` before offering/using local
   (fall back to shared or skip). Recommended — cheap and the most user-visible gap.
2. **Ignore rule `<slug>/` is unanchored** — server.ts:65. Without a leading slash,
   git matches a dir named `<slug>` at *any* depth under the repo, not just the
   top-level project. Fix: write `/${slug}/` (and update the idempotency check to
   match). Recommended — one-char fix, strictly more correct.
3. **Idempotency is exact-match only** — server.ts:71. A pre-existing hand-edited
   `/slug/` or `slug` line isn't detected, so a duplicate `slug/` block could be
   appended. Minor; the normal re-create path is safe.
4. **Cosmetic leading blank line** in a brand-new `.gitignore` (empty `existing`
   → block starts with `\n`) — server.ts:76–77. Harmless.

## Security & edge cases

- Traversal / content-injection: **not exploitable** — `slug` is content-only and
  charset-limited (no `\n`,`/`,`.`); `mode` is a literal union; `repoRoot` is
  realpath-confined. Confirmed by review-security.
- **LOW — symlink-following write** (server.ts:70,78). If a pre-existing symlink
  sits at `<repoRoot>/.gitignore` or `.git/info/exclude` pointing outside the
  browse root, `writeFileSync` follows it, escaping the endpoint's realpath
  discipline. Bounded: requires a trusted (loopback / allowlisted-LAN) caller and a
  pre-planted symlink (not plantable via this endpoint); written content is fixed +
  benign. Optional hardening: `lstatSync` the target and refuse a symlink, or
  realpath-re-confine the parent before writing — matches `realDirWithinRoot`'s model.

## Fix pass (2026-07-14, task-review-fix)

All four non-blocking findings resolved in `server.ts` `ignoreProjectFolder` +
new `gitInfoExcludePath` helper. Verified live (normal repo + git worktree):

1. **Worktree/submodule `.git`-as-file** — FIXED. Added `gitInfoExcludePath()`:
   for a gitlink `.git` file it follows `gitdir:` → `commondir` and writes to the
   **common** `info/exclude` (the file git actually reads from a worktree).
   Verified: creating in a worktree with "local" writes `/wt-proj/` to the common
   exclude and `git check-ignore` in the worktree confirms it's ignored
   (previously threw ENOTDIR → warning, footprint not hidden).
2. **Unanchored rule** — FIXED. Rule is now `/${slug}/`. Verified: top-level
   `alpha-proj` ignored; nested `src/alpha-proj` NOT ignored.
3. **Idempotency** — matches the anchored rule; re-create → exactly 1 line.
4. **Cosmetic leading blank line** — FIXED. A brand-new `.gitignore` no longer
   starts with a blank line.

Not changed (out of scope, LOW, mitigated): the symlink-following-write note —
gated by `isTrustedActionRequest`, pre-existing symlink not plantable via this
endpoint; left as documented optional hardening. Gates after fix: tsc clean, lint
0 errors, build green.

## Notes

- Accepted design decision (per ANALYSIS.md): with git present there is no
  "commit it" opt-out — one of the two ignore modes always applies (default
  shared). This is a behavior change from before (task files were committed).
- No PR/branch yet; reviewed the working-tree diff. REVIEW written to file (no
  `agents.extend.task-review` PR command configured).
- Findings 1 and 2 are the two worth doing before merge if a quick fix pass is run;
  none block approval.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-14
**Verdict:** approved

### Summary

Re-review of the fix pass (server.ts `ignoreProjectFolder` rework + new
`gitInfoExcludePath`). All four Round-1 non-blocking findings are correctly
resolved and re-verified live on the freshly built binary (normal repo + git
worktree). No new blockers. Verdict: **approved**.

### Checklist verification

- [x] Finding 1 (worktree/submodule `.git`-as-file) — `gitInfoExcludePath`
  (server.ts:63–89) resolves gitlink → `commondir` → common `info/exclude`.
  Verified: worktree "local" writes `/wt-proj/` to the common exclude; `git
  check-ignore` in the worktree confirms it. No ENOTDIR, no warning.
- [x] Finding 2 (anchoring) — rule is `/${slug}/` (server.ts:101). Verified:
  top-level ignored, nested `src/<slug>` NOT ignored.
- [x] Finding 3 (idempotency) — matches the anchored rule (server.ts:105–106);
  re-create → exactly 1 line.
- [x] Finding 4 (leading blank line) — `prefix` only separates when content
  exists (server.ts:110); new `.gitignore` no longer starts blank.
- [x] Round-1 happy paths still pass (shared/local on a normal repo; non-git
  no-op); tsc clean, lint 0 errors, build green.

### Blockers

None.

### Non-blocking

- **Stale/broken gitlink** — if a `.git` file points at a non-existent gitdir,
  `gitInfoExcludePath` falls back to `<gitDir>/info/exclude` and writes there
  (mkdir + create). No crash, but the footprint isn't actually ignored (git reads
  a different dir). Rare; acceptable. Optional: validate the resolved gitdir exists.

### Security & edge cases

- **Updated — LOW (was Round-1 symlink note, now widened).** For "local" mode the
  write target is derived from the `.git` gitlink's `gitdir:` + `commondir`
  *content* (server.ts:74–88), in addition to the pre-existing symlink-follow at
  the final `writeFileSync`/`mkdirSync`. A `.git` file whose `gitdir:` points
  outside the browse root would redirect the (fixed, benign) write there. Same
  trust boundary as before: requires FS-write to plant the file/symlink (not
  plantable via this endpoint) and a trusted `isTrustedActionRequest` caller;
  written content is a static comment + `/slug/`. Still LOW / optional hardening
  (`lstat`-refuse-symlink and/or realpath-re-confine the resolved parent under
  `browseRoot()`), not a blocker.
- Traversal/content-injection remain not exploitable (single-segment charset-
  limited `slug`; literal-union `mode`).

### Notes

- Design decision unchanged (per ANALYSIS.md): with git present there is no
  "commit it" opt-out; default `shared`.
- No PR/branch; reviewed the working tree. REVIEW written to file (no
  `agents.extend.task-review` PR command configured).

## Hardening pass (2026-07-14, task-review-fix — "all non-blocking")

Both Round-2 non-blocking items resolved in `server.ts`; verified live.

1. **Symlink-following write (LOW security)** — FIXED. `ignoreProjectFolder` now
   `lstat`s the target and refuses (throws → surfaced as a warning) if it is a
   symlink, before any read/write. Uses `lstat` (not `existsSync`, which follows
   the link) so a *dangling* symlink is caught too. Verified: creating into a repo
   whose `.gitignore` is a dangling symlink to `/tmp/evil-target` returns a warning
   ("refusing to write through a symlinked ignore file") and does **not** create
   the target. Intentionally does not realpath-confine the resolved gitdir — a
   legitimate worktree's common dir can sit outside the browse root.
2. **Stale/broken gitlink (correctness)** — FIXED. `gitInfoExcludePath` now returns
   null when the resolved gitdir or common dir does not exist, so "local" mode on a
   pruned worktree / broken gitlink reports a warning ("could not locate the repo's
   info/exclude file") instead of writing to a path git never reads. Verified live.

Regression: worktree "local" still writes the common `info/exclude` and `git
check-ignore` confirms it. Gates: tsc clean, lint 0 errors, build green. Status
remains `approved` (these were non-blocking; no `fix-needed` verdict was raised).


---

## Round 3 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-14
**Verdict:** approved

### Summary

Re-review of the hardening pass (symlink-refusal + stale-gitlink guards in
`server.ts`). Both Round-2 non-blocking items are correctly fixed and re-verified
live. No new blockers. Verdict: **approved** — the feature is complete and ready
for human sign-off / push.

### Checklist verification

- [x] Symlink-refusal (server.ts:117–126) — uses `lstat` (catches *dangling*
  symlinks), treats ENOENT as safe-to-create, rethrows other errors (e.g. EACCES)
  → surfaced as a warning. Verified: dangling symlinked `.gitignore` → warning, no
  out-of-tree target created.
- [x] Stale/broken gitlink (server.ts:85, 93) — `existsSync` on resolved `gitDir`
  and `commonDir` → returns null → "local" reports "could not locate the repo's
  info/exclude file". Verified live.
- [x] Regression: worktree "local" still writes the common `info/exclude`; `git
  check-ignore` confirms. Normal-repo shared/local, anchoring, idempotency, non-git
  no-op all still hold. tsc clean, lint 0 errors, build green.

### Blockers

None.

### Non-blocking

None outstanding — all Round-1 and Round-2 findings resolved.

### Security & edge cases

- **Residual (LOW, accepted by design).** The symlink guard covers the *final*
  path component. In "local" mode the parent dirs come from the repo's own git
  metadata (gitlink `gitdir:`/`commondir`), which is intentionally NOT
  realpath-confined so legitimate cross-root worktrees keep working. An
  intermediate symlinked `info/` or a symlinked `.git` directory could therefore
  still redirect the write — but only within the same trust boundary as everything
  else here (requires FS-write to a browse-root folder to plant it + a trusted
  `isTrustedActionRequest` caller; the written content is a fixed benign
  `/slug/` + comment). Fully closing it would require confinement that breaks valid
  worktrees, so this is left as an accepted residual, not a defect.
- Traversal / content-injection remain not exploitable (single-segment
  charset-limited `slug`; literal-union `mode`).

### Notes

- Status stays `approved`; no `fix-needed` verdict was raised across the fix /
  hardening passes (all findings were non-blocking).
- No PR/branch; reviewed the working tree. REVIEW written to file.
- Recommended next step: `/task-human-review` (sign-off) or `/task-git` (push + PR).


---

## Human Review — Round 4

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-14
**Verdict:** approved

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

- Human wording (verbatim): "please approved install in global and restart master server".
- Approved. Follow-up requested: install the built package globally and restart
  the master server so it picks up the N233 changes.
