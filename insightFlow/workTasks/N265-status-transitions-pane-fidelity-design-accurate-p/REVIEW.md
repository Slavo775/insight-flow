# N265 — Status Transitions pane fidelity — design-accurate pills, ring markers, actor bullet — Review

**Reviewer:** custom:task-fe-review (ai)
**Date:** 2026-07-28
**PR:** (no PR yet)
**Verdict:** ai-approved

## Round 1 — AI pass

### Summary

Clean, well-scoped design-fidelity rework. The Lifecycle pane now matches the Lovable design (bordered/translucent/dotted UPPERCASE pills, ring rail markers with an inner dot + Current glow, ○ actor bullet). All changes are Lifecycle-scoped — the base `.act-stream*` / `.act-stream-dot` (Agent Activity) and the shared `Badge` (Kanban / DetailPanel) are untouched, verified in-browser (Agent Activity: 50 `.act-stream-dot`, no `.lifecycle-*` leaked, "Live stream" intact). `LifecyclePill` resolves color + label flow-aware (`statusColor`/`statusLabel`), same as before. tsc + build + eslint pass; tests **374/374**; no app console errors. No blockers. One non-blocking a11y note (pill-text contrast) that is the design the human explicitly approved.

### Checklist verification

- [x] `LifecyclePill` (bordered + translucent + inner dot + UPPERCASE); `statusLabel` re-imported — pass
- [x] From/to pills use `LifecyclePill` (→ arrow kept; single pill when no `from`) — pass
- [x] Ring marker `.lifecycle-dot` (ring + inner dot via `--c`); newest row glows (`data-current`) — pass
- [x] Hollow ○ bullet before the actor line (`.lifecycle .act-stream-target::before`) — pass
- [x] Agent Activity (N262) UNCHANGED; shared `Badge` untouched (Kanban/DetailPanel) — pass (verified)
- [x] tsc + build + eslint; tests 374/374 — pass

### Blockers

None.

### Non-blocking

1. **Pill-text contrast for red / purple / muted (a11y — accepted design choice).** `LifecyclePill` renders the label in the status `color` over `rgba(color,0.18)`. At 12px bold (small text, AA 4.5:1): green/amber/cyan pass; **red `#ef4444` ≈4.05, purple `#a855f7` ≈3.82, muted ≈3.23 fail** (same computation as N262's pills, slightly better here at 12px vs 10px). This is the colored design the human explicitly asked to match (Image #7), and the status is **not** color-only (border + inner dot + the spelled-out label), so WCAG 1.4.1 (use of color) is fine — only 1.4.3 (contrast) is borderline for those three hues. **Left as-is per the design.** If AA is wanted later without losing the look: brighten the pill text (lighter tint of the hue) or lower the fill alpha for the dark hues.
2. **Stale comment** at `styles.css:66` — "the from→to pills grow via Badge size=\"md\"" is now inaccurate (pills are `LifecyclePill`, not `Badge size="md"`). Cosmetic; update or drop when convenient.
3. **`Badge` `size` prop now unused in `ui.tsx`** (the Lifecycle pills moved to `LifecyclePill`). Harmless — the prop stays on the shared `Badge` (backward-compatible, default `sm`); no caller broken. Leave it.

### Security & edge cases

None (presentational). First-entry rows (no `from`) render a single pill, no arrow — correct.

### Notes

- Scoping verified: `.lifecycle-pill` / `.lifecycle-pill-dot` / `.lifecycle-dot` / `.lifecycle-dot[data-current]` / `.lifecycle .act-stream-target::before` — all Lifecycle-only; base `.act-stream-dot` (line 54) unchanged and still used by Agent Activity.
- `--c` custom property + the `CSSProperties` cast is the standard styled/inline pattern; `color-mix(in srgb, …)` for the glow is supported in current evergreen browsers and degrades gracefully (no glow) where unsupported — acceptable for a decorative emphasis.
- Decorative elements (`.lifecycle-dot`, `.lifecycle-pill-dot`, the `→` arrow, the `::before` bullet) are `aria-hidden` / non-text, so no AT noise; pill labels are real text.
- **Release-safe for 2.12.0:** ui.tsx + styles.css only; tests green (incl. the provider-dashboard CSS grep test). Once N265 lands on `main`, the paused N264 / 2.12.0 release resumes (re-check → ship).
- **Context:** N265 stacks on the merged facelift (N258–N263, PR #171).
## Round 2 — Human pass (approved)

**Reviewer:** custom:task-fe-review (human, recorded)
**Date:** 2026-07-28
**Verdict:** approved

### Human decision (exact words)

> APPROVED create branch commit push merge into master please

N265 approved by the human → `done`. Human directed: branch + commit + push + merge to main (folds into the pending 2.12.0 release).
