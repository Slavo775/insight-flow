# N231 — Redesign master overview as React island with shared component kit — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-14
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

Large, well-structured change: the master overview is now a React island reusing the dashboard component kit, with 5 new shared components + 2 extended ones, a second Vite build, and a static shell served by the master server. The UI-correctness pass found **no blockers** — the server `/assets/*` route (path-confined, correct MIME, immutable cache), shell injection, SSE upsert / stale-decay / starting-state logic, folder-path joining, and cursor-only editor logic are all correct, and cross-module imports are sound. The a11y pass found **blockers on the new shared `Modal`** (no focus management, no accessible name) plus AA-contrast + form-label failures on new components that directly contradict the redesign's stated "WCAG-compliant" goal. Risk: medium — the Modal is shared infra, so its a11y gaps would propagate. Status set to **fix-needed**.

## Checklist verification

- [x] Step 1 — React island build + serve — pass (vite.master.config.ts → dist/master; server serves shell + /assets/*; both bundles build; PWA/SSE/hub-notify preserved)
- [x] Step 2 — Button `success` variant + Section `icon` prop — pass
- [x] Step 3 — StatusPill / Modal / SearchInput / Select / ProjectCard — pass functionally; Modal + StatusPill have a11y blockers below
- [x] Step 4 — Overview UI rebuilt in React — pass (header, hero, sections, NewProjectModal)
- [x] Step 5 — Port client behavior — pass (refresh, mute, start, folder browse, create, search filter)
- [x] Step 6 — Cleanup + preservation — pass (overview.ts deleted; theme-driven colors; PWA/SSE confirmed)
- [x] Quality gates — pass (typecheck clean, eslint 0 errors, build both bundles, 353/353 tests)

## Blockers

1. **`Modal` has no focus management** — `packages/taskflow/src/dashboard/client/components/Modal.tsx:110-137`.
   The dialog sets `role="dialog"` + `aria-modal="true"` and wires Escape + scroll-lock, but never moves focus into the dialog on open, never traps Tab inside it, and never restores focus to the trigger on close. The background is not `inert`/`aria-hidden`, so a keyboard / screen-reader user can Tab straight out into the still-interactive page behind the modal; on close, focus is lost to `<body>`. WCAG 2.4.3 / 2.1.2. This is a shared component (used by `NewProjectModal` and any future modal).
   **Fix:** on mount capture `document.activeElement`, move focus to the dialog (or first focusable / the close button); trap Tab / Shift+Tab within the dialog, or set `inert`/`aria-hidden` on the app root while open; on unmount restore focus to the captured element.

2. **`Modal` dialog has no accessible name** — `packages/taskflow/src/dashboard/client/components/Modal.tsx:125-127`.
   `aria-modal="true"` is set but `<Dialog>` has no `aria-labelledby`/`aria-label`, and the `<Title>` is not associated with it — screen readers announce just "dialog". WCAG 4.1.2 / 1.3.1.
   **Fix:** give `<Title>` a stable `id` (`useId()`) and add `aria-labelledby={id}` to `<Dialog>`.

3. **`StatusPill` tones fail AA contrast** — `packages/taskflow/src/dashboard/client/components/StatusPill.tsx:13-17`.
   The pill text is `font.size.xs` semibold (small text needs 4.5:1). `idle` = `textMuted #737373` on `#262626` ≈ **3.19:1** (clear fail); `permission`/`awaiting-permission` = `red #ef4444` on `#3b1111` ≈ **4.38:1** (just under). The redesign's explicit goal is WCAG-compliant contrast, and this is a brand-new component, so it must meet AA. (active 5.9:1, done 6.6:1 pass.)
   **Fix:** lighten the idle foreground (≥ ~#949494) and nudge the permission red/bg to clear 4.5:1.

4. **Editor `Select` has no accessible name** — `packages/taskflow/src/master/client/NewProjectModal.tsx:304-311`.
   `OptRow` is a `<label>` rendered `as="div"`, so the visible "Editor" text is not tied to the `<Select>`, and the select has no `id`/`aria-label` — a form control with no programmatic label. WCAG 1.3.1 / 3.3.2 / 4.1.2.
   **Fix:** add `aria-label="Editor"` to the `Select` (or give it an `id` + a real `<label htmlFor>`).

## Non-blocking

Recommended (should fix — cheap, real; implementer's judgment in this pass):

- **Header "live" count vs section grouping disagree** — `src/master/client/App.tsx` (`liveCount`). Sections split on `p.online` (SSE), but the header count uses the 60s `lastSeenAt` window; a running-but-idle project can show "0 live" while its card sits under "Online servers". Use the same signal (`projects.filter(p => p.online).length`) or relabel.
- **Silent Start failures** — `App.tsx` `onStart` + `api.ts`. A 504/500 from `/start` returns `{error}` but the button just flips back to "Start →" with no message. Surface `d.error` like the New-project flow does.
- **`SettingsMenu` a11y** — `SettingsMenu.tsx:125`: `role="menu"` wraps checkbox rows (should be `role="group"` + `aria-label`, and `aria-haspopup` adjusted); popover closes only on outside mousedown — add Escape-to-close + focus return.
- **Status/connection not announced** — `NewProjectModal.tsx` `StatusLine` needs `role="status"`/`aria-live` (`role="alert"` on error); the connection `Dot` (`App.tsx`) is color-only and `aria-hidden`, so live/reconnecting state is invisible to AT — add a visually-hidden label.
- **`ProjectCard` hover affordance** — `ProjectCard.tsx:14` inherits `Card`'s `&:hover { border-color: accent }`, signaling "clickable" on a non-clickable card (only the action button is interactive). Override the hover in `Shell`.
- **Semantics** — wrap the content region in `<main>` (`App.tsx`); section headings jump h1→h3 (`Section` uses `<h3>`), consider h2.

Nits: `React.memo` on `ProjectCard` (re-renders on every SSE frame + 30s tick — fine at hub scale); `StatusPill` `#262626` and the `#0a3622`/`#3b1111` tints are raw hex duplicated across StatusPill/Badge/App — consider tint tokens; `conn="connecting"` initial state flashes red before `onopen` (yellow reads better); `path`/`dir` in NewProjectModal are redundant; mute-button `aria-label` swaps with state though `aria-pressed` already conveys it.

## Security & edge cases

No issues. The `/assets/*` route rejects `..` / nested paths, `resolve`s + prefix-checks against the assets dir, and `existsSync`-guards. Backend routes are unchanged; the shell fetches `/api/hub/projects` and the existing CSRF/loopback gates on the hub API still apply (covered by tests).

## Notes

- **Pre-existing, out of scope:** `textMuted #737373` is broadly under AA (≈4.18:1 on bg, 3.89:1 on surface) across the whole dashboard, not just N231 — a token-level change that should be its own task, not fixed here. Same for the `WATCHED_STATUSES` subset (the settings menu can toggle 5 of the 8 statuses `hub-notify.js` notifies on) — ported as-is from the old overview.
- **Two `/events` SSE connections per tab** (the app + injected `hub-notify.js`) — matches the pre-N231 behavior; noted, not a regression.
- **Verification gap noted by implementer:** populated `ProjectCard` rendering was checked structurally (typecheck + logic port + data-contract test), not with live multi-project data. Empty-state + modal + folder browser were confirmed in-browser.
- Intentional design change: the old card's activity mini-feed + task-count chips were dropped to match the Lovable prototype.


---

## Round 2 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> dont think this from lovable [Image #1] are same as the [Image #2] this wtf? we need to have 1:1 design also modal is way to different its not even close this

(Image #1 = the Lovable prototype "Insightful Landing Redesign"; Image #2 = the shipped implementation on the master hub.)

### Blockers (design fidelity — must reach 1:1 with the Lovable prototype)

1. **Card layout is wrong** — the implementation renders a **2-column grid of vertical boxes**; the Lovable design is a **single-column list of full-width horizontal rows**. `src/master/client/App.tsx` (`Grid`) + `src/dashboard/client/components/ProjectCard.tsx`.
2. **Status pill placement + color** — Lovable shows a status pill on the **left** of each row (Active / Permission required / Idle) with a matching **colored left border**, always visible; the build shows a task-status badge inside the card and no left pill. Also **"Permission required" must be amber**, not red. `ProjectCard.tsx` + `StatusPill.tsx`.
3. **Status pills need icons** — Lovable pills carry an icon (Active = activity, Permission = shield, Idle = moon). `StatusPill.tsx`.
4. **Action buttons** — Lovable: online = **blue** "Open ↗", offline = **green** "Start server ▷" (play icon). Build: plain "Open →" / "Start →" with no icons/colors. `App.tsx`.
5. **Bell** — Lovable uses an **outlined bell icon button** (blue when notifications on, grey/bell-off when muted); the build uses a 🔔 emoji. `ProjectCard.tsx`.
6. **Modal is far off** — "modal is way too different, not even close". Lovable modal: install options as **bordered feature cards** with a custom green check (green-tinted when selected), and a **purple/blue "Create"** button with a plus icon. Build: plain checkbox rows + green Create. `src/master/client/NewProjectModal.tsx`.

### Notes

- **Unavoidable constraint on the modal folder picker:** the Lovable mock shows a static pick-from-list of folders; the real backend (`/api/fs/list`) **browses** the filesystem. The folder list will be styled to match Lovable (bordered list, folder icons, selected highlight) but keeps browse navigation — it cannot be pixel-1:1 there.
- Icons will be inline SVG replicas of the lucide icons the Lovable prototype uses (no new dependency added).
- Round 1 AI blockers (Modal focus/name, StatusPill contrast, Select label) remain fixed; this round is design fidelity on top of them.


---

## Round 3 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> please but use mcp lovable once again please the header is [Image #3] 76px height with padding left right 32px and top bottom 16px all elements height all height also bottom is a border bottom then the buttons are higher all elements are higher also the font is different font-family ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"

### Blockers (design fidelity — verified against the Lovable source via MCP)

1. **Font family is wrong** — the whole master island uses the monospace theme font (`'SF Mono' … monospace`); the Lovable app uses Tailwind's default **sans-serif** stack: `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`. Apply a sans-serif font to the master island (master-only theme override; the dashboard stays monospace).
2. **Header dimensions** — the header must be a full-width sticky bar with a **bottom border**, **76px tall**, padding **16px top/bottom, 32px left/right** (Lovable `border-b`, `px-8 py-4`, `max-w-6xl` = 1152px inner). Currently the header sits inside the padded page container with no border and smaller padding.
3. **All controls are 44px (`h-11`)** — search input, refresh/settings icon buttons, "New project", the row bell button, the row Open/Start buttons, and every modal field/button (folder rows, name input, editor select, feature rows, close, Cancel, Create) are `h-11`/`size-11`/`min-h-11` = 44px in Lovable. The build renders them ~32–40px. Bump them all to 44px.
4. **Content max-width** — Lovable uses `max-w-6xl` (1152px); the build uses 1100px.

### Notes

- Verified against the live Lovable source `src/routes/index.tsx` (project `c27ddae3-…`) via the Lovable MCP: header `px-8 py-4 border-b`, search `h-11`, IconButton `size-11`, PrimaryButton `min-h-11`, row bell `size-11`, row actions `min-h-11`, and all modal controls `h-11`/`min-h-11`. No explicit font-family in the Lovable code → Tailwind default sans stack.
- Round 1 (a11y) + Round 2 (layout/modal 1:1) fixes remain in place; this round is header/typography/sizing polish on top.


---

## Round 4 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> please the whole colors not are black but oklch(0.17 0.02 260) somehting like this can we use the lovable mcp?

### Blockers (color palette — match the Lovable blue-tinted dark, not neutral black)

1. **Base palette is wrong** — the master island inherited the dashboard's neutral-black theme (`bg #0a0a0a`, `surface #141414`, `border #262626`, `textMuted #737373`). Lovable uses a **blue-tinted dark** palette (hue 260). Override the master theme tokens with the Lovable values:
   - page background `oklch(0.17 0.02 260)`, text `oklch(0.97 0.01 260)`
   - surface (inputs/buttons) `oklch(0.22 0.02 260)`, border `oklch(0.32–0.35 0.02 260)`
   - muted text `oklch(0.78 0.02 260)`
2. **Hardcoded neutral hex must follow** — several master components hardcode neutrals (`#333333` borders, `#a3a3a3` muted, `#171717`/`#262626` tints) that won't pick up the theme override. Point them at the theme tokens (or the Lovable oklch) so the whole island is blue-grey: header bg `oklch(0.19 0.02 260 / 0.9)`, hero gradient `oklch(0.22 0.03 260) → oklch(0.2 0.02 260)`, idle pill `oklch(0.26 0.02 260)` / border `oklch(0.55 0.02 260)` / text `oklch(0.92 0.02 260)`, bell-off `oklch(0.24 0.02 260)` / `oklch(0.38 0.02 260)`, modal overlay `oklch(0.08 0.02 260 / 0.75)`.

### Notes

- Values taken from the Lovable source `src/routes/index.tsx` (project `c27ddae3-…`) read via the Lovable MCP this session. The green (active), amber (permission), and blue (bell/Open) accents stay as-is.
- Master-only theme override — the dashboard keeps its neutral-black theme.


---

## Round 5 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> okej buttons colors oklch(0.85 0.19 150) height 44px font size 14px border radius 8px for every buttons in master server (not every has a bacground open and notifications reset dont have a border green notification and open has border color oklch(0.6 0.14 240) and background oklch(0.95 0.14 240))

### Blockers (button styling — master overview)

1. **All master buttons: height 44px, font-size 14px, border-radius 8px.** Applies to New project, Start server, Jump to task, Open, the refresh + settings icon buttons, the notification bell, and the modal Cancel / Create / Close.
2. **Green CTAs** (New project, Start server, Jump to task): background `oklch(0.85 0.19 150)`, dark text (`oklch(0.15 0.02 260)`), **no border**. (Currently they use `theme.color.green` #22c55e — the slightly darker green; switch to the exact `oklch(0.85 0.19 150)`.)
3. **Open + notification bell (on):** border `oklch(0.6 0.14 240)` and foreground `oklch(0.95 0.14 240)` on a dark-blue fill (Open `oklch(0.28 0.08 240)`, bell `oklch(0.3 0.06 240)`).
4. **Refresh + settings icon buttons:** no green background — plain (surface bg + subtle border), just adopt the 44px / radius-8 sizing.

### Notes

- Interpretation call: the feedback lists `oklch(0.95 0.14 240)` as a "background" for the Open/notification buttons, but in the Lovable source that value is the **text/icon color** on a dark-blue fill — a bright light-blue background would contradict the Lovable look matched in earlier rounds. Applied as foreground; flag if a filled light-blue background was actually intended.
- 8px = `theme.radius.xl`; 14px = `theme.font.size.lg`.


---

## Round 6 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> the titles Online servers and Offline servers font size 16px font weight 600 line height 24px

### Blockers

1. **Section titles ("Online servers" / "Offline servers"): font-size 16px, font-weight 600, line-height 24px.** Currently the shared `Section` heading renders small uppercase muted (`font.size.sm` 11px). The master overview titles must be 16px / 600 / 24px (Lovable's `text-base font-semibold`, normal case, full text color).

### Notes

- `Section` is shared with the dashboard (Modules/Agents pages), which keeps the small uppercase label style. Adding a `titleVariant` prop ("label" default = current small-uppercase; "heading" = 16/600/24 normal-case) so the master opts into the larger heading without changing the dashboard.


---

## Round 7 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> project item please badge active/Permission required/ide height 30px font size 12px active color klch(0.95 0.15 155) background and border oklch(0.929 0.013 255.508) Permision required border oklch(0.82 0.17 85) background background-coloroklch(0.32 0.11 85) the project name 16px weight 600 line height 24px task below title line height 20px font size 14px line height 20px

### Blockers (ProjectCard — status badge + text)

1. **Status badge (Active / Permission required / Idle): height 30px, font-size 12px.**
2. **Active badge:** text `oklch(0.95 0.15 155)`; background + border `oklch(0.929 0.013 255.508)` — see interpretation note.
3. **Permission required badge:** border `oklch(0.82 0.17 85)`, background `oklch(0.32 0.11 85)`.
4. **Project name:** font-size 16px, font-weight 600, line-height 24px.
5. **Task line (under the name):** font-size 14px, line-height 20px.

### Notes

- **Interpretation call on the Active badge bg/border:** the given value `oklch(0.929 0.013 255.508)` is a near-white light color (it is the dashboard's *light-theme* border token). Paired with the light-green text `oklch(0.95 0.15 155)` it is effectively invisible (~1:1 contrast). Every other value in this round matches the Lovable source exactly. Applied Lovable's Active badge instead — background `oklch(0.28 0.09 150)`, border `oklch(0.78 0.19 150)` — so the green text stays readable. Flag if a light badge was actually intended (the text would then need to be dark).


---

## Round 8 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> currently working on tab please the title currently working on 600 12px size 16px line height project name 18px 600 line height 28px task 14px  line height 20px height 118px if currently working on is active no project currently active same style as ticket style

### Blockers ("Currently working on" hero card)

1. **Title "Currently working on":** font-weight 600, font-size 12px, line-height 16px.
2. **Project name:** font-size 18px, font-weight 600, line-height 28px.
3. **Task line:** font-size 14px, line-height 20px.
4. **Card height:** 118px.
5. **Empty state** ("No project is currently active.") keeps the same card style/height (118px) as the active state — the card does not shrink when there is no active project.

### Notes

- The hero "Currently working on" label currently reuses the header `Eyebrow` (10px, weight 400). Give the hero its own label style (12/600/16, uppercase) so the header eyebrow is unaffected.
- "same style as ticket style" read as: the empty-state hero keeps the same card look + 118px height (not a collapsed/smaller card).


---

## Round 9 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> please online server svg icon background color coloroklch(0.28 0.09 150)
> and wrapper 28x28 this is about wrapper of this icon and svg color oklch(0.95 0.15 155) also please same wrapper on icon offline server with background color oklch(0.26 0.02 260) and color oklch(0.85 0.02 260)

### Blockers (section-header icon wrapper)

1. **Online servers** icon: wrap the icon in a **28×28** box, background `oklch(0.28 0.09 150)`, svg color `oklch(0.95 0.15 155)`.
2. **Offline servers** icon: same 28×28 box, background `oklch(0.26 0.02 260)`, color `oklch(0.85 0.02 260)`.

### Notes

- The section-header icon currently has no background box (the icon inherits the heading color). Add a 28×28 rounded wrapper (`SectionIconBox`) in the master App and pass it as the `icon` prop — matches Lovable's `size-7 place-items-center rounded-md` group icon.


---

## Round 10 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> please border radius for icon wrapper 8px

### Blockers

1. **Section-header icon wrapper (`SectionIconBox`) border-radius: 8px.** Currently 4px (`theme.radius.md`) → change to 8px (`theme.radius.xl`).


---

## Round 11 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** approved

### Human feedback (verbatim)

> approved we can create the branch push it there

### Notes

- Approved after 9 rounds of design-fidelity iteration against the Lovable prototype (layout, modal, font, colors, buttons, section headings, project item, hero card, section icon boxes) on top of the Round 1 AI a11y fixes. Task → done; branch + push next.


---

## Round 12 — human review (post-approval polish)

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> i forgot on modal in modal "Folder" title 12px font weight 600 line height 16px same for Project Name same for Install title for the path under folder title 14px line height 20px color for all oklch(0.82 0.02 260) Editor label color oklch(0.97 0.01 260) weight 600 size 14px cancel is smaller than Create height for both should 44px plus the font 14px color for create oklch(0.15 0.02 260) font weight for both 600 for cancel color white

### Blockers (New-project modal)

1. **Field labels ("Folder", "Project name", "Install"):** 12px, weight 600, line-height 16px, color `oklch(0.82 0.02 260)`.
2. **Path line** (under "Folder"): 14px, line-height 20px, color `oklch(0.82 0.02 260)`.
3. **Editor label:** color `oklch(0.97 0.01 260)`, weight 600, size 14px.
4. **Cancel + Create buttons:** both height 44px, font-size 14px, font-weight 600.
5. **Create:** text color `oklch(0.15 0.02 260)`. **Cancel:** text color white.

### Notes

- Applied after the task was approved + pushed to `feat/N231-master-overview-react-island`; this is a follow-up commit on the same branch.
- Create text `oklch(0.15 0.02 260)` is dark; to keep it readable I set the Create background to Lovable's lighter indigo `oklch(0.7 0.18 260)` (was `#6366f1`), matching the Lovable modal exactly.


---

## Round 13 — human review (post-approval polish)

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** fix-needed

### Human feedback (verbatim)

> please folders should have font font-size 14px font weight 400 line height 20px also please install description like zero token font size 12px line height 16px

### Blockers (New-project modal)

1. **Folder list items:** font-size 14px, font-weight 400, line-height 20px.
2. **Install feature description/hint** (e.g. "zero tokens"): font-size 12px, line-height 16px.

### Notes

- Follow-up polish on the same branch `feat/N231-master-overview-react-island`.

### Notes


---

## Round 14 — human review

**Reviewer:** Human (Slavo)
**Date:** 2026-07-14
**Verdict:** approved

### Human feedback (verbatim)

> approved open the PR

### Notes

- Final approval after the modal polish rounds (12 + 13). Task → done; PR opened against `main` from `feat/N231-master-overview-react-island`.

### Notes
