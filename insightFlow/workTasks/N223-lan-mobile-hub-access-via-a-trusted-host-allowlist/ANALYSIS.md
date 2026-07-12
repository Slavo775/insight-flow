# N223 — LAN/mobile hub access via a trusted-host allowlist — Analysis

**Created:** 2026-07-12
**Author:** task-analyze

## Problem framing

Surfaced during live mobile testing of the N212–N222 PWA hub: opening the hub on a phone via the machine's LAN IP loads the overview but 403s the whole control-plane (Start / New project / refresh / fs-list / register). Root cause is N221's `isTrustedLocalRequest`, which (correctly, for anti–DNS-rebinding + CSRF) only trusts loopback `Host`/`Origin`. The LAN IP is non-loopback, so the guard rejects it. The **cause** is that the guard has no way to express "this LAN host is mine and trusted" — the fix is an explicit opt-in allowlist, not weakening the default.

## Goal

- Let the user opt specific hosts (their LAN IP/hostname) into the trusted set so the mobile PWA control-plane works, without weakening the secure default or reopening rebinding/cross-origin attacks.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — `INSIGHT_FLOW_TRUSTED_HOSTS` env allowlist (extend Host+Origin trust) | Explicit opt-in; default stays localhost-only; bounded, auditable; no new remote surface (attacker can't forge Host to a specific LAN IP, cross-origin Origin still rejected) | User must set the env + know their IP | S |
| B — Auto-trust the machine's own LAN IPs | Zero config | Implicitly trusts anything that can reach the port on any interface the server binds — a silent widening; violates "explicit trust" | S |
| C — Drop the Host/Origin guard when a `--lan` flag is passed | Simple | Reopens DNS-rebinding for the whole session; too blunt | S |
| D — Add real auth (token in URL/header) for the hub | Strongest | Big scope; changes the whole UX; overkill for a personal-LAN tool | L |

## Decision

- Chosen option: **A** (confirmed with the user via AskUserQuestion — "Add the trusted-host allowlist first, then document a working mobile flow").
- Rationale: A is the minimal, explicit, and safe widening. Trust is opt-in and named; loopback stays always-trusted; the Origin gate still blocks cross-origin attackers and rebinding still fails because the rebound `Host` is the attacker's hostname, not the allowlisted IP. B/C widen implicitly or entirely and are unsafe; D is disproportionate for a single-user LAN tool (the trust boundary — "anyone on your LAN who reaches the port has hub control" — is documented in N224).

## Open questions

- `[non-blocking]` Accept `host:port` or bare host in the env? Yes — normalize via `headerHost` so both work; port isn't matched (the origin's port is implicit).
- `[non-blocking]` Should `/api/register` (project→master, server-to-server) also honor the allowlist? It already passes today (Node fetch, loopback Host, no Origin); the allowlist only *adds* trusted hosts, so no change needed there.
- `[non-blocking]` Wildcards / CIDR? Out of scope — exact hosts only; revisit if requested.

## Sources

- None — self-contained (code read: `master/server.ts` `isTrustedLocalRequest`/`headerHost`/`isLoopbackHost`; live repro of the LAN 403 during mobile testing on 2026-07-12).

## Handoff brief

Title: LAN/mobile hub access via a trusted-host allowlist · type: feat · priority: medium. Add an opt-in `INSIGHT_FLOW_TRUSTED_HOSTS` env that extends `isTrustedLocalRequest` (Host + Origin checks) beyond loopback to explicitly-named hosts/IPs, so the hub's PWA control-plane (Start / New project / refresh) works over the LAN / on a phone. Default stays localhost-only; no rebinding/cross-origin regression. Master logs the LAN URL on start. Security-reviewed. Prereq for the N224 docs.
