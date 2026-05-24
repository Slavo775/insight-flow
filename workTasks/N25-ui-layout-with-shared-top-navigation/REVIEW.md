# N25 — UI layout with shared top navigation — Review

## Human Review — Round 1

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-24
**Verdict:** fix-needed

### Blockers

1. **`/overview` nav pushed outside viewport by iframe** — `packages/taskflow/src/server/index.ts` (overview route)
   - The `NAV_CSS` includes `margin: -24px -24px 24px -24px` and `top: -24px` which are designed to cancel the main dashboard's `body { padding: 24px }`. The overview page has no body padding, so the negative margin pulls the nav 24px above the viewport edge, making it invisible/cut off.
   - **Fix:** In the overview page CSS block in `server/index.ts`, add an override after `getNavCss()` that resets the nav margin and top position: `.top-nav { margin: 0; top: 0; }`.

### Suggestions (non-blocking)

*(none)*

### Notes

- The nav itself looks correct visually when visible (project name left, Home / Overview links right, active state on Overview).
- Only the `/overview` page has this layout problem. The main dashboard `/` renders correctly.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-24
**Verdict:** fix-needed

### Blockers

1. **`/overview` missing `<meta name="viewport">` — everything tiny on mobile** — `packages/taskflow/src/server/index.ts` (overview `iframeHtml` builder)
   - The overview page HTML is missing `<meta name="viewport" content="width=device-width, initial-scale=1.0">`. Without it, mobile browsers render at full desktop scale (980 px virtual width), making the nav text unreadably small and the iframe black (its `src` resolves to `localhost` on the mobile device, not the server host).
   - **Fix:** Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">` to the `<head>` of the `iframeHtml` string, matching the same tag already present in `getDashboardHtml`.

2. **Content area needs horizontal overflow scroll** — `packages/taskflow/src/server/dashboard.ts` (`CSS` const, `.main-content` rule)
   - When Kanban columns overflow the viewport width (especially on mobile), there is no scroll. The user wants `overflow-x: auto` on the content area so the Kanban and timeline can scroll horizontally rather than clipping.
   - **Fix:** Add `overflow-x: auto` to the `.main-content` CSS rule (currently `flex: 1; min-width: 0`).

### Suggestions (non-blocking)

*(none)*

### Notes

- Home page nav looks great on mobile (screenshot 1). Only `/overview` is affected by the viewport issue.
- The iframe black content on mobile is a known architectural constraint (iframe `src` uses `localhost:6100` which resolves to the mobile device itself, not the server). The viewport fix addresses the nav rendering; the iframe content remains a separate issue.
- User's exact words: "on the project dashboard the menu is great but overview on mobile is sooooo small please we should have same it's probably because frame but please create layout for all pages with header and config with same css if content will be out please overflow scroll horizontally on context"


---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-24
**Verdict:** approved

*(No blockers. Approved after viewport meta + overflow-x fixes.)*


---

## AI Review — Round 4

**Reviewer:** Task Reviewer (AI)
**Date:** 2026-05-24
**PR:** https://github.com/Slavo775/insight-flow/pull/18
**Verdict:** approved

### Summary

Introduces `getNavHtml` / `getNavCss` helpers in `dashboard.ts`, wires the nav into both `getDashboardHtml` (Home page) and the `/overview` route's inline HTML builder. Two post-review fixes addressed: the nav's negative margin pulling it off-screen on `/overview` (override added), and the missing viewport meta tag causing tiny mobile rendering. Low risk — changes are additive; no existing routes or data paths altered.

### Checklist verification

- [x] `getNavHtml(projectName, activePage)` exported from `dashboard.ts` — confirmed in diff, renders `<nav class="top-nav">` with active class.
- [x] `getNavCss()` exported from `dashboard.ts` — confirmed, returns `NAV_CSS` string.
- [x] Nav CSS rules appended to `CSS` const — confirmed, identical rules added before closing backtick.
- [x] `getDashboardHtml` renders `getNavHtml(projectName, "home")` before `.top-bar` — confirmed in diff line +13.
- [x] `/overview` imports `getNavHtml` + `getNavCss`, nav above iframe, height `calc(100vh - 48px)` — confirmed.
- [x] `:root` CSS vars inline in `/overview` — confirmed in `overviewCss` string.
- [x] Build passes — verified during implementation (tsup ⚡️ success).

### Blockers

*(none)*

### Non-blocking

1. **CSS duplication** — `dashboard.ts` lines 208–214 (inside `CSS`) and 219–225 (`NAV_CSS`) contain identical nav rules. If either is updated the other must be kept in sync manually. Suggest extracting `NAV_CSS` first and appending: `CSS_BASE + "\n" + NAV_CSS`.

2. **`.activity-aside` sticky offset regression** — `dashboard.ts` CSS: `.activity-aside { top: 24px }`. Before this PR the aside stuck 24px from the viewport top (just inside body padding). Now the nav occupies 48px at the top; the aside will slide 24px behind the nav before pinning. Fix: change to `top: 72px` (48px nav + 24px body padding).

3. **`projectName` injected unsanitized** — `getNavHtml` concatenates `projectName` directly into HTML. If someone sets `projectName: "<script>alert(1)</script>"` in `taskflow.config.json`, it renders raw. Local dev config, not user input — acceptable for now, but worth an `encodeHtml()` helper long-term.

### Security & edge cases

- `/overview` with `config.master?.standalone = true` still returns 404 before any nav code runs — correct.
- `projectName` fallback to `"insight-flow"` when empty — correct.

### Notes

- The `overflow-x: auto` on `.main-content` is correct and does not conflict with the flex layout.
- The `.top-nav{margin:0;top:0;}` override in the `/overview` CSS block is a clean, minimal fix for the dashboard-vs-overview padding difference.
