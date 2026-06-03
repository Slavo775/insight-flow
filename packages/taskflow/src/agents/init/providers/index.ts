import type { EditorProvider } from "./types.js";
import { claudeProvider } from "./claude.js";
import { cursorProvider } from "./cursor.js";

export type { EditorProvider, ProviderContext, SkillDef } from "./types.js";
export { buildSkillList } from "./skills.js";

/** Registry of known editor providers. Add a new editor by registering it here. */
export const PROVIDERS: readonly EditorProvider[] = [claudeProvider, cursorProvider];

const VALID_EDITORS = new Set([...PROVIDERS.map((p) => p.id), "all"]);

/**
 * Resolve which providers to scaffold.
 *
 * - `--editor all` → every registered provider.
 * - `--editor <id>` → that provider (errors on an unknown id).
 * - no flag → auto-detect by which editor dirs already exist (`.claude` /
 *   `.cursor`); when none are present, fall back to `claude` for backward
 *   compatibility with insight-flow's Claude-first history.
 */
export function selectProviders(cwd: string, editor?: string): EditorProvider[] {
  if (editor && !VALID_EDITORS.has(editor)) {
    const ids = PROVIDERS.map((p) => p.id).join(" | ");
    throw new Error(`Unknown --editor "${editor}". Use ${ids} | all.`);
  }
  if (editor === "all") {
    return [...PROVIDERS];
  }
  if (editor) {
    return PROVIDERS.filter((p) => p.id === editor);
  }
  const detected = PROVIDERS.filter((p) => p.detect(cwd));
  return detected.length > 0 ? detected : [claudeProvider];
}
