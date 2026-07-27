// N262 — activity-feed item as a "live stream" timeline row (Lovable design):
// a colored dot on the rail, a status-colored pill (the event kind), a label,
// an optional file/target on a muted second line, and a relative time. The old
// per-branch icon/badge markup is consolidated into describeEvent() so every real
// event kind (Activity / Event / hook / Phase / Skill / Tool / tool default) keeps
// its color + text. Rendered as an <li>; the rail lives on the parent <ol>.
import type { ActivityEvent } from "./activity.js";
import { eventColor, relativeTime } from "./activity.js";
import { hexToRgb } from "./lib.js";
import { tokens } from "./theme.js";

function ProviderBadge({ ev }: { ev: ActivityEvent }) {
  const p = ev.provider;
  if (!p || p === "claude") return null;
  const cls = p === "cursor" ? "activity-badge-provider-cursor" : "activity-badge-provider-other";
  return (
    <span className={`activity-badge ${cls}`} title={`${p} agent`}>
      {p}
    </span>
  );
}

interface EventDescriptor {
  /** Event hex color — drives the dot + pill tint. */
  color: string;
  /** Short kind label shown as the colored pill (e.g. "done", "tool-requested"). */
  pill: string;
  /** Main text next to the pill. */
  label: string;
  /** Optional file path shown muted on a second line. */
  target: string;
}

// N262 — per-tool color for raw tool rows (Read/Edit/Write/Bash), which
// `eventColor` returns muted for. Mirrors the old .activity-icon.<tool> palette so
// the "detailed" verbosity feed stays color-coded instead of monochrome.
function toolColor(tool: string): string {
  const t = tool.toLowerCase();
  if (t === "read" || t === "glob" || t === "grep") return tokens.color.cyan;
  if (t === "edit") return tokens.color.yellow;
  if (t === "write") return tokens.color.purple;
  if (t === "bash") return tokens.color.green;
  return tokens.color.textMuted;
}

// Consolidates the former per-tool branches into one {color, pill, label, target}.
function describeEvent(ev: ActivityEvent): EventDescriptor {
  const color = eventColor(ev);
  const tool = ev.tool || "?";
  const file = ev.file || "";
  const taskId = ev.taskId ? String(ev.taskId) : "";

  if (tool === "Activity") return { color, pill: "activity", label: ev.message || "", target: "" };
  if (tool === "Event") {
    const evtType = ev.action || "event";
    if ((ev.source || "agent") === "hook") {
      const detail = String(ev.toolName || ev.inputSummary || "");
      return { color, pill: evtType, label: detail || taskId, target: file };
    }
    return { color, pill: evtType, label: taskId, target: "" };
  }
  if (tool === "Phase") return { color, pill: ev.action || "milestone", label: ev.message || "", target: "" };
  if (tool === "Skill") return { color, pill: ev.action || "skill", label: `/${ev.skill || "?"}`, target: "" };
  if (tool === "Tool" && ev.label) return { color, pill: "tool", label: ev.label, target: file };
  return { color: toolColor(tool), pill: tool, label: ev.action || "", target: file };
}

/** One live-stream row: rail dot + pill + label + time, and an optional target line. */
export function ActivityItem({ ev }: { ev: ActivityEvent }) {
  const { color, pill, label, target } = describeEvent(ev);
  const rgb = hexToRgb(color);
  return (
    <li className="act-stream-item">
      <span
        className="act-stream-dot"
        aria-hidden="true"
        style={{ background: `rgba(${rgb},0.25)`, borderColor: color }}
      />
      <div className="act-stream-row">
        <ProviderBadge ev={ev} />
        <span
          className="act-stream-pill"
          style={{ borderColor: `rgba(${rgb},0.5)`, background: `rgba(${rgb},0.18)` }}
        >
          {pill}
        </span>
        {label ? <span className="act-stream-label">{label}</span> : null}
        <span className="act-stream-time">{relativeTime(ev.ts)} ago</span>
      </div>
      {target ? <p className="act-stream-target">{target}</p> : null}
    </li>
  );
}
