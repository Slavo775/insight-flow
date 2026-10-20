# N275 — Consumer prompts carry the real roles — @-include built-in commands, Cursor include inlining, one name per agent — Review

**Reviewer:** Task Reviewer (ai) + independent correctness/security sub-review
**Date:** 2026-10-20
**PR:** (no PR yet — commit `948aa3a` on `chore/N271-audit-fixes`)
**Verdict:** REQUEST CHANGES (fix-needed)

## Summary

Built-in slash commands written by `init` now `@`-include the full role file instead of a 10-line stub; `toCursorBody` inlines `@`-includes for Cursor; composer custom agents use `deriveCommandName`; `agents.custom` bodies carry the security trio; the shared enforcement block no longer contradicts the per-agent subagent section. The direction is right and the Claude/Cursor security content now demonstrably reaches consumers (tests A16/A17). But the review found three defects that block merge: the new Cursor inliner reads **arbitrary `.md` files via `..`** from repo-controlled text (a file-inclusion hole of exactly the class N273/N274 closed elsewhere), existing consumers never receive the new commands (legacy stubs are neither upgraded nor even reported on the CLI path — the task's core promise is not delivered for anyone who already ran `init`), and the command bodies hardcode `.claude/roles/` so a custom `rolesDir` silently leaves the agent with **no role at all**. All three are small fixes (one regex, ~15 lines, 3 lines).

## Checklist verification

- [ ] `init` writes every built-in command as `@.claude/roles/<ROLE>.md` + `$ARGUMENTS`; `SKILL_*` deleted (A16) — PARTIAL: true for the default `rolesDir` only (blocker 3); constants deleted
- [ ] Fresh init writes the @-include; re-init never overwrites a differing command, it REPORTS it (A16) — NOT MET as written: the stub-hash upgrade the spec required (step 1) was dropped with unsound reasoning, and the CLI path does not report conflicts at all (blocker 2)
- [x] `toCursorBody` inlines included files; Cursor skills contain the security text (A17) — functionally VERIFIED (`consumer-roles.test.mjs` A17) but with the traversal hole (blocker 1) and a separator-stripping side effect (non-blocking #1)
- [x] No composed prompt says both "No subagents" and "You can delegate"; root re-composed; templates in sync (A19) — pass (`prompt-build.ts:41-42`; `AGENT_ENFORCEMENT.md` regenerated; compose.test drift guards; only `TASK_GIT_ROLE.md:115` keeps the line, `TASK_REVIEWER_ROLE.md:63` has the delegate sentence — no file has both)
- [x] A custom agent has one command name from `deriveCommandName` (A49) — pass (`skills.ts:124`; `init-layout.test.mjs:88-96`)
- [ ] DEFERRED to N281: custom-flow install emits `.cursor/skills` (A49) — deferral reason is sound (emit.ts `applyCommands` is N281's area) but N281's TASK.md does not list it, so it is currently untracked (non-blocking #7)
- [x] `agents.custom` bodies include the security/enforcement/protocol trio (A80) — pass (`skills.ts:66-68`)
- [x] A test asserts `templates/roles/*` equal the root files (A80) — pass with a weakness (silent `continue`, non-blocking #5)
- [x] Quality gates: typecheck / lint / full suite 413/413 — as run by the implementer; fixture + test changes are consistent with the code

## Blockers

1. **Path traversal in the Cursor include inliner** — `src/agents/init/providers/skills.ts:162` (`INCLUDE = /^@([A-Za-z0-9_./-]+\.md)[ \t]*$/gm`) and `:142-152` (`resolveCursorInclude`).
   **Why:** the capture allows `/` and `..`; `resolveCursorInclude` only strips a leading `.claude/roles/` and then calls `resolvePackageAsset("templates/roles/" + name)`, which is a bare `path.resolve` (`core/paths.ts:85-87`). `@../../../../../../Users/me/.claude/CLAUDE.md` resolves outside `templates/roles` and its content is read and inlined. The ref text is repo-controlled: `composeCustomAgentBody` (`skills.ts:58-82`) drops `agents.custom[].description` / `outputContract` / `role` from `taskflow.config.json` verbatim into the body, so a line beginning `@../..` in a cloned repo's config is matched by the multiline regex. Trigger: `insight-flow init` with Cursor selected (`--editor cursor`/`all`, or `.cursor/` auto-detect). Result: any `.md` on the victim's disk (a global CLAUDE.md, another repo's private notes) is written into `.cursor/skills/<name>/SKILL.md`, becomes agent instructions, and is pushed by the next `/task-git`. Composer modules are already safe (N273's `include.ref` regex forbids `/`), but that limit does not cover `agents.custom`.
   **Fix (one line):** capture a basename only — `const INCLUDE = /^@(?:\.claude\/roles\/)?([A-Za-z0-9_-]+\.md)[ \t]*$/gm;` — and drop the `ref.replace(...)` in `resolveCursorInclude`. Add a test: an `agents.custom` description containing `@../../package.json.md`-style refs produces no inlined content. (This also makes the `seen` key a basename — see non-blocking #4.)

2. **Existing consumers never get the new commands, and the CLI does not report it** — `src/agents/init/providers/claude.ts:27`, `cursor.ts:39`, `src/cli/cli.ts:234`.
   **Why:** spec step 1 required "overwrite a command only when it is missing, equals a known old stub (keep a list of stub hashes), or is unchanged since insight-flow wrote it". The implementation kept write-if-missing only, so every project that ran `init` before N275 (e.g. `playground/.claude/commands/task-implement.md` is still the old 15-line stub) stays on the weak prompt — the task's core promise is not delivered for them. The checklist says the conflict "is REPORTED", but `cli.ts:234` discards `initProject`'s return value, so the CLI prints only "[claude] Skipped 10 existing skill command(s)"; the `conflicts` list is surfaced only by the hub endpoint (`master/server.ts:1288`). The only CLI upgrade path is `--force`, which also overwrites the consumer's role files (`init/index.ts:201-204`) and so wipes `agents.extend` edits and manual role customizations. The deferral reasoning ("auto-upgrade conflicts with the in-place-init contract") does not hold: the N236 contract (`init.test.mjs:296-316`) protects content the **user** wrote; a byte-match against insight-flow's own former output is not user content — the spec anticipated this with the hash list.
   **Fix (~15 lines):** a `LEGACY_STUB_SHA256` set of the 10 old bodies (they are in this very diff), `isLegacyStub(text)`, and in `claude.ts:27` add `|| isLegacyStub(readFileSync(dest, "utf-8"))` (`cursor.ts:39` can compare after stripping the frontmatter, or just report). Print `conflicts` in `cli.ts:234` so the CLI path reports kept files at all. The in-place-init test stays green (its "MY OWN task-implement" is not a legacy hash).

3. **Command bodies hardcode `.claude/roles/` while `init` writes roles to `config.rolesDir`** — `src/agents/init/providers/skills.ts:29-30` vs `src/agents/init/index.ts:189-204`.
   **Why:** `rolesDir` is a documented config knob (README.md:254, :345) honored by `applyEnforcement` (`prompt-build.ts:190-230`), `applyAgentExtensions` (`agents.ts:29`) and init's copy step, but `builtinBody` always emits `@.claude/roles/<ROLE>.md`. With `rolesDir: "docs/roles"` every built-in command points at a file that does not exist; the agent runs with **no role at all** — silently, and worse than the old stub.
   **Fix (3 lines):** `buildSkillList(customAgents, rolesDir = ".claude/roles")` → `builtinBody(name, rolesDir)` = ``@${rolesDir.replace(/\/+$/, "")}/${AGENT_ROLE_FILE_MAP[name]}\n\n$ARGUMENTS\n``; pass `config.rolesDir` at `init/index.ts:180`. N274 already guarantees `rolesDir` stays inside the project (`config.ts:92`), so this adds no traversal surface.

## Non-blocking

1. `skills.ts:175` — `/^---[ \t]*\n(?=\s*$)/gm` strips **every** `---` followed by a blank line, not just one left dangling after a dropped include (`\s*` spans newlines, so the lookahead matches the normal `---\n\n## Heading` pattern). All section separators in role files vanish from Cursor skills. Since includes are now inlined nothing dangles any more — delete the line (or anchor it to a preceding removed include as the old code did).
2. `skills.ts:142-152` — spec step 2 said "the generated file in the roles dir when it exists, else `resolvePackageAsset`". The implementation always reads the shipped template, so for Cursor: `agents.extend`, `notifications.cli:false` (AGENT_NOTIFY blanking), `phaseMarkers:false`, and the generated `@AGENT_GIT.md` permission snapshot never reach the skill (`AGENT_GIT.md` resolves to null and is dropped). Acceptable only because `TASK_GIT_ROLE.md:34` orders a live read of `agents.git.permissions`. Hardening: prefer `resolve(cwd, rolesDir, basename)` when it exists (basename-guarded per blocker 1); for cursor-only inits generate `AGENT_GIT.md` via the same `buildGitBlock` path.
3. `skills.ts:26-27` — stale doc comment: "`overwrite: true` refreshes stale stubs on re-init" contradicts `:48-52` and the code. Fix the comment (or make it true per blocker 2).
4. `skills.ts:164/167` — `seen` is keyed by the raw ref, so `@.claude/roles/AGENT_SECURITY.md` and `@AGENT_SECURITY.md` are different keys and the same file can be inlined twice. Falls out for free from the basename capture.
5. `test/consumer-roles.test.mjs` — `if (!existsSync(rootPath)) continue;` skips silently; all 14 templates have a root canonical today, so make it `assert.ok(existsSync(rootPath), …)` or a deleted/renamed root file passes the drift test vacuously.
6. The A16 test proves the command points at the role file and that the role file contains `@AGENT_SECURITY.md`; it does not prove Claude Code resolves that nested bare ref relative to `.claude/roles/` (this repo's own commands resolve at the root). One manual check in a consumer project (open `/task-implement`, confirm the PROMPT INJECTION block is in context) is the only evidence the Claude side actually delivers the guardrails — do it before merge.
7. The A49 deferral is sound, but N281's TASK.md does not list "custom-flow install emits/uninstalls `.cursor/skills`" — the item is untracked. Add one line to N281 via `/taskmaster-change` or open a follow-up.
8. Layering: `skills.ts:9` imports `cli/commands/prompt-build.js` from `agents/init/providers`. No cycle, and `init/index.ts:22` already crosses the same way — consistent; moving `buildEnforcementBlock` into `agents/` is a later tidy-up.
9. Frontmatter: inlined `---` lines cannot hijack `SKILL.md` frontmatter (`cursor.ts:15` closes the YAML block before the body). Pre-existing, out of scope: `cursor.ts:14` escapes only `"` and `\`, so an `agents.custom` description containing a newline still breaks/forges the frontmatter.
10. Dropping "No subagents" (A19) does not weaken safety: it was a token-efficiency rule, subagent tool scope is enforced by the N190 frontmatter path, and task-git keeps the line in its own module.

## Security & edge cases

- Blocker 1 is the security item: a repo-controlled `@../…` ref becomes arbitrary local-file inclusion into a generated agent prompt. It is reachable only through `agents.custom` text (composer modules are already basename-limited by N273) and only on a Cursor init — but that is exactly the "cloned repo" threat N274 was about.
- Verified safe: `AGENT_ROLE_FILE_MAP` covers all 10 built-in names (no `@.claude/roles/undefined`); recursion terminates (the `seen` set is monotone over a finite file set; a self-reference hits `seen` → ""); the regenerated `AGENT_ENFORCEMENT.md` matches `buildEnforcementBlock() + "\n"` as compose.test expects; the baseline fixture is `builtinBody()` output, independent of the removed `overwrite` flag; no remaining references to the deleted `SKILL_*` constants.

## Notes

- Fix order: blocker 1 (regex + test) → blocker 3 (rolesDir plumbing) → blocker 2 (legacy-stub hashes + print conflicts). All three are local to `skills.ts` / `claude.ts` / `cli.ts` and keep the current tests green; add the traversal test and a legacy-stub-upgrade test.
- After the fixes, re-run the baseline fixture regeneration only if `builtinBody` output changes for the default `rolesDir` (it should not).
- Hand-off: `/task-review-fix N275` (gated — wait for the human's go-ahead).

## Fix log (task-review-fix, 2026-10-20, Opus 4.8)

**Blocker 1 — Cursor include path traversal — FIXED** (`skills.ts`): `resolveCursorInclude` now resolves by BASENAME only against the shipped `templates/roles/` (a non-basename/`..` ref → null), so a repo-controlled `@../../…CLAUDE.md` in an `agents.custom` body can never read an arbitrary file. New test `blocker 1: a Cursor include cannot traverse out`.

**Blocker 2 — existing consumers never upgraded, no CLI report — FIXED.** Added `LEGACY_STUB_SHA256` (13 hashes — every historical built-in command body, collected by walking git history + a real older consumer) and `isLegacyStub()`; `claude.ts` now UPGRADES a command whose content is a known legacy stub (insight-flow's own output, never user content) to the @-include form, and `cli.ts` now prints the kept-file conflicts on the CLI path. New test `blocker 2: a legacy stub is upgraded; user edits are not`. The in-place-init contract test still passes (a user-edited command is preserved).

**Blocker 3 — rolesDir hardcoded — FIXED**: `builtinBody(name, rolesDir)` and `buildSkillList(customAgents, rolesDir)` honor `config.rolesDir` (passed from `init`). New test `blocker 3: a custom rolesDir is honored`.

**Non-blocking addressed:**
- #1 removed the blanket `---`-stripper (it deleted every section separator; includes are now inlined so nothing dangles).
- #3 corrected the stale `overwrite: true refreshes stale stubs` doc comment.
- #4 the Cursor inliner `seen` guard is now keyed by basename (no double-inline of `@.claude/roles/X.md` vs `@X.md`).
- #5 `consumer-roles` drift test now asserts the canonical root exists (no vacuous pass on a renamed/deleted root).
- #7 added the deferred A49 (`.cursor/skills` install-emit) item to N281's TASK.md so it's tracked.

**Non-blocking deliberately left (with reason):**
- #2 Cursor inliner prefers the SHIPPED template over the consumer's generated role (so `agents.extend` / `AGENT_GIT.md` edits don't reach a Cursor skill). Larger change; the critical git-permission case is covered by TASK_GIT's live-read, per the review. Noted.
- #6 only a manual check proves Claude resolves the nested bare ref relative to `.claude/roles/` — can't be automated here.
- #8 the `providers → cli/prompt-build` import direction — later tidy (no cycle).
- #9 `cursor.ts` escapes only `"`/`\` in frontmatter (a newline in a description) — pre-existing, out of scope.

Verified: typecheck + lint + build clean; consumer-roles + init-layout + compose 52/52, init + agent-command 30/30.
