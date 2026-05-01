import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Task } from "@/lib/task-types";
import {
  fileHotspots,
  tagDistribution,
  agentActivity,
  reviewRoundsPerTask,
} from "@/lib/task-metrics";

interface Props {
  tasks: Task[];
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-72 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="flex-1 p-3">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--color-popover-foreground)",
};

export function HotspotsCharts({ tasks }: Props) {
  const files = useMemo(() => fileHotspots(tasks, 8), [tasks]);
  const tags = useMemo(() => tagDistribution(tasks), [tasks]);
  const agents = useMemo(() => agentActivity(tasks), [tasks]);
  const rounds = useMemo(() => reviewRoundsPerTask(tasks), [tasks]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Panel title="Review rounds per task (red = fix-needed)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rounds} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey="id" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-accent)", opacity: 0.3 }} />
            <Bar dataKey="rounds" radius={[3, 3, 0, 0]}>
              {rounds.map((r, i) => (
                <Cell
                  key={i}
                  fill={
                    r.fixNeeded > 0
                      ? "var(--color-status-fix)"
                      : "var(--color-status-merged)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Most-changed files (across tasks)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={files}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
            <YAxis
              type="category"
              dataKey="file"
              width={220}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)", fontFamily: "var(--font-mono)" }}
              tickFormatter={(v: string) => (v.length > 32 ? "…" + v.slice(-31) : v)}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-accent)", opacity: 0.3 }} />
            <Bar dataKey="count" fill="var(--color-chart-1)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Tag / area distribution">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={tags} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey="tag" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-accent)", opacity: 0.3 }} />
            <Bar dataKey="count" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Agent activity (status transitions logged)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={agents}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
            <YAxis
              type="category"
              dataKey="agent"
              width={140}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)", fontFamily: "var(--font-mono)" }}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-accent)", opacity: 0.3 }} />
            <Bar dataKey="actions" fill="var(--color-chart-4)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
