import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";

/**
 * N274 (A13) — `events.hooks` in `taskflow.config.json` are arbitrary shell
 * commands run via `sh -c` whenever an agent calls `insight-flow log-event`.
 * Because the config is committed, cloning a repo could run attacker commands
 * with no consent. These commands now run ONLY after the human has approved the
 * exact hook set for that project via `insight-flow trust-hooks`. Approval is a
 * sha256 of the hook map stored per project root under `~/.insight-flow`; any
 * edit to the hooks invalidates it, so a changed config must be re-approved.
 */
const STORE = resolve(homedir(), ".insight-flow", "trusted-hooks.json");

export type HooksMap = Record<string, string[]>;

/** A stable sha256 of a project's events.hooks map (key/array order independent). */
export function hooksHash(hooks: HooksMap): string {
  const stable: HooksMap = {};
  for (const k of Object.keys(hooks).sort()) stable[k] = [...(hooks[k] ?? [])];
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

function readStore(): Record<string, string> {
  if (!existsSync(STORE)) return {};
  try {
    const parsed = JSON.parse(readFileSync(STORE, "utf-8")) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** True if these exact hooks have been approved for this project. */
export function isHooksTrusted(projectRoot: string, hooks: HooksMap): boolean {
  return readStore()[projectRoot] === hooksHash(hooks);
}

/** Record approval of the given hooks for this project (atomic write). */
export function trustHooks(projectRoot: string, hooks: HooksMap): void {
  const store = readStore();
  store[projectRoot] = hooksHash(hooks);
  mkdirSync(dirname(STORE), { recursive: true });
  const tmp = STORE + ".tmp-" + process.pid;
  writeFileSync(tmp, JSON.stringify(store, null, 2) + "\n", "utf-8");
  renameSync(tmp, STORE);
}
