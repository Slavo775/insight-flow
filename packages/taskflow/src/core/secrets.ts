// N165 — local secrets store for templated install inputs. Values collected at
// install time (e.g. an mcp API key) are persisted here so re-install doesn't
// re-prompt. The file holds real secrets, so it MUST be gitignored — and so must
// `.mcp.json`, which now receives substituted secret values. `ensureGitignored`
// guards both.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";

/** Project-local, gitignored secrets file. */
export const SECRETS_PATH = ".insight-flow/secrets.local.json";

/** Read the stored input values (empty object if absent/unparseable). */
export function readSecrets(projectRoot: string): Record<string, string> {
  const path = join(projectRoot, SECRETS_PATH);
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Merge `values` into the stored secrets (last-writer-wins) and persist. N273 —
 * written atomically (temp + rename, mode 0600) so other local users can't read
 * the keys and a crash mid-write can't truncate the file; and if an existing
 * secrets file fails to parse we THROW rather than silently merging onto `{}`
 * (which would wipe every other stored secret).
 */
export function writeSecrets(projectRoot: string, values: Record<string, string>): void {
  if (!Object.keys(values).length) return;
  const path = join(projectRoot, SECRETS_PATH);
  let current: Record<string, string> = {};
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("not a JSON object");
      }
      current = parsed as Record<string, string>;
    } catch (err) {
      throw new Error(
        `refusing to overwrite a corrupt secrets file (${SECRETS_PATH}): ${(err as Error).message}`,
      );
    }
  }
  const merged = { ...current, ...values };
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + ".tmp-" + process.pid;
  writeFileSync(tmp, JSON.stringify(merged, null, 2) + "\n", { encoding: "utf-8", mode: 0o600 });
  renameSync(tmp, path);
}

/**
 * Ensure `.gitignore` ignores the given patterns (idempotent). Appends a small
 * managed block for any missing pattern. Returns the patterns it added.
 */
export function ensureGitignored(
  projectRoot: string,
  patterns: string[] = [".insight-flow/secrets.local.json", ".mcp.json"],
): string[] {
  const path = join(projectRoot, ".gitignore");
  const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";
  const lines = existing.split("\n").map((l) => l.trim());
  const missing = patterns.filter((p) => !lines.includes(p));
  if (!missing.length) return [];
  const prefix = existing.length && !existing.endsWith("\n") ? "\n" : "";
  const block = `${prefix}\n# insight-flow — local secrets + substituted .mcp.json (do not commit)\n${missing.join("\n")}\n`;
  writeFileSync(path, existing + block, "utf-8");
  return missing;
}

/** Strip the values of known secret inputs from an arbitrary object/string for safe logging. */
export function scrubSecrets<T>(value: T, secretValues: string[]): T {
  const nonEmpty = secretValues.filter((v) => v && v.length > 0);
  if (!nonEmpty.length) return value;
  const redact = (s: string): string => nonEmpty.reduce((acc, v) => acc.split(v).join("***"), s);
  if (typeof value === "string") return redact(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => scrubSecrets(v, secretValues)) as unknown as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>))
      out[k] = scrubSecrets(v, secretValues);
    return out as unknown as T;
  }
  return value;
}
