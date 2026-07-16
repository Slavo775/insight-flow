# N245 — hub-notify.js injected into HTML comment, never executes

**Type:** fix
**Priority:** high
**Created:** 2026-07-16

## Problem

The hub notification client (`/hub-notify.js`) is injected into the master
overview shell with `html.replace("</body>", …)`. `String.replace` targets the
**first** `</body>`, and the shell's own comment on line 18 of
`master/client/index.html` literally contains `</body>` ("… before `</body>`
…"). So the `<script>` tag is buried inside that comment and never executes —
which is why hub browser notifications + sounds never fire. Confirmed live:
manually loading the script made notifications work.

## Goal

1. `/hub-notify.js` executes on the master overview page (script tag lands
   before the real closing `</body>`, not inside a comment).
2. The same injection on proxied project pages (`/p/<id>/*`) is equally robust.
3. A stray `</body>` in page content or a comment can never hijack the
   injection again.

## Scope

### In scope

- `packages/taskflow/src/master/client/index.html` — reword the line-18 comment
  so it holds no literal `</body>`.
- `packages/taskflow/src/master/server.ts` — inject before the **last**
  `</body>` at both sites (`getOverviewShell` ~L195, proxied-page rewrite ~L675).

### Out of scope

- The notification logic itself (`hub-notify.js`), the service worker, the
  deterministic status engine — all already fixed in prior tasks.

## Implementation plan

1. **Comment** — change `index.html:18` to describe the injection without the
   literal `</body>` (e.g. "before the closing body tag").
2. **Helper** — add `injectBeforeBodyClose(html, snippet)` in `server.ts` using
   `lastIndexOf("</body>")` (append if absent).
3. **Site 1** — `getOverviewShell`: use the helper (keep the `!includes` guard).
4. **Site 2** — proxied-page rewrite: use the helper for `hubLink + notifyTag`.
5. **Invalidate cache** — the overview shell is cached; a rebuild produces the
   corrected shell, so no runtime cache-bust needed.

## Verification

- `pnpm build` succeeds.
- Built `dist` master shell: the `<script src="/hub-notify.js">` tag appears
  immediately before the final `</body>`, not inside the comment.
- Live smoke: open the hub, trigger an agent `done` — the browser notification
  fires without manually loading the script.

## Notes

- 2.8.2 patch. Root cause diagnosed + saved to memory
  (`hub-notify-injected-into-comment`). Separate from the 2.9.0 log engine
  (N242–N244, PR #159); renumbered to N245 to avoid an ID collision on merge.
