# N224 — Rewrite hub/dashboard docs for the single-origin PWA hub — Analysis

**Created:** 2026-07-12
**Author:** task-analyze

## Problem framing

The user asked to "change the documentation about the dashboard changes." A doc audit found the published hub/dashboard docs describe the **pre-N212 multi-project model** and contain several now-false statements (in-memory registry, prompt-based New Project, "open a project by running insight-flow in its folder", "links to each project's own dashboard"). The N212–N222 epic replaced that with a single-origin, installable PWA hub whose headline features are entirely undocumented. The goal is doc/reality parity for the 2.4.0 release — the docs are user-facing (website + npm README), so accuracy is part of shipping.

## Goal

- The hub docs describe the real single-origin PWA hub; mobile/PWA + the new trusted-host env are covered; the hub is the primary path and `bulk-*` is labeled legacy; touchpoints (README, CLI page, dashboard index) are consistent; the site builds clean.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Core hub docs + touchpoints (master-server, multi-project guide, dashboard index, CLI page, README) | Fixes all real staleness; proportionate; ships with 2.4.0 | Doesn't add a dedicated PWA page or diagrams | M |
| B — Only the two most-stale docs (master-server + multi-project guide) | Fastest | Leaves README / CLI page / dashboard index mismatched | S |
| C — Full overhaul + new "PWA hub" page + architecture diagrams + 2.4 versioned snapshot | Most complete | Larger; snapshot is a release step; risks scope creep | L |

## Decision

- Chosen option: **A** (confirmed with the user — "Core hub docs + touchpoints"). Also confirmed: **document mobile via the N223 trusted-host allowlist** (so land N223 first), and **position the hub as primary with `bulk-*` as legacy**.
- Rationale: A is the right proportion for a doc-parity pass tied to a release — it corrects every user-facing surface that's actually wrong without inventing new structure or doing release-only work (the versioned snapshot). C's extras can be follow-ups; B leaves visible mismatches.

## Open questions

- `[blocking]` Sequencing: N224 must land **after** N223, so the mobile section documents a working feature (`INSIGHT_FLOW_TRUSTED_HOSTS`), not an aspiration.
- `[non-blocking]` `bulk-*` are still shipped commands — keep a short legacy reference (don't delete), per the user's choice.
- `[non-blocking]` Versioned docs: cut `version-2.4` at release time (out of scope here); note it in the release checklist.
- `[non-blocking]` Trust boundary wording: be explicit that a trusted LAN host is unauthenticated — anyone who can reach the port has hub control; recommend trusted networks only.

## Sources

- Doc audit (analyzer-discovered): `website/docs/built-ins/master-server.md`, `website/docs/guides/multi-project-master.md`, `website/docs/dashboard/index.md`, `website/docs/cli/setup-and-dashboard.md`, `README.md` — read 2026-07-12; each shown to describe the old model.
- Behavior source of truth (analyzer-discovered): the shipped `packages/taskflow/src/master/*` + `core/global-config.ts` + `agents/init` (the N212–N222 epic).
- No external URLs used.

## Handoff brief

Title: Rewrite hub/dashboard docs for the single-origin PWA hub · type: docs · priority: medium. Rewrite `built-ins/master-server.md` + `guides/multi-project-master.md` to the shipped single-origin PWA hub (hub.json registry, `/project/<id>/` proxy, running/stopped switcher, Start-and-go, New Project modal + install options + composer flow, installable PWA + notifications, liveness/refresh, security model incl. `INSIGHT_FLOW_TRUSTED_HOSTS`), and fix the README, CLI setup page, and dashboard index for consistency. Position the hub as primary; mark `bulk-*` legacy. Depends on N223; land on `dashboard-improvements` for 2.4.0.
