# N224 — Rewrite hub/dashboard docs for the single-origin PWA hub

**Type:** docs
**Priority:** medium
**Created:** 2026-07-12

## Problem

The published docs describe the **pre-N212 multi-project model**: an "in-memory registry", a `prompt()`-based New Project that always scaffolds under a fixed folder, "open a project by running `insight-flow` in its folder", and a master that just "links to each project's own dashboard". After the N212–N222 epic the master is a **single-origin, installable PWA hub** — none of its headline features (reverse-proxy `/project/<id>/`, running/stopped switcher, Start-and-go, folder-browser New Project + install options, installable PWA + unified notifications, persistent `hub.json` registry, the loopback-only security model + `INSIGHT_FLOW_TRUSTED_HOSTS` for LAN/mobile) are documented, and several statements are now wrong.

## Goal

1. `built-ins/master-server.md` and `guides/multi-project-master.md` accurately describe the single-origin PWA hub (registry, proxy URLs, switcher, Start, New Project modal, PWA install, notifications, liveness, security).
2. The docs cover the **mobile/PWA** flow — including `INSIGHT_FLOW_TRUSTED_HOSTS` (from N223) and the trust boundary.
3. The **hub is positioned as the primary** multi-project path; `bulk-*` commands get a short "legacy" note.
4. Touchpoints (`dashboard/index.md`, `cli/setup-and-dashboard.md`, root `README.md`) are corrected/consistent.
5. Docs match shipped 2.4.0 behavior; site builds clean.

## Scope

### In scope

- `website/docs/built-ins/master-server.md` — **rewrite** to the hub: persistent `~/.insight-flow/hub.json` registry (+ `init` opt-in), reverse-proxy `/project/<id>/*`, running/stopped switcher + Open/Start, New Project **modal** (server-side folder browser under `INSIGHT_FLOW_BROWSE_ROOT`, install options: lifecycle/activity/editor/register-hub/composer-authoring flow), installable **PWA** (manifest + offline shell) + unified notifications/sounds (service worker), connection-based liveness + on-demand `refresh`, and the **security model** (loopback-only control-plane, `isTrustedLocalRequest`, token privacy, `INSIGHT_FLOW_TRUSTED_HOSTS`).
- `website/docs/guides/multi-project-master.md` — **rewrite** to the hub switcher workflow (single origin, `/project/<id>/`, running/stopped, PWA install, LAN/mobile via `INSIGHT_FLOW_TRUSTED_HOSTS` + trust-boundary caveat).
- `website/docs/dashboard/index.md` (+ `views.md` if needed) — correct the master reference; add "open a project through the hub" + PWA note.
- `website/docs/cli/setup-and-dashboard.md` — update the `master` row; make the Multi-project section lead with the hub and label `bulk-*` **legacy**.
- Root `README.md` — fix line ~61 ("card grid") + the Dashboard section to the single-origin PWA hub framing.

### Out of scope

- The `INSIGHT_FLOW_TRUSTED_HOSTS` **code** — that is N223 (this task only documents it). Land N223 first.
- Cutting a `versioned_docs/version-2.4` snapshot — that is a release step, done when 2.4.0 ships (note it, don't do it here).
- `CLAUDE.md` / `docs/architecture-diagrams.md` deep edits — optional stretch, not required (CLAUDE.md is AI-facing and already mostly current).
- Screenshots/GIFs — text + code blocks only unless trivially available.

## Implementation plan

1. **Audit + confirm behavior.** Re-read the shipped code paths so every doc claim is true: `master/server.ts` (routes, proxy, New Project, start, SW/manifest, guards), `master/overview.ts` (switcher UI), `core/global-config.ts` (`hub.json`), `agents/init` (register-hub + install options). Note the real defaults (ports 6100/6007+, `INSIGHT_FLOW_BROWSE_ROOT`, `INSIGHT_FLOW_PROJECTS_HOME`).
2. **Rewrite `master-server.md`.** New structure: What the hub is → Start it / home base → Registering projects (`init` opt-in + `hub.json`; legacy `bulk-*`) → Open/Start via `/project/<id>/` + running/stopped → New Project modal (folder browser + install options) → Install as a PWA + notifications → Liveness + refresh → Security & LAN/mobile (`INSIGHT_FLOW_TRUSTED_HOSTS`).
3. **Rewrite the multi-project guide** as a task-oriented walkthrough of the same, cross-linking master-server.md.
4. **Fix touchpoints** (`dashboard/index.md`, `cli/setup-and-dashboard.md`, README) for consistency; add the `bulk-*` legacy note.
5. **Build the site** (`website`: `pnpm build` / docusaurus build) to catch broken links/frontmatter.

## Verification

- `built-ins/master-server.md` + `guides/multi-project-master.md` contain no stale claims (no "in-memory registry", no `prompt`, no "run insight-flow in its folder to open"); they describe `/project/<id>/`, running/stopped, New Project modal, PWA install, `hub.json`, and `INSIGHT_FLOW_TRUSTED_HOSTS`.
- `bulk-*` is labeled legacy; the hub is the primary path.
- The Docusaurus site builds with no broken-link errors.
- A skim by a fresh reader matches what the running hub actually does.

## Notes

- **Depends on N223** (documents `INSIGHT_FLOW_TRUSTED_HOSTS`); land N223 first.
- Docs are user-facing (website + npm README) → must match **2.4.0**; land on `dashboard-improvements` so they ship with the release.
- Source of truth = the shipped code, not the old prose. Related tasks: N213 (registry), N214 (liveness), N215 (shell/switcher), N216 (notifications), N217 (PWA), N219 (token privacy), N220 (`/project/<id>`), N221 (New Project + guards), N222 (install options), N223 (trusted hosts).
