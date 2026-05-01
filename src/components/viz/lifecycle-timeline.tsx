import { useMemo } from "react";
import type { Task } from "@/lib/task-types";
import { STATUS_COLORS } from "@/lib/task-types";
import { lifecycleSegments } from "@/lib/task-metrics";

interface Props {
  tasks: Task[];
  onSelect: (id: string) => void;
}

function fmtDur(ms: number) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3.6e6) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3.6e6).toFixed(1)}h`;
}

export function LifecycleTimeline({ tasks, onSelect }: Props) {
  const { rows, minT, maxT } = useMemo(() => {
    let minT = Infinity;
    let maxT = -Infinity;
    const rows = tasks.map((t) => {
      const segs = lifecycleSegments(t);
      for (const s of segs) {
        if (s.start < minT) minT = s.start;
        if (s.end > maxT) maxT = s.end;
      }
      return { task: t, segs };
    });
    if (!isFinite(minT)) {
      minT = Date.now();
      maxT = minT + 1;
    }
    if (maxT === minT) maxT = minT + 60_000;
    return { rows, minT, maxT };
  }, [tasks]);

  const span = maxT - minT;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Lifecycle timeline
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {new Date(minT).toLocaleTimeString()} → {new Date(maxT).toLocaleTimeString()}
        </span>
      </div>
      <div className="divide-y divide-border">
        {rows.map(({ task, segs }) => (
          <button
            key={task.id}
            onClick={() => onSelect(task.id)}
            className="grid w-full grid-cols-[120px_1fr] items-center gap-3 px-4 py-2.5 text-left transition hover:bg-accent/30"
          >
            <div className="min-w-0">
              <div className="font-mono text-[11px] text-primary">{task.id}</div>
              <div className="truncate text-[11px] text-muted-foreground">{task.title}</div>
            </div>
            <div className="relative h-6 rounded-md bg-muted/40">
              {segs.map((s, i) => {
                const left = ((s.start - minT) / span) * 100;
                const width = Math.max(((s.end - s.start) / span) * 100, 0.4);
                const color = STATUS_COLORS[s.status] ?? "var(--color-muted-foreground)";
                return (
                  <div
                    key={i}
                    className="group absolute top-0 h-full"
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${s.status} · ${s.by} · ${fmtDur(s.end - s.start)}`}
                  >
                    <div
                      className="h-full w-full rounded-sm transition group-hover:brightness-125"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${color} 60%, transparent)`,
                        borderLeft: `2px solid ${color}`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </button>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
            No tasks match filters
          </div>
        )}
      </div>
    </div>
  );
}
