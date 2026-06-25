---
title: AGENT_NOTIFY.md
sidebar_label: Agent notify
sidebar_position: 15
description: Reference copy of AGENT_NOTIFY.md, generated from the repo root.
---
<!--
  AUTO-GENERATED FILE — DO NOT EDIT.
  Source of truth: AGENT_NOTIFY.md at the repository root.
  Regenerate with: pnpm --dir website sync
-->

> **Reference copy.** Generated from `AGENT_NOTIFY.md` at the repository root.
> Edit the source file, not this copy.
# AGENT_NOTIFY — intentionally blank

Notifications are handled exclusively by Claude Code hook scripts.
Agents must not call `insight-flow notify` or any notification command directly.

To opt in to AI-triggered notifications, configure `agents.extend` in `taskflow.config.json`.
See `packages/taskflow/README.md` — "Notifications" for the full model.
