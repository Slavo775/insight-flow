// N156 — single source of truth for the cross-cutting baseline modules that are
// LOCKED (read-only, never ejectable): the N98 security/enforcement/protocol
// trio. zod- and fs-free so BOTH the server (agents/user-registry) and the
// client bundle (dashboard) import the same set without drift (was duplicated).
export const LOCKED_MODULE_IDS = new Set(["security", "enforcement", "protocol"]);
