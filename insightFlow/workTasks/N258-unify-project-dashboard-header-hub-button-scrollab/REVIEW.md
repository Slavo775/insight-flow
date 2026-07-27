# N258 — Unify project dashboard header (hub button, scrollable menu, search + settings) — Review

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-22
**PR:** (no PR yet)
**Verdict:** fix-needed

## Round 1 — AI pass

### Summary

Solid, faithful rework. The promotion of `Header` / `SquareIconButton` / `icons` into the shared `components/` barrel is correct — master's `App` / `LogsPage` headers stay byte-identical (the new `maxWidth` default `"1152px"` equals master's `layout.ts` `MAX_WIDTH`, and `className` forwards to `Bar` so `styled(Header)` composes). The new `ScrollShadow` edge logic is correct (no-overflow → both edges true → no fade; verified in-browser at start / middle / end). One blocker: the `/config` links use a react-router `<Link>` to a server-rendered page, which renders a blank page. Two accessibility minors and one dead-CSS minor are worth fixing in the same pass. Risk: low once the blocker is fixed.

### Checklist verification

- [x] Promote `SquareIconButton` / icons / `Header` into `components/`, rewire master — pass (build + tsc green for both surfaces; `git mv` kept history)
- [x] `useScrollEdges` + `ScrollShadow` added and exported — pass (edge logic verified in-browser)
- [x] Rebuilt `Nav`: hub + name / scrollable menu / search + settings, no bell — pass (renders correctly)
- [x] `styles.css` updated for the scroll strip — pass
- [~] Verification: dashboard header renders and search filters the board — pass; **but the settings gear / Config link land on a blank page** (see Blocker 1)

### Blockers

1. **`/config` links render a blank page** — `packages/taskflow/src/dashboard/client/ui.tsx:102` (`<Link to="/config">Config</Link>`) and `ui.tsx:120` (`<SquareIconButton as={Link} to="/config" …>` — the gear).
   - **Why:** `/config` has no `<Route>` in `App.tsx` (routes are only `/`, `/task/:id`, `/module*`, `/agent*`, `/project*`; no catch-all). It is a **server-rendered** page (`dashboard/server/index.ts` → `getConfigPageHtml`). A react-router `<Link>` does a client-side `pushState`, so it never reaches the server; react-router matches nothing and unmounts `DashboardView` → blank page. **Verified in-browser:** clicking Config changes the URL to `/config` with no reload and leaves `document.body` empty.
   - Note: the Config `<Link>` pre-existed in the old `Nav`, but this change carries it forward **and** adds a second broken link (the gear), so both must be fixed here.
   - **Fix (both spots):** use a full-document anchor built from the base helper, importing `apiUrl` from `./base.js` (it prepends `BASE`, preserving the `/p/<id>/` hub-proxy prefix while doing a real navigation to the server page):
     ```tsx
     <a href={apiUrl("/config")} className="nav-link">Config</a>
     // gear:
     <SquareIconButton as="a" href={apiUrl("/config")} aria-label="Project config">
     ```
   - The `Overview` link at `ui.tsx:99` is correctly a raw `<a href="/overview">` (it intentionally targets the master root, which drops the project prefix); `/config` differs because it must keep the project prefix — hence `apiUrl`, not a bare `href="/config"`.

### Non-blocking

Recommended to fix in this same pass (the implementer is already back in these files; all cheap):

2. **Nav-link contrast below WCAG AA (a11y minor)** — `styles.css:156`. `.nav-link` uses `--text-muted` (`#737373`) at `font-size:13px` on the dark header ≈ 3.2–3.9:1, under the 4.5:1 required for normal text (WCAG 1.4.3). **Fix:** use a lighter muted for the resting nav-link state (e.g. `#a3a3a3`, ~5.6:1) or `var(--text)`.

3. **Focus ring clipped on nav links (a11y minor)** — `ScrollShadow.tsx:11-13` sets `overflow-y:hidden`, which trims the top/bottom of the UA focus outline on a focused link (left/right still show, so focus stays perceivable — not a 2.4.7 failure, but it looks cut off). **Fix:** add an inset ring to the `.nav-link` block in `styles.css`: `.nav-link:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }`.

