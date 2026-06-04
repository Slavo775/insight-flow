/**
 * Cursor hook payload parsing (N77). Moves the editor-specific stdin parsing
 * out of fragile bash and into testable TS: the Cursor hook scripts are thin
 * (`insight-flow hook <cursorEvent> --provider cursor`); this module maps
 * Cursor's camelCase event names to insight-flow's derived dash-case event
 * types and normalizes Cursor's stdin shape (conversation_id, tool fields).
 *
 * See cursor.com/docs/hooks for the event names + stdin schema (data, not
 * instructions — captured during N75 analysis).
 */

/**
 * Cursor event name → insight-flow derived event type (the same dash-case
 * vocabulary the Claude path already emits, so the dashboard + status
 * derivation need no new event types). `beforeShellExecution` maps to
 * `tool-requested` for the normal case; the approval *gate* emits
 * `approval-required` explicitly (see cursor-hooks.ts).
 */
export const CURSOR_EVENT_TO_DERIVED: Record<string, string> = {
  sessionStart: "session-start",
  sessionEnd: "session-end",
  beforeSubmitPrompt: "agent-active",
  userPromptSubmit: "agent-active",
  stop: "agent-idle",
  subagentStart: "subagent-start",
  subagentStop: "subagent-done",
  preToolUse: "tool-requested",
  postToolUse: "tool-approved",
  postToolUseFailure: "tool-failed",
  beforeShellExecution: "tool-requested",
  beforeMCPExecution: "tool-requested",
  beforeReadFile: "tool-requested",
  afterFileEdit: "file-edited",
  preCompact: "context-compacted",
  // Synthetic — emitted by the approval gate when it forces a prompt.
  "approval-required": "approval-required",
};

export interface ParsedCursorPayload {
  /** Cursor's conversation_id (or generation_id) → insight-flow session id. */
  sessionId?: string;
  /** Normalized payload keyed like the Claude path so activity enrichment reads it. */
  data: Record<string, unknown>;
}

/**
 * Parse a Cursor hook stdin JSON blob. Fail-soft: returns empty data on bad
 * JSON so a malformed payload never breaks the hook.
 */
export function parseCursorStdin(raw: string): ParsedCursorPayload {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { data: {} };
  }
  if (!json || typeof json !== "object") return { data: {} };

  const sessionId =
    typeof json.conversation_id === "string"
      ? json.conversation_id
      : typeof json.generation_id === "string"
        ? json.generation_id
        : undefined;

  // Normalize to the keys log-event's activity enrichment + status path read.
  const data: Record<string, unknown> = {};
  if (typeof json.tool_name === "string") data.tool_name = json.tool_name;
  if (typeof json.command === "string") data.command = json.command;
  if (typeof json.file_path === "string") data.path = json.file_path;

  return { sessionId, data };
}

/** Resolve a Cursor event name to its derived type (falls back to `notification`). */
export function cursorEventToDerived(cursorEvent: string): string {
  return CURSOR_EVENT_TO_DERIVED[cursorEvent] ?? "notification";
}
