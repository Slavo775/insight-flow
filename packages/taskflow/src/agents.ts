import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AgentExtensions } from "./types.js";

export const AGENT_ROLE_FILE_MAP: Record<string, string> = {
  "task-analyze": "TASK_ANALYZER_ROLE.md",
  taskmaster: "TASKMASTER_ROLE.md",
  "task-implement": "TASK_IMPLEMENTER_ROLE.md",
  "task-review": "TASK_REVIEWER_ROLE.md",
  "task-review-fix": "TASK_REVIEW_FIXER_ROLE.md",
  "task-human-review": "TASK_HUMAN_REVIEW_ROLE.md",
  "task-git": "TASK_GIT_ROLE.md",
  "task-incident": "TASK_INCIDENT_ROLE.md",
  "task-request-changes": "TASK_REQUEST_CHANGES_ROLE.md",
  "taskmaster-change": "TASKMASTER_CHANGE_ROLE.md",
};

const EXT_START = "<!-- taskflow:extensions:start -->";
const EXT_END = "<!-- taskflow:extensions:end -->";

export function applyAgentExtensions(rolesDir: string, extend: AgentExtensions): void {
  for (const [agentName, rules] of Object.entries(extend)) {
    if (!rules.length) continue;
    const fileName = AGENT_ROLE_FILE_MAP[agentName];
    if (!fileName) {
      console.warn(`Unknown agent name '${agentName}' in agents.extend — skipping.`);
      continue;
    }
    const filePath = resolve(rolesDir, fileName);
    if (!existsSync(filePath)) {
      console.warn(`Role file not found for '${agentName}' at ${filePath} — skipping.`);
      continue;
    }

    let content = readFileSync(filePath, "utf-8");
    const section =
      EXT_START +
      "\n## Project Extensions\n\n" +
      rules.map((r) => `- ${r}`).join("\n") +
      "\n" +
      EXT_END;

    if (content.includes(EXT_START)) {
      const before = content.substring(0, content.indexOf(EXT_START));
      const afterIdx = content.indexOf(EXT_END);
      const after = afterIdx >= 0 ? content.substring(afterIdx + EXT_END.length) : "";
      content = before + section + after;
    } else {
      content = content.trimEnd() + "\n\n" + section + "\n";
    }

    writeFileSync(filePath, content);
    console.log(`Applied extensions to ${agentName} (${fileName})`);
  }
}
