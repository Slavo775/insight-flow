import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import type { EditorProvider, ProviderContext, SkillDef } from "./types.js";
import { generateContextSection, upsertMarkerSection } from "./context.js";
import { toCursorBody } from "./skills.js";

/**
 * Render one Cursor skill file: YAML frontmatter (`name`/`description`, per
 * cursor.com/docs/skills) followed by the canonical body with Claude-only bits
 * removed. The description is double-quoted so colons/slashes stay valid YAML.
 */
function renderCursorSkill(skill: SkillDef): string {
  const description = skill.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const frontmatter = `---\nname: ${skill.name}\ndescription: "${description}"\n---\n\n`;
  return frontmatter + toCursorBody(skill.body);
}

/**
 * Cursor provider — writes `.cursor/skills/<name>/SKILL.md` (one folder per
 * skill) and the insight-flow section of the root `AGENTS.md` (the cross-agent
 * rules file Cursor reads; verified against cursor.com/docs/rules). N75 Phase 1
 * scaffolds skills + context only — hooks are deferred to a Phase-2 task.
 */
export const cursorProvider: EditorProvider = {
  id: "cursor",

  detect(cwd: string): boolean {
    return existsSync(resolve(cwd, ".cursor"));
  },

  writeSkills(ctx: ProviderContext): void {
    const skillsRoot = resolve(ctx.cwd, ".cursor", "skills");
    let created = 0;
    let skipped = 0;
    for (const skill of ctx.skills) {
      const skillDir = resolve(skillsRoot, basename(skill.name));
      const dest = resolve(skillDir, "SKILL.md");
      if (!existsSync(dest) || ctx.force || skill.overwrite) {
        if (!existsSync(skillDir)) {
          mkdirSync(skillDir, { recursive: true });
        }
        writeFileSync(dest, renderCursorSkill(skill));
        created++;
      } else {
        skipped++;
      }
    }
    if (created > 0) {
      console.log(`[cursor] Wrote ${created} skill(s) to .cursor/skills/<name>/SKILL.md`);
    }
    if (skipped > 0) {
      console.log(`[cursor] Skipped ${skipped} existing skill(s) in .cursor/skills/`);
    }
  },

  writeContext(ctx: ProviderContext): void {
    const section = generateContextSection(ctx.config, ctx.skills, { editorLabel: "Cursor" });
    const action = upsertMarkerSection(resolve(ctx.cwd, "AGENTS.md"), section);
    console.log(`[cursor] ${action} insight-flow section in AGENTS.md`);
  },
};