4. **Dead CSS: `.nav-link.active`** — `styles.css:158`. The new `Nav` uses plain `<Link className="nav-link">` (no `NavLink`), so the active class is never applied. **Fix:** drop the rule — or, better UX, switch the six links to `NavLink` so the current section is highlighted (then keep the rule). Implementer's call.

### Security & edge cases

None. No new input-trust boundary; the search filter is a client-side substring match over already-loaded tasks.

### Notes (accepted as-is / nits)

- **Search scope:** `visibleTasks` filters only the `Kanban`; `Stats` and `Timeline` stay on the full `tasks` set. Defensible (stats = global project metrics; board = filtered view) — a product call, not a bug. `selected` resolves against full `tasks`, so opening a task still works. Fine.
- **Duplicated `"1152px"` literal** in `Header.tsx` `DEFAULT_MAX_WIDTH` vs `layout.ts` `MAX_WIDTH` — small drift risk, but importing `layout.ts` into shared `components/` would invert the dependency direction, so the duplication is the lesser evil. Optional: hoist to a shared token module. Already commented.
- **`ScrollShadow` ceiling:** the `ResizeObserver` observes the strip element only, so it catches container/viewport resizes but misses pure content-width changes (children growing while the strip box stays fixed). Harmless for the static 6 links; worth a one-line comment if reused for a dynamic row later.
- **z-index** dropped 100 → 20 (old `.top-nav` was 100; `Bar` is 20). No regression found — page content has no z-index, and the detail panel (100/101) and settings popover (200) are meant to sit above the header anyway.
- **Redundant destinations** (gear + Config → `/config`; hub + Overview → `/overview`) — harmless once the blocker is fixed.
- **`nav-links` is a `<div>` of links**, not a `<ul>/<li>` — a list would let screen readers announce "1 of 6". Optional.
- StrictMode double-invoke on `useScrollEdges` is safe (cleanup removes the exact captured listener + disconnects the RO); deps `[ref]` are fine (stable ref, strip identity never changes).

## Round 2 — Human pass

**Verdict:** fix-needed (human change requests, in addition to the Round 1 blocker)

### Human feedback (exact words)

> but the menu should be in middle space-between also we need to have menu item active if the page is match the button redorect also active button is green with green bacground and border also we need to have hover state over items same as the active button can you do that?

### Breakdown for the implementer

