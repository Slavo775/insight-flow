// N120/N142 — the client mirror of the server's locked tier
// (user-registry.ts `isLockedModule`). Kept on the client so the bundle never
// pulls node:fs. Shared by ModuleForm (read-only guard) and ModuleDetail
// (locked badge + Edit-link gate) so the two surfaces can't drift.
//
// Locked by id (the cross-cutting baseline trio) OR by kind: a SHIPPED
// (non-custom) `status-transition` / `handover` module is read-only; custom
// (`custom:`) modules of those kinds are full CRUD.
// N156 — shared with the server (agents/user-registry) via core/locked.ts.
export { LOCKED_MODULE_IDS } from "../../core/locked.js";
import { LOCKED_MODULE_IDS } from "../../core/locked.js";

export function isLockedModuleClient(m: { id: string; kind: string }): boolean {
  if (LOCKED_MODULE_IDS.has(m.id)) return true;
  const lockedKind = m.kind === "status-transition" || m.kind === "handover";
  return lockedKind && !m.id.startsWith("custom:");
}
