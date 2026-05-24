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
