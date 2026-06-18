# ANALYSIS — deferred-bucket follow-ups (N153–N156)

_Pre-taskmaster strategy record. Second pass of the N99→N150 REVIEW.md mining: turn the remaining deferred buckets into tasks. The mining pass itself is recorded in `N151-…/ANALYSIS.md`; this captures the decision to spawn these four._

## Problem framing

The first mining pass (N151/N152) addressed only the 🔴 reliability bucket. The owner asked to also create tasks for the remaining deferred buckets surfaced from the review follow-ups: 🟠 emit/install hardening (N138), 🟡 handover-feature completeness (N143/N146/N149), and the ⚪ cosmetic/micro batch.

## Goal

Convert the still-applicable deferred review items into actionable, low-risk tasks; keep the cosmetic items as one batch rather than fragmenting; flag what's explicitly out of scope.

## Options considered

- **Fold `$ARGUMENTS` parity (N149) into a handover task vs the emit task** → folded into the **emit** task (N153), since it lives in `flowArtifacts`/emit alongside the other emit fixes.
- **Handover completeness as one task vs split** → split into **detail/legend rendering** (N154, cosmetic UI) and **custom-flow statuses in pickers** (N155, real functionality) — different risk/value.
- **Cosmetic items: 12 tiny tasks vs one batch vs drop** → **one batch** (N156, chore) with explicit triage + an out-of-scope list, so design-level items (live-SSE, kanban toggle, weight rescale) aren't smuggled into housekeeping.

## Decision

Four independent tasks (owner selected all four buckets):
- **N153** (fix, med) — emit/install hardening: skill-namespace collision cross-check, frontmatter escaping, empty-prompt guard, `$ARGUMENTS` parity.
- **N154** (fix, low) — ModuleDetail `KindPanels`/`facetLabel` + AgentDetail legend for `handover`/`status-transition`.
- **N155** (feat, med) — custom-flow statuses selectable in the status/trigger pickers.
- **N156** (chore, low) — housekeeping batch of the cheap, still-applicable polish items; design changes excluded.

## Open questions

- N155: a global module has no single flow context — define ModuleForm picker behavior minimally (canonical-only vs union-of-flows). Flagged in the spec.
- N156: several candidates may be moot post-N150 (e.g. the FlowEditor `builtins`/`flowStates` plumbing N150 removed) — triage before changing; the append-position change must keep the compose drift guard green.

## Sources

- N151 `ANALYSIS.md` (the full mining record, all four buckets).
- REVIEW.md non-blocking notes: N138 (emit hardening), N149 ($ARGUMENTS), N143 (detail/legend + custom-flow statuses), N146 (alias/custom statuses), N119/N120/N130/N137/N142/N144 (cosmetic batch).
- Files: `agents/emit.ts`, `agents/compose.ts`, `agents/flow-install.ts` (N153); `dashboard/client/ModuleDetail.tsx`, `AgentDetail.tsx` (N154); `dashboard/client/components/FlowEditor.tsx`, `ModuleForm.tsx` (N155); various (N156).

## Handoff brief

Four independent low-risk follow-ups mined from N99–N150 reviews. N153 emit hardening (4 fixes); N154 detail/legend rendering of the new kinds; N155 flow-aware status pickers (open question on global-module context); N156 housekeeping batch (triage-first, design items excluded, watch the drift guard). No inter-dependencies; each can be implemented/reviewed/merged on its own.
