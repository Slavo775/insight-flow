import type { ActivityEvent, HookStatus } from "./activity.js";
import { activityEmptyStateMessage, itemBackground, shouldShowEvent } from "./activity.js";
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
  if (visible.length === 0) {
    return (
      <div className="activity-feed" id="activity-feed">
        <EmptyState hookStatus={hookStatus} />
      </div>
    );
  }
  return (
    <div className="activity-feed" id="activity-feed">
      {visible.map((ev, i) => (
        <div className="act-item" key={ev.id || i} style={itemBackground(ev)}>
          <ActivityItem ev={ev} />
        </div>
      ))}
    </div>
  );
}
