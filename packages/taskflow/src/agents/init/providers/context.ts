import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { TaskflowConfig } from "../../../core/types.js";
import type { SkillDef } from "./types.js";

const MARKER = "<!-- taskflow:start -->";
const MARKER_END = "<!-- taskflow:end -->";

export type MarkerSectionAction = "created" | "updated" | "appended";

/**
 * Idempotently write `section` between the insight-flow markers in `filePath`.
 * Creates the file if missing, replaces the existing marker block if present,
 * or appends the block otherwise. Lifted from init's CLAUDE.md logic so both
 * `CLAUDE.md` (claude) and `AGENTS.md` (cursor) share one implementation.
 */
export function upsertMarkerSection(filePath: string, section: string): MarkerSectionAction {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, MARKER + "\n" + section + MARKER_END + "\n");
    return "created";
  }
  const existing = readFileSync(filePath, "utf-8");
  if (existing.includes(MARKER)) {
    const before = existing.substring(0, existing.indexOf(MARKER));
    const afterIdx = existing.indexOf(MARKER_END);
    const after = afterIdx >= 0 ? existing.substring(afterIdx + MARKER_END.length) : "";
    writeFileSync(filePath, before + MARKER + "\n" + section + MARKER_END + after);
    return "updated";
  }
  writeFileSync(
    filePath,
    existing.trimEnd() + "\n\n" + MARKER + "\n" + section + MARKER_END + "\n",
  );
  return "appended";
}

/**
 * Build the insight-flow context section (the body that goes between the
 * markers in CLAUDE.md / AGENTS.md). The slash-command table is rendered from
 * the canonical skill list so descriptions stay single-sourced; `editorLabel`
 * only changes the table heading ("Claude Code Skills" vs "Cursor Skills").
 */
export function generateContextSection(
  config: TaskflowConfig,
  skills: SkillDef[],
  opts: { editorLabel?: string } = {},
): string {
  const editorLabel = opts.editorLabel ?? "Claude Code";
  const rows = skills.map((s) => `| \`/${s.name}\` | ${s.description} |`).join("\n");

  return `## insight-flow

This project uses **insight-flow** for AI-assisted task lifecycle management.

## Task System

Tasks are tracked in \`${config.workDir}/\` as sharded JSON files. Use the insight-flow CLI or slash commands to manage them.

## Commands

\`\`\`bash
insight-flow create --title "..." --type feat|fix|rework --priority high|medium|low --tags a,b
insight-flow current                    # Show active task
insight-flow list                       # List all tasks
insight-flow stats                      # Aggregate statistics
insight-flow next                       # Pick next actionable task
insight-flow                            # Launch dashboard at http://localhost:${config.server.port}
\`\`\`

## Slash Commands (${editorLabel} Skills)

| Command | Purpose |
|---------|---------|
${rows}

## Task Lifecycle

\`\`\`
ready -> in-progress -> implemented -> reviewing -> approved -> pushed -> merged
                                          |
                                     fix-needed -> fixing -> fixed -> (re-review)
\`\`\`

## Conventions

- Task IDs: N00, N01, N02, ...
- Task folders: \`${config.workDir}/Nxx-short-title/\` containing TASK.md + CHECKLIST.md
- Branches: \`<type>/Nxx-short-title\` (e.g., \`feat/N00-add-auth\`)
- Commits: conventional commits (feat, fix, refactor, docs, chore, etc.)
- Tracker commands: \`insight-flow <command>\` (run \`insight-flow help\` for the full list)
`;
}
