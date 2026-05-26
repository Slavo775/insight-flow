# N46 — config page showing all options and project setup — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-26
**PR:** https://github.com/Slavo775/insight-flow/pull/29
**Verdict:** approved

## Summary

Adds a `/config` dashboard subpage (190 lines in `dashboard.ts`, 19 lines in `index.ts`) that renders all `TaskflowConfig` sections as styled cards with default/custom value highlighting, plus a `/api/config` JSON endpoint. Risk is low — read-only, no mutations to state or config. Existing routes (`/`, `/overview`) are untouched. Verified live against the playground server.

## Checklist verification

- [x] `/api/config` endpoint returns the full `TaskflowConfig` as JSON — `curl http://localhost:6007/api/config` returns 726-byte valid JSON matching `playground/taskflow.config.json`.
- [x] `/config` route returns a full HTML page with all config sections rendered — title is "Config — Taskflow", all 7 sections present.
- [x] Nav bar shows "Config" link; it has the `active` class when on `/config` — confirmed via curl: `<a href="/config" class="nav-link active">Config</a>`.
- [x] `activePage` type in `getNavHtml` includes `"config"` — `dashboard.ts:267`.
- [x] Each config section is a styled card with key/value rows — `.config-section` + `.config-row` grid layout confirmed in CSS and rendered output.
- [x] Values matching built-in defaults render with the `.default` style (greyed) — `workDir`, `shardSize`, `rolesDir` show `is-default` in rendered HTML.
- [x] Values overriding defaults render with the `.custom` style (accent colour) — `projectName`, `port: 6007`, `activityEngine.enabled: true` show `is-custom`.
- [x] `agents.extend` entries render as a code block per agent name — `cfgValRow` with `<pre class="config-code">` at `dashboard.ts:385-387`.
- [x] `agents.git.permissions` flags render as a sub-table — `cfgValRow` with `.config-sub` container at `dashboard.ts:372-375`.
- [x] `getConfigPageHtml` is exported from `dashboard.ts` and imported in `index.ts` — `dashboard.ts:278`, `index.ts:21`.
- [x] `pnpm --dir packages/taskflow run build` passes (no TypeScript errors) — clean build with `tsup`.
- [x] No regressions on `/` (kanban) or `/overview` pages — home page nav verified: `Home [active] / Overview / Config`.

## Non-blocking

1. **Page `<title>` doesn't include project name** (`dashboard.ts:406`): `"Config — Taskflow"` is static. Home page also uses a static title ("Taskflow Dashboard"), so this is consistent — but worth unifying if project-specific titles become desirable.

2. **`cfgRow("enabled", ..., isDefault=true)` when `activityEngine` is absent** (`dashboard.ts:320`): When `config.activityEngine` is undefined, `enabled` renders as `"false [default]"`. The value `false` is displayed even though the key isn't present in config at all. A user reading the page could infer `activityEngine.enabled = false` is in their config when it isn't. Consider showing `"—"` or skipping the section entirely when `activityEngine` is `undefined`. Not a blocker — the behaviour is internally consistent.

3. **Hardcoded default `port: 6006`** (`dashboard.ts:315`): This default must match `config.ts`'s actual default. If that default ever changes, the comparison silently drifts. A minor coupling risk.

## Security & edge cases

`/api/config` responds with `Access-Control-Allow-Origin: *` (inherited from the shared server header at `index.ts:397-398`). `TaskflowConfig` has no sensitive fields today, but if a future key (e.g., API token for a git host) is added, it would be exposed. Worth a comment near the endpoint or a filter allowlist before that happens.

## Notes

- `cfgValRow` uses raw HTML in the `valHtml` parameter. All call sites correctly escape user-derived data (`escHtml(cmds.join(...))`, `escHtml(lines.join(...))`, `escHtml(ca.description || ca.role)`). No XSS risk in the current implementation.
- The `.config-row:last-child { border-bottom: none }` rule works correctly because config-rows are always the last children of their `.config-section` containers — verified against the Agents section which ends with an `extend` or `custom` row.


---

## Round 2

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-26
**Verdict:** approved

### Summary

Commit `763a5a7` makes three targeted corrections to the initial implementation. Diff is 7 added / 5 removed lines across 2 files — no scope creep. All three non-blocking items from Round 1 are addressed.

### Checklist verification (Round 2 delta — commit 763a5a7)

- [x] `activityEngine.enabled` default corrected `false → true` matching `config.ts ACTIVITY_DEFAULTS` (`dashboard.ts:320`) — live page now shows `enabled: true [default]`.
- [x] `activityEngine.phaseMarkers` default corrected `false → true` (`dashboard.ts:323`) — shows `[default]`.
- [x] `activityEngine.hookEnrichment` default corrected `false → true` (`dashboard.ts:324`) — shows `[default]`.
- [x] CORS comment added to `/api/config` (`index.ts:479-480`) — documents filter requirement for future sensitive keys.
- [x] Port default comment added linking `6006` to `config.ts DEFAULTS.server.port` (`dashboard.ts:313`).
- [x] Build still passes clean after fix.
- [x] No regressions — `projectName` and `port: 6007` still show as `is-custom`.

### Blockers

None.

### Non-blocking

The static `<title>Config — Taskflow</title>` (noted in Round 1) is still unchanged. Consistent with the home page and acceptable.

### Security & edge cases

No new concerns. The CORS comment is now in place.

### Notes

The three wrong default values (`false` instead of `true`) were caught correctly by cross-referencing `config.ts ACTIVITY_DEFAULTS`. Since `resolveConfig` merges defaults before the server receives the config object, the only reliable way to detect "this was user-set" vs "this is a default" is to compare the resolved value against the canonical defaults — which is what the fix does correctly.
