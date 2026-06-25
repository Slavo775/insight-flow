# N188 — composer MCP server — module/agent/flow lifecycle over MCP (stdio) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-25
**PR:** (no PR yet — reviewed against the working tree)
**Verdict:** fix-needed

## Summary

A stdio composer MCP server (`insight-flow mcp`) exposing 11 tools over the same
core the dashboard uses (write/delete extracted from `custom-defs.ts`;
install/uninstall via new `executeInstall`/`executeUninstall` wrappers). The
facade is clean, the build/typecheck/lint/full suite (306) are green, and
list/get/create/install/uninstall/delete plus the locked-by-id and default-flow
refusals were verified live. One correctness blocker: the locked-**by-kind** rule
(status-transition / handover) is not enforced on the write path, and the gap is
reachable — and damaging — over the new autonomous MCP surface.

## Checklist verification

- [x] `@modelcontextprotocol/sdk` added to `package.json` — pass
- [x] `src/mcp/` boots over stdio via `insight-flow mcp`, registered + in `printHelp()` — pass (11 tools listed live)
- [x] `list`/`get` return built-in + custom tagged `source`/`locked`/`installed` — pass (but see N1: `locked` flag semantics)
- [x] `create_*` write `custom:` defs — pass
- [ ] `update_*` ejects built-ins, **refuses locked modules** + the `default` flow, honors `x-revision` — **FAIL** (B1: refuses locked-by-id + default flow, but NOT status-transition/handover locked-by-kind)
- [x] `install`/`uninstall` work; uninstall reference-safe; `.mcp.json` undo preserved — pass (install→uninstall cycle verified)
- [x] `delete` removes the custom def, 409 when referenced — pass
- [x] Handlers reuse `custom-defs`/`agents`/`storage` — no duplicated domain logic — pass
- [x] Built-in `mcp-composer` module shipped; `install` writes the `composer` entry — pass (verified)
- [x] New dedicated top-level Docusaurus section + `_category_.json` + cross-links — pass (site builds, no broken links)
- [x] Both READMEs introduce the MCP and link to docs — pass

## Blockers

1. **`update_module` can override a built-in `status-transition`/`handover`
   module and brick the whole composer.**
   `packages/taskflow/src/dashboard/server/custom-defs.ts` `writeDefinition` (and
   the MCP `update_module` that calls it) gates the module lock on
   `isLockedModuleId(record.id)` — **id-only** (`security`/`enforcement`/`protocol`).
   But the user-space **loader** (`user-registry.ts` `readKind` → `isLockedModule`)
   refuses overriding a built-in module whose **kind** is `status-transition` or
   `handover`. So the writer accepts what the loader will then reject.

   **Reproduced:** `update_module({ def: { id: "task-git/handover-review",
   kind: "handover", to: "task-implement", mode: "auto", title: "x" } })` returns
   `{ ok: true }` and writes `insightFlow/modules/task-git-handover-review.json`.
   The **next** tool call (any that loads registries — `list`, `get`, `create`,
   even `delete`) throws `Invalid user-space definition … task-git-handover-review.json`.
   The composer is now unusable and **cannot be repaired over MCP** (every tool
   loads the registries first); the user must delete the file by hand.

   **Why it matters here:** the dashboard's client disables editing locked-by-kind
   modules, so the server gap was latent; the MCP surface has no such client guard
   and runs autonomously, so an agent can trip it directly. The spec explicitly
   requires refusing "all `status-transition`/`handover` by kind."

   **Fix:** make the write-path lock kind-aware for built-in overrides. In
   `writeDefinition`, refuse when
   `kind === "modules" && (isLockedModuleId(record.id) || (!isCustom && (record.kind === "status-transition" || record.kind === "handover")))`.
   Keep custom (`custom:`) modules of those kinds allowed (the loader does). This
   also hardens the dashboard's HTTP path. Re-run `custom-defs-api.test.mjs` +
   the MCP repro afterward.

## Non-blocking

1. **`locked` display flag is too broad for custom transition/handover modules.**
   `src/mcp/composer.ts` `listDefinitions`/`getDefinition` tag `locked` via
   `isLockedModule(d)` (id **or** kind). A `custom:` `status-transition`/`handover`
   module is editable/deletable yet would report `locked: true`. After B1, prefer
   `isLockedModuleId(d.id) || (d.source !== "custom" && (d.kind === "status-transition" || d.kind === "handover"))`
   so the flag means "actually read-only."

## Security & edge cases

- The autonomous install tool emits hooks (shell commands) into the project with
  no human gate — this is an explicit, documented product decision (README +
  docs), bounded by locked-module enforcement and the N172 `.mcp.json` undo
  snapshot. Accepted; B1 is precisely a hole in that "locked-module enforcement"
  guarantee and so should be closed.
- stdout purity verified: `insight-flow mcp` emits only MCP protocol frames
  (handshake + `tools/list` parsed cleanly); no stray logging corrupts the stream.
- `resolveProjectRoot` failures (run outside a project) are caught by `guard()`
  and returned as structured tool errors rather than crashing the server. Good.

## Notes

- B1 is a shared-core fix (one guard in `writeDefinition`), so it benefits the
  dashboard too — keep it in `custom-defs.ts`, not just the MCP layer, to
  preserve the single-source-of-truth the implementation set out to achieve.
- Everything else is solid; expecting a small, contained fix round.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-25
**Verdict:** fix-needed

### Summary

Human review of the documentation. The docs explain *what* the composer MCP does
(the tools, setup, safety) but not its *primary purpose* — that it exists to help
users handle insight-flow things.

### Blockers

1. (verbatim) "i dont see in the documentations information about this composer
   mcp tool is primarly used for the help users handling the IS things"

   Actionable interpretation (for `/task-review-fix`): the Composer MCP docs
   (`website/docs/composer-mcp/index.md`, and the README sections) should lead
   with *why* the tool exists — that it is primarily for helping users handle
   insight-flow ("IS") things: AI-assisted customization/management of
   insight-flow's own modules, agents, and flows from an MCP client — before
   diving into setup and the tool list.

### Non-blocking

(none)

### Security & edge cases

(none — documentation feedback)

### Notes

- This round adds a documentation blocker on top of the AI review's code blocker
  B1 (locked-by-kind). Both should be addressed in the next `/task-review-fix`.

---

## Fixes applied (Round 2)

**By:** task-review-fix · **Date:** 2026-06-25

- **B1 (AI blocker) — FIXED.** Added a single kind-aware predicate
  `isModuleEditLocked(def, isCustom)` in `agents/user-registry.ts` (locked id →
  always; custom → editable; built-in `status-transition`/`handover` → refused),
  and used it as the write-path guard in `dashboard/server/custom-defs.ts`
  `writeDefinition` (replacing the id-only `isLockedModuleId` check). The fix is
  in the shared core, so it hardens the dashboard HTTP path too. Re-ran the repro:
  `update_module` on `task-git/handover-review` now returns
  `403 '…' is locked (read-only)`; `create_module` of a `custom:` handover is
  still allowed; the registry stays healthy. Non-blocking N1 resolved by the same
  predicate — `composer.ts` `list`/`get` now tag `locked` via `isModuleEditLocked`.
- **Human blocker — FIXED.** `website/docs/composer-mcp/index.md` and both READMEs
  now lead with the tool's primary purpose: it's how an AI assistant helps you set
  up and customize insight-flow itself (modules/agents/flows) in plain language,
  before the setup/tool details.

**Gates:** `tsc --noEmit`, `eslint` (0 errors), `pnpm build`, `pnpm --dir website build`
(no broken links), and the full suite **306/306** all pass.
