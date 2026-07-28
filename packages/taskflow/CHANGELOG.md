# Changelog

All notable changes to `insight-flow` are documented here.

## [2.12.0](https://github.com/Slavo775/insight-flow/compare/v2.11.1...v2.12.0) (2026-07-28)


### Features

* **dashboard:** design-accurate Status Transitions pane (N265) + 2.12.0 release-fix (N264) ([#173](https://github.com/Slavo775/insight-flow/issues/173)) ([869bde4](https://github.com/Slavo775/insight-flow/commit/869bde42b04bbf30abd05751bbeb3575c915f55b))
* **dashboard:** facelift the project dashboard to the Lovable design (N258–N263) ([#171](https://github.com/Slavo775/insight-flow/issues/171)) ([8d3f1d5](https://github.com/Slavo775/insight-flow/commit/8d3f1d59035251923db6741dd74d7c99fbbc9318))

## [2.11.1](https://github.com/Slavo775/insight-flow/compare/v2.11.0...v2.11.1) (2026-07-22)


### Bug Fixes

* **master:** reject oversized POST request bodies with 413 (256KB cap) ([#169](https://github.com/Slavo775/insight-flow/issues/169)) ([fcf8fa3](https://github.com/Slavo775/insight-flow/commit/fcf8fa331e177f369d7257f6393af10f1c6bb2f1))

## [2.11.0](https://github.com/Slavo775/insight-flow/compare/v2.10.0...v2.11.0) (2026-07-18)


### Features

* **master:** update-available toast + insight-flow update CLI (N251) ([#166](https://github.com/Slavo775/insight-flow/issues/166)) ([7f5742c](https://github.com/Slavo775/insight-flow/commit/7f5742c007e6cd187c83c8e43b841d1c8e903d17))

## [2.10.0](https://github.com/Slavo775/insight-flow/compare/v2.9.0...v2.10.0) (2026-07-17)


### Features

* **logs:** redesign the master /logs page to the Lovable design (N248) ([#163](https://github.com/Slavo775/insight-flow/issues/163)) ([e452043](https://github.com/Slavo775/insight-flow/commit/e452043e301c6ea882d50cf1c8bd8fd5809bd3eb))

## [2.9.0](https://github.com/Slavo775/insight-flow/compare/v2.8.2...v2.9.0) (2026-07-16)


### Features

* **logs:** central debug log engine — /log, /api/logs, error boundaries, /logs page (N242-N244) ([#159](https://github.com/Slavo775/insight-flow/issues/159)) ([df957f3](https://github.com/Slavo775/insight-flow/commit/df957f34526cd53c3b4f0dc02b8bbb04e847fd7a))

## [2.8.2](https://github.com/Slavo775/insight-flow/compare/v2.8.1...v2.8.2) (2026-07-16)


### Bug Fixes

* **master:** inject hub-notify.js before the last &lt;/body&gt; so it executes (N245) ([#160](https://github.com/Slavo775/insight-flow/issues/160)) ([21b7ece](https://github.com/Slavo775/insight-flow/commit/21b7ece01cf0ede1fb7f940a760ef3e39682ff9c))

## [2.8.1](https://github.com/Slavo775/insight-flow/compare/v2.8.0...v2.8.1) (2026-07-15)


### Bug Fixes

* **master:** don't crash the hub on a missing project path; keep notifications after a master restart (N240) ([#157](https://github.com/Slavo775/insight-flow/issues/157)) ([5066877](https://github.com/Slavo775/insight-flow/commit/50668778391c87848843fce4060074d3710649d8))

## [2.8.0](https://github.com/Slavo775/insight-flow/compare/v2.7.0...v2.8.0) (2026-07-15)


### Features

* **dashboard:** deterministic status engine + hub-only notifications (N238) ([#155](https://github.com/Slavo775/insight-flow/issues/155)) ([03f9ecb](https://github.com/Slavo775/insight-flow/commit/03f9ecb351bfb662783ec71b5a0bb1d0fafdef2b))

## [2.7.0](https://github.com/Slavo775/insight-flow/compare/v2.6.0...v2.7.0) (2026-07-14)


### Features

* **master:** new-project init in the selected folder, respecting existing .claude/ (N236) ([#153](https://github.com/Slavo775/insight-flow/issues/153)) ([2a479eb](https://github.com/Slavo775/insight-flow/commit/2a479eb5e20a0873a33d53c02d7b0f99d521f323))

## [2.6.0](https://github.com/Slavo775/insight-flow/compare/v2.5.0...v2.6.0) (2026-07-14)


### Features

* **master:** gitignore new-project footprint, shared or local (N233) ([#151](https://github.com/Slavo775/insight-flow/issues/151)) ([39b05a1](https://github.com/Slavo775/insight-flow/commit/39b05a1acf7c2031dd72c3d4f9413dfc8fa11182))

## [2.5.0](https://github.com/Slavo775/insight-flow/compare/v2.4.1...v2.5.0) (2026-07-14)


### Features

* **master:** redesign overview as React island with shared component kit (N231) ([#149](https://github.com/Slavo775/insight-flow/issues/149)) ([fc671dd](https://github.com/Slavo775/insight-flow/commit/fc671dd36f1e4a57b77d8cc799fffcdb576e8fbb))

## [2.4.1](https://github.com/Slavo775/insight-flow/compare/v2.4.0...v2.4.1) (2026-07-13)


### Bug Fixes

* dashboard and hub reliability fixes (N226-N228) ([25de756](https://github.com/Slavo775/insight-flow/commit/25de7568b30d77e6a4bde58eb1b86e94d5b26b18))

## [2.4.0](https://github.com/Slavo775/insight-flow/compare/v2.3.1...v2.4.0) (2026-07-13)


### Features

* **agents,dashboard:** hub activity delivery + SW-unified notifications (N225) ([a14028f](https://github.com/Slavo775/insight-flow/commit/a14028fcbee94b9f043691ddf51442058beb9a23))
* **master:** connection-based liveness + per-project token + on-demand health (N214) ([34bc7aa](https://github.com/Slavo775/insight-flow/commit/34bc7aad533ec5bfc45c05f01854701ff2db0416))
* **master:** hub robustness + UX fixes (N218) ([7563531](https://github.com/Slavo775/insight-flow/commit/75635318ef68ef17fff3c352c4eae46f67d23d75))
* **master:** installable PWA for the hub — manifest + offline app shell (N217) ([0c97415](https://github.com/Slavo775/insight-flow/commit/0c97415d38e38a730b1176e587b22965de96f9ca))
* **master:** LAN/mobile hub access via a trusted-host allowlist (N223) ([4a18a0d](https://github.com/Slavo775/insight-flow/commit/4a18a0d103af15c468fa181c33ca8b84fba5102a))
* **master:** New Project install options + composer-authoring flow install (N222) ([57ebb84](https://github.com/Slavo775/insight-flow/commit/57ebb845840268b4e2786e1fe82c6c013b4ed7f4))
* **master:** New Project modal + server-side folder browser (N221) ([cf87792](https://github.com/Slavo775/insight-flow/commit/cf87792ca62376b2e417f3b7cc23668cc16fb424))
* **master:** reverse-proxy spike — serve a project dashboard on one origin (N212) ([70388de](https://github.com/Slavo775/insight-flow/commit/70388deae38f9641e0f3e4de8cc9c69c6510d5b8))
* **master:** reverse-registration handshake + client token privacy (N219) ([dbd3a39](https://github.com/Slavo775/insight-flow/commit/dbd3a395389eb0cbb6a5cf5773ac04e213e69e64))
* **master:** single-origin hub shell + project switcher + start-and-go (N215) ([a7f6fb3](https://github.com/Slavo775/insight-flow/commit/a7f6fb31fa33a12196566a50637245d87f5dd8c9))
* **master:** stable /project/&lt;projectId&gt; proxy path + running/stopped split (N220) ([cf97208](https://github.com/Slavo775/insight-flow/commit/cf972089c96fa3243eb66a407f50fe74a8f47063))
* **master:** unified notifications + sounds via a hub service worker (N216) ([de16a04](https://github.com/Slavo775/insight-flow/commit/de16a047b7c8211a773303fdad71ca8268b4172e))
* **master:** unified persistent hub registry + init opt-in (N213) ([fada1fd](https://github.com/Slavo775/insight-flow/commit/fada1fd6fbb7b7078b93c02b3a14f63b09a81dbb))
* single-origin PWA hub (N212–N225) → 2.4.0 ([381990b](https://github.com/Slavo775/insight-flow/commit/381990ba96975eece10063457ce2b6743f133ba6))


### Bug Fixes

* **dashboard:** base-aware project nav under the hub proxy ([c4dc149](https://github.com/Slavo775/insight-flow/commit/c4dc1497e2d807e51d430744cd936a57ac3f0218))

## [2.3.1](https://github.com/Slavo775/insight-flow/compare/v2.3.0...v2.3.1) (2026-07-10)


### Bug Fixes

* **agents:** flow-aware live-status — recognise all installed flows/agents; composer opt-in for activity (N211) ([889e70d](https://github.com/Slavo775/insight-flow/commit/889e70dbac49f84102b560dfb00abff8347cf0b7))
* **agents:** flow-aware live-status — recognise all installed flows/agents; composer opt-in for activity (N211) ([eb571b2](https://github.com/Slavo775/insight-flow/commit/eb571b25a18b8488c72fdbf6621035b52590febe))

## [2.3.0](https://github.com/Slavo775/insight-flow/compare/v2.2.0...v2.3.0) (2026-07-10)


### Features

* **agents:** composer analyze v2 — design strategist + custom-only rule + model primer (N200) ([3b5de5b](https://github.com/Slavo775/insight-flow/commit/3b5de5b21829e8c89ac54a0a6070fdbb0e3e6fbd))
* **agents:** composer flow layout — stack reviewer below implementer (N206) ([89273cf](https://github.com/Slavo775/insight-flow/commit/89273cf30eecb0c47aed6dd42b02533f9a86f3b6))
* **agents:** composer flow polish — review-template convention, status labels, hooks in install validation (N205) ([ee27339](https://github.com/Slavo775/insight-flow/commit/ee27339e04b88a9d09053c2331811b71c9e13125))
* **agents:** composer implementer + fixer v2 — shared build core (N202) ([641c61a](https://github.com/Slavo775/insight-flow/commit/641c61a16355f738d9056b7212cfa03884cb43ee))
* **agents:** composer implementer builds + fixes; remove separate fixer (N202) ([4a24450](https://github.com/Slavo775/insight-flow/commit/4a244503e1095c47164794a69f2f9d4f56ad82e2))
* **agents:** composer install v2 — one install+validate agent, install-first (N204) ([7ec0322](https://github.com/Slavo775/insight-flow/commit/7ec0322ced93ba4642def181689c6d9dfec4c50c))
* **agents:** composer review v2 — unify AI + human review; consolidate requirements (N203) ([de6a553](https://github.com/Slavo775/insight-flow/commit/de6a553e8b3b4b1e52a3fb9b06e50cfc3fe46fe7))
* **agents:** composer taskmaster v2 — templated spec-writer + change-handling (N201) ([e4b9739](https://github.com/Slavo775/insight-flow/commit/e4b973900062f57f7d29a075e1a8b26895178e10))
* **cli:** add `insight-flow install-flow <id>` command (N208 part 1) ([8cdef69](https://github.com/Slavo775/insight-flow/commit/8cdef69c5de39723b936a6fb71e4834b66c6c10b))
* **init:** events on by default, deprecate agents.extend (N207) ([8bfddad](https://github.com/Slavo775/insight-flow/commit/8bfddadcfbdc7d720902c05081d48df7b1159bcf))
* **master:** global home base — project-less dashboard + create-project from UI (N210) ([3b9472b](https://github.com/Slavo775/insight-flow/commit/3b9472bdcc04557d51878a85d1da388dea2ae76e))


### Bug Fixes

* **agents:** drop Smithery MCP entirely; discover via github.com/mcp (N200) ([b0af86d](https://github.com/Slavo775/insight-flow/commit/b0af86d312d7b16014617b00aae99e63218db495))
* **agents:** make registry MCP opt-in, analyzer uses web search by default (N200) ([83031ac](https://github.com/Slavo775/insight-flow/commit/83031acd243ff4deb076d7c2335ce8d64a5eade0))
* **agents:** rewire discovery to github.com/mcp after Smithery removal (N200) ([2b254a0](https://github.com/Slavo775/insight-flow/commit/2b254a0f18cc1a46ed16a0202572694dddf3f258))
* **agents:** specify project-local secrets in composer MCP guidance (N200) ([26e8910](https://github.com/Slavo775/insight-flow/commit/26e89102f335cd1faf05e146b54d41faa40ac129))

## [2.2.0](https://github.com/Slavo775/insight-flow/compare/v2.1.0...v2.2.0) (2026-07-01)


### Features

* **agents:** plain-language module — simpler English for non-native speakers (N199) ([#139](https://github.com/Slavo775/insight-flow/issues/139)) ([a2f8ce9](https://github.com/Slavo775/insight-flow/commit/a2f8ce98917a025dad52a124009b84529bf52e1d))
* **composer:** authoring flow — second built-in flow for creating modules/agents/flows (N194–N198) ([#137](https://github.com/Slavo775/insight-flow/issues/137)) ([4a83d9a](https://github.com/Slavo775/insight-flow/commit/4a83d9ac776302efb2812876e8df754918c92c83))

## [2.1.0](https://github.com/Slavo775/insight-flow/compare/v2.0.1...v2.1.0) (2026-06-26)


### Features

* **docs:** add Docusaurus documentation site with GitHub Pages deploy (N178) ([#132](https://github.com/Slavo775/insight-flow/issues/132)) ([213f6fe](https://github.com/Slavo775/insight-flow/commit/213f6feaa64af213e1b2d109431fb5782d25699f))
* **mcp:** composer MCP server over stdio (N188) ([1b14790](https://github.com/Slavo775/insight-flow/commit/1b14790860767724d2c95cd7dda9259fe29bd3c5))
* **subagents:** native subagents, orchestrators & handover intent (N189–N192) ([5f3c70d](https://github.com/Slavo775/insight-flow/commit/5f3c70ddfdd145936716eb1323deb36187f916bd))

## [2.0.0] — 2026-06-23

A major release. insight-flow gained a React/Vite dashboard, a full visual **flow**
system (flows now govern every project's lifecycle), an **install/uninstall engine**
for agents and modules, the everything-is-a-module **agent composition v2** model, and
a new `insightFlow/` project layout. The notes below are curated highlights — see the
commit history (`v1.0.0..v2.0.0`) for the complete list.

### ⚠ BREAKING CHANGES

- **Agent composition model v2 — "everything is a module."** A composed agent is now a single ordered `modules` list of registry ids. The `sections`, `includes`, and `trailingIncludes` fields were removed from the composed-agent schema, and the composer is a pure-sequence renderer (each module renders as a standalone block in declared order; heading-targeted bullet merging is gone). `task-git` was also split out of the enforcement module into its own module.

  **Migration:** if you maintain custom composed agents (`agents/composed/*.json`) or module files (`agents/modules/*.json`), convert each agent to a single ordered `modules: string[]` of registry ids, and give every module a `kind` — `"section"` (with `heading` / `body`) or `"include"` (with `ref`, e.g. `@AGENT_ENFORCEMENT.md`). Module ids must be unique — duplicate ids now throw when the registry is built. Stock role files (`TASK_*_ROLE.md`, `AGENT_*.md`) are unchanged and remain canonical.

- **New `insightFlow/` project layout.** Task state now lives under `<project>/insightFlow/` (e.g. `insightFlow/workTasks/`) instead of a top-level `workTasks/`. A back-compat shim still resolves the legacy `workTasks/` layout, so existing projects keep working.

  **Migration:** run `insight-flow migrate-layout` once per existing project to move task state under `insightFlow/` (and re-run `insight-flow init` to refresh scaffolding). New projects use the new layout by default.

- **Dashboard realtime transport replaced.** `socket.io` was removed and the live channel is now a native **Server-Sent Events (SSE)** transport, served at `/sse`. The `socket.io` dependency is gone from the package.

  **Migration:** any integration that connected to the dashboard via a Socket.IO client must switch to the native SSE endpoint (`/sse`, consumed with `EventSource`). The CLI and bundled dashboard handle this automatically — no action needed for normal use.

### Added

- **React + Vite dashboard.** The dashboard was rewritten from a server-rendered vanilla-JS page into a React/Vite app: dedicated task-detail pages (react-router), a wider detail panel + reading mode, a styled-components theme with shared components and a Zustand store, and a module & agent browser with composition maps.
- **Visual flow system.** A flow map shows a task on its lifecycle with the current state highlighted and next-step suggestions, backed by a full **flow editor** — draggable nodes with persisted layout, connectable input/output ports, save/load round-trip via the CRUD API, multiple named flows per project, per-flow custom states, terminal "done" nodes, and an edge modal to edit triggers/relationships.
- **Flows govern everything.** Tasks bind to a flow (`Task.flowId` + a type→flow map); kanban columns, status badges, status pickers, and agent role prompts all read the bound flow's status set. Added a `set-flow` command + dashboard reassignment and a generic, flow-validated status setter.
- **Agent composition v2 + registry.** The everything-is-a-module model on a real registry: heterogeneous module kinds (`mcp` / `hook` / `skill`), bundle modules (modules composed of modules), security as a first-class module, an actions/events taxonomy, and an agent **handover** system (agent- and edge-authored handovers wired into install-time composition, diagrams, and prompts). All 9 shipped roles are now composer-generated (JSON canonical).
- **User-space customization.** User-space registries for custom modules / agents / projects, a CRUD API for custom definitions, and dashboard forms (kind-specific module create/edit for Claude + Cursor targets; an agent composer to add/remove/reorder modules).
- **Install / uninstall engine.** Derive a full install plan from a flow and execute it with live SSE progress; install and uninstall agents & modules from the dashboard; templated `${VAR}` inputs in hooks/skills/command bodies with install-time substitution; and overwrite undo/rollback (restores the prior `.mcp.json` entry).
- **Opt-in observability.** A Langfuse exporter (OpenTelemetry) plus a pointer skill module — registry-only and off by default.
- **New CLI commands.** `insight-flow migrate-layout` (upgrade a project to the `insightFlow/` layout) and `insight-flow rename` (update a task's title/type/priority). Plus yalc local-publish scripts for testing installs in a consumer project.

### Changed

- **Single `insight-flow` package.** `packages/taskflow/src` is organized into `core / cli / dashboard / master / agents`, and the former `insight-flow-master` package is folded in as the `insight-flow master` subcommand (one published binary). Introduced bounded **Transport** and **Storage** extension seams; the Storage port is now used across the CLI commands.

### Fixed

- **Layout path resolution.** Eliminated a doubled `insightFlow` task-folder path in `resolveTaskFolder`, unified it into one shared core resolver, and added guarded cleanup of stray doubled `workTasks/` directories during `migrate-layout`.
- **Reliability roundup.** Server request error boundary + oversize-body handling, event-emit hardening, install hardening (namespace-collision guard, shared-ownership removal guard, full secret scrub in the conflict diff), and flow-loader fixes (agent→terminal edges accepted; default-flow resolution on delete).

## [1.0.0] — 2026-06-02

First stable (GA) release. The CLI surface is now considered stable; future breaking changes follow semver.

### Added

- **N75** — Cursor editor provider for `insight-flow init`. New `--editor claude|cursor|all` flag (auto-detected from an existing `.claude/` or `.cursor/` directory, default `claude`). For Cursor, each agent skill is written as `.cursor/skills/<name>/SKILL.md` (invokable as `/<name>` in Cursor's agent chat) and the insight-flow context block is written to the root `AGENTS.md`. Skill prompts come from the same canonical source as the Claude commands, via a provider seam so additional editors can be added without touching command logic.
- **N76** — Provider identity (`claude` / `cursor`) on lifecycle events. Events carry a `provider` field, surfaced as a provider badge on both the dashboard activity feed and the master overview cards.
- **N77** — Cursor lifecycle hooks → dashboard. `--editor cursor` installs `.cursor/hooks.json` + thin hook scripts that parse Cursor's binary hook payloads and stream `stop` / `preToolUse` / … events into the dashboard, firing the same OS/browser notifications as Claude.
- **N79** — Permission-required notification parity for Cursor. Approval gates on `beforeShellExecution` (sensitive shell, e.g. `git push`), `preToolUse` (Shell-like tools), and `beforeMCPExecution` (all MCP) post to `POST /api/agent-permission` and fire the same `Permission required` toast as Claude; `Done` uses `POST /api/agent-done`. Gates return `{"permission":"ask"}` — never auto-deny. Matchers are insight-flow-defined and tunable in `.cursor/hooks/insight-flow-approval.sh`.

### Changed

- **N78** — Multi-project commands renamed `batch*` → `bulk*`: `bulk-register`, `bulk-unregister`, `bulk-down`, `bulk-ui`, `bulk-init`, `bulk-prompt-build`. The old `batch*` / `ui-batch-*` names still work for one more release but print a deprecation warning. `bulk-init` is editor-aware: each registered project's `taskflow.config.json` may set `"editor": "claude" | "cursor" | "all"`, honored per project; `bulk-init --editor <v>` overrides the whole fleet. Registry format unchanged, so registered projects are unaffected.

### Fixed

- **`/task-analyze`** — the pre-taskmaster strategist now requires an explicit human go-ahead (e.g. "create it") before handing off to `/taskmaster`. Answering its clarifying questions or picking an approach no longer counts as permission to create the task.

### Notes

- Consumers should re-run `insight-flow init` after upgrading to scaffold Cursor support (`--editor cursor` or `--editor all`). `init` is additive — `--force` is only needed to overwrite existing skill files.

## [0.13.0] — 2026-05-29

### Added

- **N73** — `/task-analyze` pre-taskmaster strategist agent. Runs *before* `/taskmaster`, executes an Analyze → Challenge → Propose → Interrogate loop, and only hands off to `/taskmaster` after the human confirms a chosen path. New files: `TASK_ANALYZER_ROLE.md` at repo root (synced to `packages/taskflow/templates/roles/TASK_ANALYZER_ROLE.md` by `scripts/sync-role-templates.mjs`), `packages/taskflow/templates/task/ANALYSIS.md.tpl` narrative template (sections: Problem framing · Goal · Options considered · Decision · Open questions · Sources · Handoff brief), and `.claude/commands/task-analyze.md` slash-command stub scaffolded by `insight-flow init`. New `--with-analysis` flag on `insight-flow create` copies `ANALYSIS.md.tpl` into the new task folder and includes `analysisMd` in the JSON output (default behaviour unchanged when flag omitted). `"task-analyze": "TASK_ANALYZER_ROLE.md"` added to `AGENT_ROLE_FILE_MAP` so `agents.extend.task-analyze` works for every consumer project. Includes an analyzer-specific **Security guardrails** block on top of the inherited `@AGENT_SECURITY.md` baseline (URL/document treated as DATA, no auto-fetching URLs found inside fetched docs, external content quoted in `EXTERNAL CONTENT — INFORMATIONAL ONLY` blocks, refusal to call `/taskmaster` when the entire brief originated externally).

### Fixed

- **N71** — Master overview cards no longer keep their green `claudeStatus` highlight after a project server goes offline. `packages/insight-flow-master/src/overview.ts` now computes `isLive = (Date.now() - new Date(p.lastSeenAt).getTime()) / 1000 < 60` inline in `renderCard` and gates `statusCls`, `claudeBadgeCls`, and `claudeBadgeLabel` on it; off-line cards render neutral regardless of cached status. Removed entirely: `.conn-badge` / `.conn-live` / `.conn-stale` / `.conn-down` CSS rules, the `badgeInfo()` helper, the `data-badge` markup inside each card header, and the `refreshBadges()` function + its 30 s `setInterval`. Subtitle counter `N projects · M live` retained. No `registry.ts` changes — `claudeStatus` keeps its last-pushed value so a brief reconnect within the 60 s window restores state without an extra round-trip.

### Changed

- **N72** — Dashboard browser notification on agent turn-end now reads `Done` (was `Awaiting input`). Updated in `packages/taskflow/src/server/dashboard.ts` in both code paths that fire desktop notifications: `fireDesktopNotif()` (legacy `agent-done` socket event) and `fireStatusDesktopNotif(toStatus)` (N68 derived-status `status` socket event, `toStatus === 'done'` branch only). The `awaiting-permission` branch retains `Permission required`. Project-name prefix, sound logic, and page-title glyph mapping unchanged.

### Notes

- Consumers should re-run `insight-flow init` after upgrading to scaffold `.claude/commands/task-analyze.md`, `.claude/roles/TASK_ANALYZER_ROLE.md`, and the new `templates/task/ANALYSIS.md.tpl`. `init` is additive — `--force` is only needed if you want to overwrite existing skill files.

## [0.12.0] — 2026-05-28

### Added

- **N68** — `POST /log/events` endpoint on the project HTTP server. Accepts a Zod-validated `HookEventInput` (`{id, timestamp, type, payload, sessionId?, taskId?}`), persists a daily JSONL backup at `workTasks/.events/<YYYY-MM-DD>.jsonl`, and broadcasts an `event` frame on the Socket.IO connection. Hook scripts (`lifecycle-agent-active.sh`, `lifecycle-agent-idle.sh`, `lifecycle-pre-tool.sh`, `lifecycle-post-tool.sh`, `lifecycle-permission.sh`, `lifecycle-session-start.sh`) all POST to this endpoint via `insight-flow log-event`.
- **N68** — Four-state project status model: `active` | `awaiting-permission` | `idle` | `done`. Status is derived from the latest event by timestamp in an in-memory `EventStore` (bounded ring buffer, N=200), with at-least-once dedup by `event.id`. Exposed via:
  - `GET /log/status` — returns `{ status, events: HookEventInput[] }` for inspection.
  - Socket.IO `status` frame — broadcast on every transition (`{ kind: "status", from, to, at, latestEventId }`).
- **N68** — Browser notifications wiring in the dashboard. Per-browser "Browser notifications" toggle (localStorage-backed) + a "Request permission" button that calls `Notification.requestPermission()`. Notifications fire only on `→ done` / `→ awaiting-permission` transitions, and only when the tab is unfocused (`!document.hasFocus()`).
- **N68** — Master overview now receives status pushes from each project server on transitions (`POST /api/projects/<uuid>/status` with `{status}`). Master integration unchanged from N20 — the project UUID lookup stays where it is.
- **N68** — Public exports added to `packages/taskflow/src/index.ts`: `deriveStatus`, `statusFromEvent`, `EventStore`, plus the `HookEventInput`, `ProjectStatus`, `EventFrame`, `StatusFrame` types.

### Changed

- **N68** — Activity-engine `Event`-tool rows now also feed the `EventStore` so the master overview gets status updates even when hooks call an unmigrated (pre-N68) `insight-flow` binary that doesn't POST to `/log/events`. Both paths funnel through the same derivation, so the four-state vocabulary stays unified.

### Notes

- **N69** (`stateful status transitions: only agent-active leaves idle/done`) was scoped, prototyped, and rejected after live evaluation. No code ships in this release; the task folder is retained at `workTasks/N69-...` as a record of the tried-and-abandoned direction.

## [0.11.2] — 2026-05-28

### Fixed

- **N67** — Hook scripts registered by `insight-flow init` and `install-activity-hook` now use `${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>` instead of bare relative paths. Claude Code does not guarantee CWD equals the project root when firing hooks, so relative paths silently failed for `PostToolUse`, `PreToolUse`, and `Stop` events — every tool call produced a `/bin/sh: .claude/hooks/<file>: No such file or directory` error in the hook status bar. **Upgrade path:** after `npm install -g insight-flow@latest`, re-run `insight-flow init` in each project to rewrite `settings.local.json` with the corrected paths.

## [0.11.1] — 2026-05-28

### Changed

- **N66** — `batch-init` renamed to `bulk-init`; `batch-prompt-build` renamed to `bulk-prompt-build`. Both remain top-level commands with identical behaviour — only the command names changed. Update any scripts or aliases that reference the old `batch-*` names.

## [0.11.0] — 2026-05-28

### Added

- **N64** — `batch-ui --init [--force] [--examples]` runs `insight-flow init` in all (or interactively selected) registered batch-ui projects. Useful after upgrading insight-flow to re-scaffold role files across every consumer project in one command.
- **N64** — `batch-ui --prompt-build` runs `insight-flow prompt-build --apply` in all (or selected) registered projects. The canonical post-release workflow: after `npm install -g insight-flow@latest`, run `insight-flow batch-ui --prompt-build` to sync `AGENT_ENFORCEMENT.md` and role extensions everywhere.

### Fixed

- **N64** — `prompt-build --apply` now writes `AGENT_ENFORCEMENT.md` into `config.rolesDir` (e.g. `.claude/roles/`) instead of the project root when the project's role files live there. Consumer projects initialised with `insight-flow init` now get the enforcement file co-located with their role files so `@AGENT_ENFORCEMENT.md` references resolve correctly.

## [0.10.0] — 2026-05-28

### Security

- **N59** — `AGENT_SECURITY.md` added at repo root with prompt-injection guardrail rules covering hidden-instruction suppression, URL exfiltration, action hijacking, and persona override. Imported via `AGENT_ENFORCEMENT.md` so all 8 agents receive the guardrails without individual edits. Synced to `packages/taskflow/templates/roles/AGENT_SECURITY.md`.

### Fixed

- **N60** — Master registry no longer generates a new UUID on every re-registration; project cards deduplicate correctly when a server restarts.
- **N61** — Overview grid uses equal-width columns (`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`) with a single-column fallback below 400 px viewport width.
- **N62** — `/sounds/` endpoint restored with explicit `Content-Length` header. `playStatusSound()` tries the mp3 via a `HEAD` check first; falls back to Web Audio API tones when no file is present or file is empty. Placeholder `idle-ping.mp3` and `permission-alert.mp3` shipped in package.

## [0.9.1] — 2026-05-27

### Added (N58)

- `insight-flow batch-ui --remove "<label>"` — remove a registered project from the batch-ui registry by label; cleans `lastSelected` to prevent ghost pre-checks on next run.
- `insight-flow ui-batch-unregister` — mirror of `ui-batch-register`; run inside a project folder to remove it from the registry by path match (no label required).
- `batch-ui --list` now shows the resolved `projectName` and `workDir` from each entry's `taskflow.config.json`, making misregistrations (e.g. wrong folder) immediately visible.

### Fixed (N58)

- Port-collision guard: `cmdBatchUi` maintains an in-memory `claimedPorts` set so `findFreePort` never assigns the same port twice within a single run, even when the OS reassigns a just-probed port before the child process binds.
- Port-skip warning: `findFreePort` now prints `(port N was occupied, skipped)` to stderr whenever it has to skip an occupied port, so users know old servers are still running.
- Duplicate-spawn prevention: re-running `batch-ui` with a project whose server is already alive (PID liveness probe via `process.kill(pid, 0)`) prints `[<label>] server on port <N> already running, skipped` and does not spawn a new process. Surviving PIDs are merged with newly spawned ones in `runningPids` so `ui-batch-down` can reach all servers.

## [0.9.0] — 2026-05-27

### Added (N56)

- `insight-flow batch-ui` — interactive multi-select prompt to launch dashboards for multiple registered projects at once; spawns a detached `insight-flow ui` process per project on auto-assigned ports starting at 6007; opens all URLs in the default browser (suppress with `--no-open`); non-TTY mode selects all projects.
- `insight-flow ui-batch-register` — run inside any insight-flow project folder to register it in the global registry (`~/.insight-flow/batch-ui.json`) using the project name from `taskflow.config.json`; actionable errors for missing/invalid config and duplicate entries.
- `insight-flow batch-ui --add "<label>" <path>` — register a project by explicit path without `cd`-ing.
- `insight-flow batch-ui --list` — list all registered projects.
- `insight-flow ui-batch-down` — stop all servers started by the last `batch-ui` run (reads PIDs from global registry, sends SIGTERM, clears list; handles already-exited processes gracefully).
- Global registry persists last-selected projects for pre-checked prompt on next run.
- Cross-platform: macOS (`open`), Linux (`xdg-open`), Windows (`start`, `insight-flow.cmd`).

## [0.8.0] — 2026-05-27

### Added

- **N46** — New `/config` dashboard page lists every option from `taskflow.config.json` with current values, types, and descriptions. Accessible via the top navigation bar.
- **N53** — `insight-flow init` now asks two interactive Y/n questions: whether to enable task lifecycle events (default yes) and whether to enable agent activity tracking (default no). Non-TTY environments receive the defaults automatically. Existing configs are respected on re-init.

### Changed

- **N50** — `prompt-build` now reads agent extension strings directly from `taskflow.config.json` (`agents.extend`). The separate `taskflow.prompt.json` sidecar file is no longer written or read; delete it if present in your project.
- **N51** — `insight-flow init` automatically runs `prompt-build --apply` so `AGENT_ENFORCEMENT.md` stays in sync with `taskflow.config.json` on every init without a separate manual step.
- **N52** — Browser desktop notifications now fire when Claude finishes a turn (agent done), replacing the previous per-status-transition model. One notification per completed agent session instead of one per task state change.
- **N54** — The repeated EVENTS block is extracted from all 8 agent role files into a single `AGENT_EVENTS.md`, referenced via `@AGENT_EVENTS.md`. Token load per agent run is reduced by ~120 words. `AGENT_PROTOCOL.md` sheds the duplicate `TOKEN EFFICIENCY`, `GIT RULE`, and `EXTENDING WITH PROJECT-SPECIFIC COMMANDS` sections.

### Docs

- **N49** — Project-wide documentation audit: stale references updated, missing sections filled, and accuracy verified across `CLAUDE.md`, `README.md`, role files, and architecture diagrams.

## [0.7.0] — 2026-05-26

### Fixed

- **N40** — Master server upserts registrations by project ID instead of appending duplicates; eliminates ghost entries after server restarts.
- **N43** — Dashboard sounds no longer replay on socket reconnect. Historical idle/permission-needed events from the snapshot are suppressed; only live events trigger audio.

### Added

- **N41** — Master overview cards reflect real-time Claude session status (active / idle / permission-required) with solid colour-coded card backgrounds and a text badge. Project server pushes status fire-and-forget on activity events; initial `idle` push happens immediately after registration.
- **N42** — `agents.git.permissions` config block (9 boolean flags: `createBranch`, `checkout`, `commit`, `push`, `forcePush`, `merge`, `deleteBranchLocal`, `deleteBranchRemote`, `createPR`) lets projects block specific git operations while keeping others enabled. `task-git` reads the block on every run and prints a clear blocked message naming the exact config key to change. `insight-flow init` scaffolds the full block with safe defaults (`forcePush: false`, rest `true`). Protocol documented in `AGENT_CONFIG.md`.
- **N47** — `remoteOps: "allow" | "deny"` shorthand added to `agents.git.permissions`. Setting `"deny"` blocks all origin-touching ops (`push`, `forcePush`, `deleteBranchRemote`, `createPR`) at once; individual boolean flags override the shorthand. `resolveConfig()` applies the shorthand post-merge so resolved config and dashboard both reflect the effective values. `AGENT_CONFIG.md` updated with equivalent runtime logic for `task-git`.

### Docs

- **N48** — `packages/taskflow/README.md` rewritten: `## Install` + `## Quickstart` replaced with a 6-step `## Getting started` guide (`### What init creates` table lists all scaffolded paths); `## Configuration` expanded to a complete reference covering all 22 config fields across `TaskflowConfig`, `ActivityEngineConfig`, `NotificationsConfig`, `MasterConfig`, and `EventsConfig`.

## [0.6.0] — 2026-05-25

### Breaking changes

- **N34** — `activityEngine.enabled` now defaults to `false`. The activity feed, Claude status badge, sounds, and tab-title emoji are all gated behind this flag. Add `"activityEngine": { "enabled": true }` to `taskflow.config.json` to restore previous behaviour.

### Fixed

- **N24** — Hook registration format corrected for Claude Code `settings.json` schema (hooks array shape was rejected by the schema validator).

### Added

- **N25** — Shared top navigation bar across all dashboard pages (`/`, `/overview`) with project name and active-page highlight.
- **N26** — Strict event-type separation: activity events (human-readable feed items) vs typed hook events (machine-readable triggers). `activityEngine.enabled` is now the single gate for automation triggers.
- **N27** — Command hooks auto-emit `start`/`done` lifecycle events without manual `insight-flow log-event` calls. New `--if-active` flag for conditional hook execution; session events logged to a `.jsonl` file alongside the activity log.
- **N28** — Claude Code hook scripts bundled inside the package and installed during `insight-flow init`; lifecycle notification wiring included out of the box.
- **N29** — Activity tabs panel below the Kanban board: "Claude Activity" and "Recent Activity" panes with tab switching.
- **N33** — Unique event IDs (`evt_<timestamp>_<rand>`) on all hook events for client-side deduplication and dashboard action resolution.
- **N35** — Shared Claude status badge with three states: active (⚡), idle (💤), permission-needed (🚨) — rendered in the top nav and used as the tab-title prefix.
- **N36** — Sound notifications on agent-idle and permission-needed transitions (`/sounds/idle-ping.mp3`, `/sounds/permission-alert.mp3`). Per-browser opt-out toggle in the notification settings popover.
- **N37** — Browser tab title reflects Claude status with emoji prefix (⚡ / 💤 / 🚨); resets to plain title when status clears.
- **N38** — `notifications.sounds.enabled` config flag — project-level kill-switch for all dashboard sounds (default `true`). Overrides the per-browser checkbox when `false`.

### Changed

- **N30/N31/N32** — Activity feed items refactored to a shared wrapper component with consistent border-colour theming; duplicate rendering logic removed from Claude Activity and Recent Activity feeds.

### Docs

- **N23** — Architecture diagrams added: agent flow, server layout, notification pipeline, activity engine.

## [0.5.0] — 2026-05-23

### Breaking changes

- **N16** — `taskflow.prompt.json` schema slimmed: `gitTool` and `prStrategy` fields removed. They no longer gate prompt-build's substitution (the agent stack is now technology-agnostic). Consumers can either delete those keys or let `prompt-build` ignore them silently. This is the only schema breakage in this release.

### Fixed

- **N17** — Dashboard live-updates now use Socket.IO with automatic long-polling fallback, built-in 25 s heartbeat, and automatic reconnection. Real-browser support across Chrome and mobile Safari. Recursive `workTasks/` watcher with per-subdir Linux fallback and 100 ms debounce.
- **N18** — Activity panel detects hook installation status at boot and renders contextual empty-states (`hook-missing`, `settings-missing`, `both-missing`, and "Waiting for Claude activity — restart your Claude Code session" for the ok-but-empty case). New `insight-flow install-activity-hook` subcommand retrofits the hook into existing projects without re-running init; respects `activityEngine.enabled` with `--force` escape hatch.

### Added

- **N15** — `insight-flow show --id Nxx [--summary] [--spec]` for lean task lookups; `next --with-spec` / `next-review --with-spec` / `next-fix --with-spec` inline TASK.md + CHECKLIST.md content in the JSON response (saves agents two Read calls per task pick).
- **N15** — `REVIEW.md` is scaffolded by `review-start` from a template; Round-N reviews append `## Round N` blocks instead of overwriting.
- **N15** — `insight-flow stats --tokens` reports `tokensUsed` trends per task type/priority (min/median/p90/max/last-5-avg/all-time-avg).
- **N16** — `insight-flow init --examples` writes commented `agents.extend.<agent>: []` stubs into `taskflow.config.json`.
- **N19** — Browser + CLI notifications on task transitions. Dashboard fires the `Notification` API for watched status changes; new `insight-flow notify "<message>"` subcommand fires OS notifications independent of any browser tab (macOS / Linux / Windows). Both halves opt-out via `notifications.browser` and `notifications.cli` in `taskflow.config.json`.
- **N20** — `/overview` route aggregates multiple insight-flow servers into one page; reads `~/.insight-flow/projects.json`; per-project Socket.IO connections with live/reconnecting/down badges. Pairs with N19 so a transition on any project fires a project-labelled OS notification.
- **N21** — Richer activity feed: free hook enrichment (`UserPromptSubmit` → "Started /<skill>", `Stop` → "Completed", `PreToolUse` command classification) and cheap agent-side phase markers via the new `insight-flow log-activity "<message>" [--phase <name>]` subcommand. Both halves opt-out via `activityEngine.hookEnrichment` and `activityEngine.phaseMarkers` in `taskflow.config.json`.
- **N21** — Activity feed aside panel replaces the popup: collapsible, newest-first, 50-item cap, timestamps recomputed on every WebSocket tick. `activityEngine.verbosity` config (`"milestones"` | `"detailed"` | `"both"`) controls which event types are shown.
- **N21** — Master server (`insight-flow-master`) exposes `GET /api/activity/:projectName` returning the last 3 activity events; overview card shows active/idle state driven solely by `--phase done` events.

### Changed

- **N15** — Agent role docs compressed: shared skeleton extracted into `AGENT_PROTOCOL.md`; every role file trimmed to ≤ 40 lines. Saves ~400–600 tokens per slash-command invocation.
- **N16** — Agent prompts are now **technology-agnostic**. Project-specific commands belong in `taskflow.config.json.agents.extend.<agent>` — the canonical extension point.
- **N16** — `GITHUB_PR_API.md` renamed to `PR_API.md`; host-agnostic body with GitHub REST, GitLab REST, and no-CLI fallback examples.
- **N21** — Runtime dependency added: `socket.io ^4.8.x` (replaces hand-rolled WebSocket implementation from 0.4.x). Ships as a transitive dependency — consumers do not need to install it directly.

### Tests

- **N15** — `test/scaffold-and-bundle.test.mjs` covers `create` template scaffold, `review-start` first/Round-N scaffold, `next --with-spec`, `show --summary --spec`, `stats --tokens`.
- **N16** — `test/no-technology-tight.test.mjs` greps every canonical prompt file for forbidden literal-technology patterns. Total suite: **15+ tests pass**.
- **N21** — `test/log-activity.test.mjs` and `test/log-activity-done.test.mjs` cover the `log-activity` subcommand with `phaseMarkers` on/off.

### Docs

- **N16** — `CLAUDE.md` "Extending agents with project-specific commands" section with worked examples (TS+pnpm+GitHub, Python+uv+GitLab, Go+GitHub).
- **N21** — README "Activity feed enrichment" section: free hooks, CLI subcommand, three config toggles (`hookEnrichment`, `phaseMarkers`, `verbosity`), done-event idle convention, master server endpoint.

## [0.4.0] — 2026-05-21

### Breaking changes

- None.

### Features

- **N07** — Zod schema validation on all taskflow storage read/write paths. Invalid task data now throws `TaskflowValidationError` instead of silently corrupting the tracker.
- **N08** — Role definition files (`TASK_*_ROLE.md`) are now bundled inside the package and scaffolded to `.claude/roles/` by `insight-flow init`. No manual copying required.
- **N12** — `agents.extend` in `taskflow.config.json`: inject project-specific rules into built-in agent role files. Re-running `init` replaces (never duplicates) the `## Project Extensions` section.
- **N12** — `agents.custom` in `taskflow.config.json`: register new Claude Code skills from config. Generates `.claude/commands/<name>.md` with `@AGENT_ENFORCEMENT.md` reference and adds rows to CLAUDE.md's skills table.
- **N12** — JSON schema for `taskflow.config.json` shipped at `schema/taskflow.config.schema.json` with `additionalProperties: false` and enum validation on built-in agent names.

### Improvements

- **N05** — Role files migrated out of `scripts/` into the `insight-flow` binary. `scripts/task-tracker.mjs` deleted; the CLI is the single entry point.
- **N06** — `packages/taskflow` is now the single source of truth for all CLI logic. Duplicate code removed from the project root.
- **N09** — Vite UI build standardised; output consistently lands in `dist/ui/`.
- **N10** — Binary path resolution is now project-root relative. `insight-flow` commands work correctly when invoked from any subdirectory of the project.
- **N11** — Agent roles now enforce CLI-only mutations. `gh` and `git` permissions wired into `AGENT_ENFORCEMENT.md` so agents can perform git operations without manual permission prompts.

---

## [0.3.1] and earlier

See git history.