Apply these on top of the Round 1 items (the `/config` blocker still stands — the human's requests do not replace it). All are in `dashboard/client/ui.tsx` + `styles.css`:

1. **Menu in the middle, `space-between`.** Today the menu bunches at the left of the center slot (`.nav-links { width: max-content }`, `styles.css:155`). The human wants the six items spread across the middle space with `space-between`. Make the menu row fill the center and distribute the items (e.g. `.nav-links { width: 100%; justify-content: space-between; }`), while keeping the `ScrollShadow` overflow-scroll for narrow widths (when the items no longer fit, they should still scroll — the fade behavior must survive).

2. **Active menu item = current route.** Switch the six links from `Link` to `NavLink` (react-router-dom) so the item matching the current page gets the `active` class automatically. `NavLink` is already used in the codebase (`ModulesPage.tsx:4,26`), so follow that pattern. Note `NavLink to="/"` needs `end` so Home is not always active. The `Overview` item stays a raw `<a href="/overview">` (it leaves the SPA); Config becomes the `apiUrl("/config")` anchor from Blocker 1 (not a NavLink) — those two will not show an SPA active state, which is correct since they leave the app.

3. **Active button style = green (green background + green border).** Replace the current blue `.nav-link.active { background: var(--accent); color: #fff }` (`styles.css:158`) with a green look using the theme green (`--green` = `#22c55e`): green (translucent) background + green border + green text. Match the Lovable design reference (`projects.$projectId.tsx` active nav: green bg + green border + green text).

4. **Hover state = same as active.** Make `.nav-link:hover` (`styles.css:157`) match the active green look (green background + border), replacing the current grey `background: var(--border)` hover.

This is human review feedback recorded verbatim. Task stays `fix-needed`; hand back to `/task-fe-implement`.


---

## Round 3 — AI re-review (after fix pass)

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-22
**Verdict:** ai-approved (clean)

### Summary

The fix pass resolved the Round 1 blocker and all four Round 2 human requests. Both AI reviewers (a11y + ui/correctness) came back clean — no blockers, no real minors, only cosmetic nits. Changes stayed confined to `ui.tsx` + `styles.css`. Verified in-browser during the fix pass: `/config` loads real content (no blank), the menu spreads with `space-between` on wide and still scrolls with edge-fade on narrow, the active route shows green, and no app console errors. Ready for the human pass.

### Checklist verification

- [x] Blocker (`/config` blank page) fixed — Config link + gear are now full-document anchors via `apiUrl("/config")`; `/config` loads the server page (verified). No react-router `Link` remains for a server-rendered page; the `Link` import was removed (no dead imports).
- [x] Human #1 — menu `space-between` across the middle; `ScrollShadow` overflow-scroll + fade preserved (mechanism confirmed: `width:100%` + `space-between` still yields `scrollWidth > clientWidth` on overflow).
- [x] Human #2 — active route via `NavLink` (Home `end`; `/project`,`/agent`,`/module` stay active on nested routes; Overview/Config are full anchors with no active state — correct).
- [x] Human #3 — active is green (translucent green bg + green border + `#4ade80` text).
- [x] Human #4 — hover shares the same green rule as active.
- [x] Round 1 a11y minors — resting color `#a3a3a3` (passes AA, ~7:1 by the a11y reviewer's estimate); `.nav-link:focus-visible` inset ring (not clipped by the strip); base transparent border reserves space (no hover layout shift).

### Blockers

None.

### Non-blocking

None required.

### Security & edge cases

None. `apiUrl` prepends `BASE` correctly for both standalone (`""`) and hub-proxy (`/p/<id>`) modes; full-document anchors navigate the href verbatim, so react-router's basename never double-prefixes.

### Notes (nits — optional, no change required)

- **Hover looks identical to active.** A sighted mouse user hovering a non-current item briefly sees the "current page" pill. Not a WCAG issue — `NavLink` sets `aria-current="page"` on the active item (AT can tell them apart) and the active state is a filled/bordered pill, not color-only (passes 1.4.1). Cosmetic only; if it bothers you, differentiate hover slightly.
- **Active green border is ~2.9:1** vs the header bg — just under the 3:1 non-text bar, but not the sole indicator (green fill + green text + `aria-current` reinforce it), so it passes. Optional belt-and-suspenders: bump `.nav-link.active` border to `rgba(34,197,94,0.6)`.
- **Hardcoded colors** (`rgba(34,197,94,…)` = `--green`; `#4ade80`, `#a3a3a3` have no token) — consistent with existing `styles.css` style (the file already hardcodes translucent rgba + non-token hexes). Not worth changing.
- `NavLink` string `className` correctly appends `active` in react-router v6 (also sets `aria-current="page"`), so `.nav-link.active` applies. Rest of `ui.tsx` (Stats/Kanban/Timeline/ShardNav) unchanged — no regression.

## Round 4 — Human pass

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-22
**Verdict:** on hold — likely a stale-build view, not a code gap (awaiting human re-check)

### Human feedback (exact words)

> but the menu should be in middle space-between also we need to have menu item active if the page is match the button redorect also active button is green with green bacground and border also we need to have hover state over items same as the active button can you do that? this is human fix needed!

### Finding

The four requested items are **already implemented and verified in the current build** (Round 3 AI pass, both reviewers clean), and confirmed again in-browser here:

- Menu spread with `space-between` across the middle — ✅ visible on a fresh build.
- Active menu item = current route — ✅ "Project" renders green when on `/project`.
- Active button green (green background + border + text) — ✅.
- Hover state = same green as active — ✅ (shared CSS rule).

The human's screenshot shows the **old** header (menu bunched left, no green). Root cause: the running dashboard is serving a stale bundle. Confirmed: the globally-installed `insight-flow` is **2.11.1**, while these N258 changes live in the repo build (local `2.11.0` dist, dashboard hash `index-DmjnHKWW.js`) and are **not** in the global install. So the human is viewing a pre-fix build.

**Not setting `fix-needed`** (no code change is pending — the request is already satisfied). Surfaced the stale-build discrepancy to the human with a screenshot from the current build (`playground` on a fresh port) and asked them to re-check on the correct build. If they still see a problem after that, this becomes a real `fix-needed` and goes back to the implementer.

## Round 5 — Human pass (clarification → real fix-needed)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-22
**Verdict:** fix-needed

### Human feedback (exact words)

> human fix needed! the space between i dont meant between menu but between project name with button menu and right side

### Interpretation for the implementer (do NOT re-misread)

The human clarified what "space-between" meant. My Round-3 change was wrong: it spread the six menu items apart across the middle (`.nav-links { width:100%; justify-content:space-between }`). **That is not wanted.**

What the human wants:
- **Left group = hub + project name + the menu, grouped together** (menu items keep normal small gaps, sitting next to the project name).
- **Right side = search + gear.**
- The empty **space goes BETWEEN the left group (name + menu) and the right side** — not between the menu items.

Target layout: `[← hub]  [PROJECT / name]  [Home Project Agents Modules Overview Config] ···········space··········· [search] [gear]`

Fix (small, `styles.css` only):
- Revert `.nav-links` from `width:100%; justify-content:space-between` back to a grouped, natural-width row: `.nav-links { display:flex; gap:4px; width:max-content; }` (keep `flex-shrink:0; white-space:nowrap` on `.nav-link` for the scroll/fade).
- With the menu grouped and left-aligned inside the `flex:1` Center slot, it sits next to the project name and the Center pushes the search+gear to the far right — so the space lands between the menu and the right side, exactly as asked.
- If the gap between the project name and the menu looks too wide (the Header `Inner` `gap` is `2xl`), tighten it so the name + menu read as one group.
- **Keep everything else from the fix pass unchanged** — the green active/hover, `NavLink` active-route, the `/config` full anchors, and the focus ring are all correct and approved; only the menu spread is being reverted.

Re-verify in the browser (wide: name+menu grouped left, search+gear far right, space between them; narrow: menu still scrolls with the edge fade). Then mark fixed and hand back to review.


---

## Round 6 — AI re-review (after the layout revert)

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-22
**Verdict:** ai-approved (clean)

### Summary

Tiny, isolated fix: `.nav-links` reverted from `width:100%; justify-content:space-between` back to `display:flex; gap:4px; width:max-content` — one CSS line. This makes the menu a grouped, natural-width row that sits next to the project name, and the Header's `flex:1` center slot pushes search+gear to the far right, so the empty space lands between the (name+menu) group and the right side — exactly the human's Round 5 clarification. Given the trivial, verified scope (and Round 3 already cleared everything else), this was a focused review, not a full fan-out.

### Checklist verification

- [x] Menu layout matches the human's clarified intent — grouped left, space before the right-side actions (verified in-browser on a fresh build; `navLinksGrouped=true`).
- [x] ScrollShadow overflow-scroll + edge fade preserved — `width:max-content` is the original, verified behavior: wide → no fade (`true/true`); forced-narrow → `true/false` at start, `false/true` at end.
- [x] `/project` shows the green active item — unchanged, still works.
- [x] No collateral change — the green `.nav-link:hover/.active`, `NavLink` links, `/config` `apiUrl` anchors, and `.nav-link:focus-visible` ring are all still present; `ui.tsx` untouched this pass; only the `.nav-links` line changed. `tsc` passes.

### Blockers

None.

### Non-blocking

None.

### Security & edge cases

None (layout-only change).

### Notes

- The `styles.css:158` comment was updated to explain the grouped `max-content` row + why the space lands on the right — accurate.
- All Round 3 nits (hover==active cosmetic, active-border ~2.9:1, hardcoded colors) still apply and remain optional; nothing new introduced.
- Reminder for the human: the running dashboard is the global `insight-flow` 2.11.1 (stale) — these changes are in the repo build only until the global binary is reinstalled.

## Round 7 — Human pass (two layout fixes)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-22
**Verdict:** fix-needed

### Human feedback (exact words)

> fix needed! [Image #2] why its wrap we need to have it in one line just the menu should be shorter and shorter with scrollabel menu also [Image #3] this is not in the middle please the wrapper of the menu should be tight around the menu not on 100% of available space

(Image #2 = a narrower width where the header wrapped to two lines: row 1 hub+name+menu, row 2 search+gear. Image #3 = a wide width where the menu is grouped left, next to the project name.)

### Interpretation for the implementer

Two separate issues, both about the header layout. The human is on the current build (the wrap + grouped-left menu only exist in this build).

**Issue A — never wrap; keep one line, menu shrinks + scrolls (Image #2).**
On narrower widths the header wraps the search+gear onto a second line. It must stay on **one line**. Only the **menu** should get shorter and scroll; the hub+name (left) and search+gear (right) keep their size on the same line.
Root cause: the Header `Inner` has `flex-wrap: wrap`, and the menu's `Center` slot is `flex: 1 1 auto` (doesn't shrink), so the actions wrap.

**Issue B — menu in the middle, wrapper tight around the menu (Image #3).**
The menu wrapper currently takes 100% of the available space (the `Center` slot is `flex:1`), so the menu sits stuck on the left next to the name. The human wants the wrapper **tight around the menu** (content width, not 100%) and the menu block **in the middle** (centered, with space on both sides) — not grouped on the left.
Note: this refines Round 5. Round 5 made `.nav-links` `max-content` (tight row) but the `Center` slot stayed `flex:1` (full width), so the menu looked left-stuck. Now make the wrapper itself tight and centered.

### Fix (Header.tsx — gated on the `center` prop so master is unaffected)

1. `Center`: change `flex: 1 1 auto` → **`flex: 0 1 auto`** (tight to content, still shrinkable via the existing `min-width: 0`). With `Inner`'s existing `justify-content: space-between` and three items (Left, Center, Actions), a tight Center is centered between them → menu "in the middle" with space on both sides, wrapper hugging the menu.
2. `Inner`: make `flex-wrap` **`nowrap` when a `center` slot is present** (add a `$hasCenter` prop; keep `wrap` for master's no-center case). This stops the two-line wrap; the menu's `min-width:0` + the ScrollShadow `overflow-x:auto` let it shrink and scroll on one line.
3. Keep `.nav-links { width: max-content }` (already correct — natural-width row; the strip scrolls when the shrunk Center is narrower than the menu).
4. Ensure **only the menu shrinks**: if testing shows Left (hub+name) or Actions (search+gear) shrinking, add `flex-shrink: 0` to `Left` and `Actions`.

**Master is shared** — all changes are gated on `center` (only the dashboard passes it), but still re-verify the master overview + logs header render unchanged.

Verify in the browser (fresh build): (wide) menu tight + centered, space on both sides; (~880px, the human's Image #2 width) everything on **one line**, menu scrolls with the edge fade; (narrow) still one line, menu shorter + scrolls. Keep the green active/hover, NavLink, `/config` anchors, and focus ring. Then mark fixed and hand back to review.


---

## Round 8 — AI re-review (after the header layout fix)

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-22
**Verdict:** ai-approved (clean)

### Summary

Focused `Header.tsx`-only change that addresses both of the human's Round 7 issues: (A) the bar no longer wraps — `Inner` is `nowrap` when a `center` slot is present, so the menu shrinks and scrolls on one line; (B) the menu wrapper is now tight (`Center` `flex: 0 1 auto`) and, via `Inner`'s `space-between`, sits centered between Left and Actions. All changes are correctly gated on the `center` prop, so master is untouched. Verified in-browser. One non-blocking note about extreme-narrow horizontal overflow (an accepted consequence of the requested no-wrap design).

### Checklist verification

- [x] Issue A (no wrap, one line, menu shrinks+scrolls) — `flex-wrap` computes `nowrap`; at forced 880/760/620px the three groups stay on one row and the menu scrolls; fade toggles `true/false` at start, `false/true` at end. Pass.
- [x] Issue B (menu tight + centered) — `Center` `flex:0 1 auto` hugs the menu; `space-between` centers it with space on both sides (verified wide). Pass.
- [x] Master unaffected — **confirmed**: no master `Header` call passes `center` (`master/client/App.tsx:448`, `LogsPage.tsx:371`), so `$hasCenter` is `false` → `Inner` stays `flex-wrap: wrap` and `Center` is not rendered. The only unconditional change is `flex-shrink:0` on `Left`/`Actions`, harmless with `wrap`.
- [x] No collateral change — `styles.css` `.nav-links` unchanged; `ui.tsx` untouched; green active/hover, `NavLink`, `/config` anchors, focus ring intact. `tsc` + build pass for dashboard and master.

### Blockers

None.

### Non-blocking

1. **Extreme-narrow horizontal overflow (accepted consequence).** Because the bar is now `nowrap` and only the menu shrinks (`Left`/`Actions` are `flex-shrink:0`), at very small widths (roughly < 480px) the non-shrinking hub+name + search+gear can exceed the viewport and cause the bar (and page) to scroll horizontally. This is inherent to the human's explicit "one line, only the menu shrinks" request, so it is accepted, not a blocker. Optional hardening if it ever matters on real phones: let the project `Title` truncate (`min-width:0` + `text-overflow:ellipsis`) or allow the search input to shrink below its current `width:220px; max-width:40vw`. Not required now.

### Security & edge cases

None (layout-only change).

### Notes

- Master could not be visually eyeballed (the fresh master could not bind — the user's stale 2.11.1 instance holds the global `~/.insight-flow/master.lock` on :6100). Safety is established by construction (gating on `center`, verified above) plus the passing master build/tsc. Worth a quick visual confirmation whenever a fresh master can run.
- All prior-round nits (hover==active cosmetic, active-border ~2.9:1, hardcoded colors, `nav-links` as `<div>` vs `<ul>`) still apply and remain optional; nothing new introduced.

## Round 9 — Human pass (Hub button size)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-22
**Verdict:** fix-needed

### Human feedback (exact words)

> please look at the Hub button think it should be bigger and text should be bigger as well

### Interpretation for the implementer

Make the `hub` button (the `HubLink` styled anchor in `dashboard/client/ui.tsx:38`) **bigger**, and its **text bigger** too. Small styling change, `ui.tsx` `HubLink` only.

Current: `height: 36px`, `padding: 0 12px`, `font-size: theme.font.size.sm`, arrow `ArrowLeftIcon size={14}`.

Suggested bump (implementer can tune by eye):
- `height: 36px → 44px` (matches the search input / gear button height, so the whole right/left of the bar lines up).
- `padding: 0 12px → 0 16px`.
- `font-size: theme.font.size.sm → theme.font.size.md` (bigger text).
- arrow `ArrowLeftIcon size={14} → 16` (or 18) so the icon matches the bigger text.

Keep everything else unchanged. Verify in the browser that the hub button is visibly bigger with bigger text and still lines up in the header.


---

## Round 10 — AI re-review (after the hub-button size bump)

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-22
**Verdict:** ai-approved (clean)

### Summary

Trivial styling change to the `HubLink` styled anchor (`ui.tsx`): `height` 36→44px, `padding` 0 12px→0 16px, `gap` 6→8px, `font-size` `sm`→`md`, and the arrow `ArrowLeftIcon size` 14→16. Nothing else touched. Addresses the human's Round 9 request ("bigger hub button, bigger text"). Verified in-browser.

### Checklist verification

- [x] Hub button bigger + text bigger — `height:44px`, `font-size: md`, `size={16}` arrow (confirmed in source and in-browser). Pass.
- [x] Scope — only the `HubLink` styled block + that one `ArrowLeftIcon size` changed; menu, green states, `Header`, and master untouched. Build passes.
- [x] No regression — the hub button now matches the 44px height of the search input + gear, so the bar lines up; menu stays centered on one line; `/project` still green.

### Blockers

None.

### Non-blocking

None.

### Security & edge cases

None (styling-only).

### Notes

- Accessibility improved slightly: the larger `HubLink` is now a 44×~90px target (meets the 44px min touch-target guidance). It's a real `<a>` with `aria-label="Back to hub"`; text color/contrast unchanged; it sits in `Left` (outside the ScrollShadow strip), so no focus-ring clipping concern. The decorative arrow stays `aria-hidden` via the shared `Svg`.
- All prior-round optional nits still stand; nothing new introduced.

## Round 11 — Human pass (hub button — repeated)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-22
**Verdict:** fix-needed

### Human feedback (exact words)

> please look at the Hub button think it should be bigger and text should be bigger as well THIS IS HUMAN FIX NEEDED!

### Finding + interpretation

The request is **word-for-word identical** to Round 9, which was already implemented (Round 10 verified: `HubLink` height 36→44px, font `sm`→`md`, arrow 14→16, verified in-browser bigger). Two possibilities:

1. **Most likely — stale build:** the human's own dashboard is the global `insight-flow` **2.11.1** install, which contains **none** of the N258 changes (this is uncommitted repo work). So their view still shows the original small hub button. The verbatim repeat matches "nothing changed in my view". This has recurred all session. **Real fix = get the human onto the repo build (reinstall the global binary, or view the fresh URL).**
2. **Or — still not big enough:** if the human did see the 44px version and wants it larger.

### Action for the implementer

Cover both cases:
- Make the hub button **clearly bigger** again (bigger than the current 44px): e.g. `height: 44→48px`, `padding: 0 16→0 18px`, `font-size: md→lg`, `gap: 8→10px`, arrow `size 16→18`. `ui.tsx` `HubLink` + that arrow only.
- Verify on a fresh repo build and capture a screenshot as proof.
- **Flag the stale-build issue prominently to the human** and offer to reinstall the global `insight-flow` binary from the repo build (with consent) so their normal dashboard shows all the N258 work — otherwise this loop will not converge.

Keep everything else unchanged. Then mark fixed and hand back to review.


---

## Round 12 — AI re-review ("all fixes" pass)

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-23
**Verdict:** ai-approved (clean)

### Summary

Two small styling changes: (1) `HubLink` bigger again — `height` 44→48px, `padding` 0 16→0 18px, `gap` 8→10px, `font-size` `md`→`lg`, arrow `size` 16→18; (2) `.nav-link:hover/.active` `border-color` `rgba(34,197,94,0.5)`→`0.6` (the optional active-border contrast hardening). Hover is deliberately kept identical to active (the human explicitly asked for that in Round 2). Verified in-browser. Also: the global `insight-flow` binary was reinstalled from this repo (user consented) so the running dashboard shows the work after a restart.

### Checklist verification

- [x] Hub button bigger — `height:48px`, `font-size: lg`, arrow `18` (confirmed in source + in-browser). Pass.
- [x] Active border contrast bump — `0.5`→`0.6` (`styles.css:163`). Pass.
- [x] Scope — only `ui.tsx` `HubLink` + the one `.nav-link` border value changed; menu layout, `NavLink`, `/config` anchors, green fill/text, `Header`, and master untouched. Build passes.
- [x] No regression — menu still centered on one line; `/project` green; hub button aligns (vertically centered) though now 4px taller than the 44px search/gear.

### Blockers

None.

### Non-blocking

None.

### Security & edge cases

None (styling-only).

### Notes

- The 48px hub button is now 4px taller than the search input + gear (44px). It's vertically centered so it reads fine; if pixel-perfect height parity is wanted later, either bump search/gear to 48px or keep hub at 44px — the human explicitly wanted the hub bigger, so 48px stands.
- Hover == active is intentional (Round 2 human request), so the earlier "hover looks like active" nit is by-design, not a defect.
- All other prior-round optional nits still stand; nothing new introduced.

## Round 13 — Human pass (approved)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-23
**Verdict:** approved

### Human decision (exact words)

> HUMAN APPROVED!

N258 is approved by the human → moves to `done`.
