# N04 — Add composed-agent validation note to README

**Type:** feat
**Priority:** low
**Created:** 2026-06-11

## Problem

- The playground README has no record that it is used for composed-agent behavioral validation (N89).

## Goal

1. README.md ends with a "## Composed-agent validation" section containing one note line.

## Scope

### In scope

- `README.md` (playground root) — append one section.

### Out of scope

- Any other file. No config changes.

## Implementation plan

1. **Append section** — add `## Composed-agent validation` with one line noting the N89 composed `task-implement` run date.

## Verification

- `tail README.md` shows the new section.

## Notes

- Created solely as the N89 behavioral-validation target.
