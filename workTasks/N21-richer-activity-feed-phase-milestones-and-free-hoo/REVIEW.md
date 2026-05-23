# N21 — Richer activity feed — phase milestones and free hook enrichment — Review

## Human Review — Round 1

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Blockers

1. **Overview card activity section has wrong visual treatment** — `packages/insight-flow-master/src/overview.ts` → `renderActivityMini` / `renderCard`

   The activity mini-feed renders as a bare `<div class="proj-activity-feed">` below the count chips with no wrapping box. In the screenshot it shows as a single muted plain-text line ("use rtk git push -u origin HEAD") with no visual hierarchy — does not match the dark `proj-task` wrapper that the current-task section uses.

   **Human said:** "please activity show as active task same wrapper and use all data what you have for this"

   **Fix:** Wrap the activity mini-feed in the same `proj-task`-style dark box used for the current task. Inside it, render all available fields from the activity event — tool, action, label, message, skill — not a single truncated string. Use the badge classes already defined (`proj-activity-badge-phase`, etc.) to show the event type and full data clearly.

### Suggestions (non-blocking)

- Consider showing the active/idle badge inside the activity wrapper box (co-located with the feed) rather than in the card header, so the visual connection between "last activity" and "idle/active state" is obvious.

### Notes

- Only the overview card activity rendering is flagged in this round. The rest of the N21 implementation (aside panel, timestamps, log-activity command, enrichment hooks, PHASE MARKERS in role files, master endpoint) was not reviewed from this screenshot.
