import type { TaskflowConfig, CustomAgent } from "../../../core/types.js";

/**
 * One agent skill in its canonical ("claude") form. `body` is the exact text
 * insight-flow has always written to `.claude/commands/<name>.md` — it may
 * contain `@`-includes and a trailing `$ARGUMENTS` placeholder. Editor
 * providers render this single source into their own on-disk shape (the
 * `claude` provider writes it verbatim; the `cursor` provider strips the
 * Claude-only bits and wraps it in SKILL.md frontmatter).
 */
export interface SkillDef {
  /** kebab-case name: the `.claude` command filename stem and the `.cursor` skill folder name. */
  name: string;
  /** Canonical body (claude form). */
  body: string;
  /** One-line summary; used for Cursor SKILL.md `description` + the context-section table. */
  description: string;
  /**
   * When true, this skill is rewritten on every `init` even without `--force`
   * (its content is derived from config, so a plain re-init should refresh it).
   * Built-in skills leave this unset (write-if-missing, `--force` to overwrite);
   * config-driven custom agents set it true.
   */
  overwrite?: boolean;
}

/** Everything a provider needs to scaffold one editor. */
export interface ProviderContext {
  cwd: string;
  config: TaskflowConfig;
  /** Built-in skills + any custom agents, already composed into canonical form. */
  skills: SkillDef[];
  customAgents: CustomAgent[];
  /** When true, overwrite existing provider files instead of skipping them. */
  force: boolean;
  /**
   * N236 — collector: provider pushes the name of any file it skipped because an
   * existing one has *different* content (a real name conflict, not an identical
   * re-init). The init caller surfaces these so an in-place init reports what it
   * kept instead of silently under-installing.
   */
  conflicts?: string[];
}

/**
 * An editor target for init scaffolding. Adding a new editor (e.g. `openai`)
 * means implementing this interface and registering it in `providers/index.ts`
 * — no changes to the CLI engine or the canonical skill source.
 */
export interface EditorProvider {
  /** Stable identifier, also accepted by `--editor`. */
  id: string;
  /** Is this editor already present in `cwd`? Used for auto-detection. */
  detect(cwd: string): boolean;
  /** Write this editor's skill/agent files. */
  writeSkills(ctx: ProviderContext): void;
  /** Write this editor's context/rules file (the insight-flow marker section). */
  writeContext(ctx: ProviderContext): void;
  /**
   * Optional: write this editor's lifecycle hooks (live dashboard + notifications).
   * Claude installs hooks via its own installers in `initProject`; the cursor
   * provider implements this (N77). Editors without hook support omit it.
   */
  writeHooks?(ctx: ProviderContext): void;
}
