import type { ActivityEvent, HookStatus } from "./activity.js";
import { activityEmptyStateMessage, shouldShowEvent } from "./activity.js";
import { ActivityItem } from "./ActivityItem.js";

function EmptyState({ hookStatus }: { hookStatus: HookStatus }) {
  const msg = activityEmptyStateMessage(hookStatus);
  if (!msg) return null;
  return (
    <div className="activity-empty-state">
      <strong>{msg.headline}</strong>
      {msg.body}
      {msg.hint ? <div className="hint">{msg.hint}</div> : null}
      {msg.command ? <code>{msg.command}</code> : null}
      {msg.hintAfter ? <div className="hint">{msg.hintAfter}</div> : null}
    </div>
  );
}

// N262 — the Agent Activity pane as a "live stream" timeline (Lovable design):
// a LIVE STREAM header with a pulsing dot + event count, then a vertical rail of
// events (see ActivityItem). Per-event color (eventColor / per-tool) drives the
// dot + pill accent instead of the old full-row tint.
export function ActivityFeed({
  events,
  verbosity,
  hookStatus,
}: {
  events: ActivityEvent[];
  verbosity: string;
  hookStatus: HookStatus;
}) {
  const visible = events.filter((ev) => shouldShowEvent(ev, verbosity));
  return (
    <div className="act-stream-wrap" id="activity-feed">
      <header className="act-stream-head">
        <span className="act-stream-live">
          <span className="act-live-pulse" aria-hidden="true" />
          Live stream
        </span>
        <span className="act-stream-count">
          {visible.length} {visible.length === 1 ? "event" : "events"}
        </span>
      </header>
      {visible.length === 0 ? (
        <EmptyState hookStatus={hookStatus} />
      ) : (
        <ol className="act-stream">
          {visible.map((ev, i) => (
            <ActivityItem key={ev.id || i} ev={ev} />
          ))}
        </ol>
      )}
    </div>
  );
}
