// N255 — activity-feed item as JSX. Was ~200 lines of escaped HTML-string
// concatenation injected via `dangerouslySetInnerHTML` (activity.ts); now plain
// JSX, so React escapes every interpolated value and the manual `escHtml` is
// gone. The class names, icons, and structure match the former string renderer
// exactly so the feed renders identically.
import type { ActivityEvent } from "./activity.js";
import { relativeTime } from "./activity.js";

const flexStyle = { flex: 1, minWidth: 0 } as const;

function toolIcon(tool?: string): { cls: string; icon: string } {
  const t = (tool || "").toLowerCase();
  if (t === "read" || t === "glob" || t === "grep") return { cls: "read", icon: "R" };
  if (t === "edit") return { cls: "edit", icon: "E" };
  if (t === "write") return { cls: "write", icon: "W" };
  if (t === "bash") return { cls: "bash", icon: "$" };
  return { cls: "other", icon: "?" };
}

function ProviderBadge({ ev }: { ev: ActivityEvent }) {
  const p = ev.provider;
  if (!p || p === "claude") return null;
  const cls = p === "cursor" ? "activity-badge-provider-cursor" : "activity-badge-provider-other";
  return (
    <>
      <span className={`activity-badge ${cls}`} title={`${p} agent`}>
        {p}
      </span>{" "}
    </>
  );
}

function Time({ ts }: { ts: string }) {
  return <span className="activity-time">{relativeTime(ts)}</span>;
}

interface HookVisual {
  iconCls: string;
  badgeCls: string;
  icon: string;
  detail: string;
}

function hookVisual(evtType: string, ev: ActivityEvent): HookVisual {
  const v = (iconCls: string, icon: string, detail = ""): HookVisual => ({
    iconCls,
    badgeCls: iconCls,
    icon,
    detail,
  });
  if (evtType === "approval-required") {
    const d =
      ev.toolName || ev.inputSummary
        ? String(ev.toolName || ev.inputSummary || "").slice(0, 40)
        : "";
    return v("hook-amber", "⚠", d);
  }
  if (evtType === "approval-denied" || evtType === "tool-blocked")
    return v("hook-red", "✕", ev.toolName ? String(ev.toolName) : "");
  if (evtType === "approval-granted" || evtType === "tool-approved")
    return v("hook-green", "✓", ev.toolName ? String(ev.toolName) : "");
  if (evtType === "tool-requested" || evtType === "tool-failed") {
    const failed = evtType === "tool-failed";
    return v(
      failed ? "hook-red" : "hook-blue",
      failed ? "✕" : "▶",
      ev.toolName ? String(ev.toolName) : "",
    );
  }
  if (evtType === "session-start" || evtType === "session-end") return v("hook-muted", "◯");
  if (evtType === "agent-active")
    return v("hook-blue", "●", ev.promptPreview ? String(ev.promptPreview) : "");
  if (evtType === "agent-idle") return v("hook-muted", "○");
  if (evtType === "turn-failed")
    return v("hook-red", "⚠", ev.errorType ? String(ev.errorType) : "");
  if (evtType === "subagent-start" || evtType === "subagent-done")
    return v("hook-purple", "✦", ev.agentType ? String(ev.agentType) : "");
  if (evtType === "file-written" || evtType === "file-edited")
    return v("hook-blue", "✏", ev.file ? String(ev.file).split("/").slice(-2).join("/") : "");
  if (evtType === "context-compacted") return v("hook-muted", "↯");
  return v("hook-muted", "●");
}

