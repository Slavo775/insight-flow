import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import type { EditorProvider, ProviderContext } from "./types.js";
import { generateContextSection, upsertMarkerSection } from "./context.js";
import { isLegacyStub } from "./skills.js";

/**
 * Claude Code provider — writes `.claude/commands/<name>.md` (canonical body
 * verbatim, including `$ARGUMENTS`) and the insight-flow section of `CLAUDE.md`.
 * Output is byte-identical to insight-flow's pre-N75 scaffolding.
 */
export const claudeProvider: EditorProvider = {
  id: "claude",

  detect(cwd: string): boolean {
    return existsSync(resolve(cwd, ".claude"));
  },

  writeSkills(ctx: ProviderContext): void {
    const commandsDir = resolve(ctx.cwd, ".claude", "commands");
    if (!existsSync(commandsDir)) {
      mkdirSync(commandsDir, { recursive: true });
    }
    let created = 0;
    let upgraded = 0;
    let skipped = 0;
    for (const skill of ctx.skills) {
      const dest = resolve(commandsDir, `${basename(skill.name)}.md`);
      const existing = existsSync(dest) ? readFileSync(dest, "utf-8") : null;
      // N275 (review blocker 2) — also overwrite a known LEGACY STUB: it is
      // insight-flow's own former output, not user content, so re-init upgrades
      // it to the @-include form (existing consumers finally get the real role).
      const isUpgrade = existing !== null && isLegacyStub(existing);
      if (existing === null || ctx.force || skill.overwrite || isUpgrade) {
        writeFileSync(dest, skill.body);
        if (isUpgrade) upgraded++;
        else created++;
      } else {
        skipped++;
        // N236 — a same-named file with *different* content is a real conflict;
        // an identical one is just an idempotent re-init and not worth reporting.
        if (existing !== skill.body) {
          ctx.conflicts?.push(`.claude/commands/${basename(skill.name)}.md`);
        }
      }
    }
    if (created > 0) {
      console.log(`[claude] Wrote ${created} skill command(s) to .claude/commands/`);
    }
    if (upgraded > 0) {
      console.log(`[claude] Upgraded ${upgraded} legacy skill command(s) to the @-include form`);
    }
    if (skipped > 0) {
      console.log(`[claude] Skipped ${skipped} existing skill command(s) in .claude/commands/`);
    }
  },

  writeContext(ctx: ProviderContext): void {
    const section = generateContextSection(ctx.config, ctx.skills, { editorLabel: "Claude Code" });
    const action = upsertMarkerSection(resolve(ctx.cwd, "CLAUDE.md"), section);
    console.log(`[claude] ${action} insight-flow section in CLAUDE.md`);
  },
};