function HookEvent({ ev, evtType, ts }: { ev: ActivityEvent; evtType: string; ts: string }) {
  const { iconCls, badgeCls, icon, detail } = hookVisual(evtType, ev);
  return (
    <>
      <div className={`activity-icon ${iconCls}`}>{icon}</div>
      <div style={flexStyle}>
        <ProviderBadge ev={ev} />
        <span className={`activity-badge activity-badge-${badgeCls}`}>{evtType}</span>
        {detail ? (
          <>
            {" "}
            <span className="activity-file-muted">{detail}</span>
          </>
        ) : null}
        {ev.taskId ? (
          <>
            {" "}
            <span className="activity-file-muted" style={{ opacity: 0.6 }}>
              {String(ev.taskId)}
            </span>
          </>
        ) : null}
      </div>
      <Time ts={ts} />
    </>
  );
}

/** One activity-feed item's inner content (the wrapping `.act-item` div, with its
 *  background, stays in ActivityFeed). Mirrors the former renderActivityItemHtml. */
export function ActivityItem({ ev }: { ev: ActivityEvent }) {
  const tool = ev.tool || "?";
  const ts = ev.ts || "";

  if (tool === "Activity") {
    return (
      <>
        <div className="activity-icon phase">{"◆"}</div>
        <div style={flexStyle}>
          <ProviderBadge ev={ev} />
          <span className="activity-phase-msg">{ev.message || ""}</span>
        </div>
        <Time ts={ts} />
      </>
    );
  }

  if (tool === "Event") {
    const evtType = ev.action || "event";
    if ((ev.source || "agent") === "hook") return <HookEvent ev={ev} evtType={evtType} ts={ts} />;
    const isMandatory = evtType === "start" || evtType === "done";
    const evtIconClass = isMandatory ? "event-mandatory" : "event-optional";
    const evtBadgeClass = isMandatory
      ? "activity-badge-event-mandatory"
      : "activity-badge-event-optional";
    const evtIcon = evtType === "done" ? "✓" : evtType === "start" ? "▶" : "●";
    return (
      <>
        <div className={`activity-icon ${evtIconClass}`}>{evtIcon}</div>
        <div style={flexStyle}>
          <ProviderBadge ev={ev} />
          <span className={`activity-badge ${evtBadgeClass}`}>{evtType}</span>
          {ev.taskId ? (
            <>
              {" "}
              <span className="activity-file-muted">{ev.taskId}</span>
            </>
          ) : null}
        </div>
        <Time ts={ts} />
      </>
    );
  }

  if (tool === "Phase") {
    const phaseAction = ev.action || "milestone";
    return (
      <>
        <div className="activity-icon phase">{"◆"}</div>
        <div style={flexStyle}>
          <ProviderBadge ev={ev} />
          <span className="activity-badge activity-badge-phase">{phaseAction}</span>{" "}
          <span className="activity-phase-msg">{ev.message || phaseAction}</span>
        </div>
        <Time ts={ts} />
      </>
    );
  }

  if (tool === "Skill") {
    return (
      <>
        <div className="activity-icon skill">{"⚡"}</div>
        <div style={flexStyle}>
          <ProviderBadge ev={ev} />
          <span className="activity-badge activity-badge-skill">{ev.action || ""}</span>{" "}
          <span className="activity-tool">/{ev.skill || "?"}</span>
        </div>
        <Time ts={ts} />
      </>
    );
  }

  if (tool === "Tool" && ev.label) {
    return (
      <>
        <div className="activity-icon bash">$</div>
        <div style={flexStyle}>
          <ProviderBadge ev={ev} />
          <span className="activity-tool">{ev.label}</span>
          {ev.file ? <div className="activity-file-muted">{ev.file.slice(0, 80)}</div> : null}
        </div>
        <Time ts={ts} />
      </>
    );
  }

  const icon = toolIcon(tool);
  return (
    <>
      <div className={`activity-icon ${icon.cls}`}>{icon.icon}</div>
      <div style={flexStyle}>
        <ProviderBadge ev={ev} />
        <span className="activity-tool">{tool}</span>{" "}
        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{ev.action || ""}</span>
        {ev.file ? <div className="activity-file">{ev.file}</div> : null}
      </div>
      <Time ts={ts} />
    </>
  );
}
