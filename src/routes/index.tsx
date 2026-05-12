import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useTaskStore } from "@/lib/task-store";
import { computeMetrics } from "@/lib/task-metrics";
import { DataLoader } from "@/components/viz/data-loader";
import { MetricsGrid } from "@/components/viz/metrics-grid";
import { LifecycleTimeline } from "@/components/viz/lifecycle-timeline";
import { PipelineKanban } from "@/components/viz/pipeline-kanban";
import { HotspotsCharts } from "@/components/viz/hotspots-charts";
import { TaskDetailSheet } from "@/components/viz/task-detail-sheet";
import { FilterBar, filterTasks } from "@/components/viz/filter-bar";
import { CurrentJobBanner } from "@/components/viz/current-job-banner";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "TaskFlow — AI Agent Lifecycle Dashboard" },
      {
        name: "description",
        content:
          "Visualize AI-driven task lifecycles: pipeline, lifecycle timeline, fix-loop hotspots, and per-task review history.",
      },
    ],
  }),
});

function Dashboard() {
  const tasks = useTaskStore((s) => s.tasks);
  const meta = useTaskStore((s) => s.meta);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [type, setType] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterTasks(tasks, query, status, tag, type),
    [tasks, query, status, tag, type],
  );
  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);
  const selected = useMemo(
    () => tasks.find((t) => t.id === selectedId) ?? null,
    [tasks, selectedId],
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors theme="dark" />
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{
                color: "var(--color-primary)",
                backgroundColor: "color-mix(in oklab, var(--color-primary) 18%, transparent)",
              }}
            >
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-mono text-sm text-foreground">
                taskflow<span className="text-primary">.viz</span>
              </h1>
              <p className="font-mono text-[10px] text-muted-foreground">
                AI agent task lifecycle dashboard
              </p>
            </div>
          </div>
          <DataLoader />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-5 px-5 py-5">
        <CurrentJobBanner
          currentTaskId={meta?.currentTaskId}
          tasks={tasks}
          onOpen={setSelectedId}
        />
        <FilterBar
          tasks={tasks}
          query={query} setQuery={setQuery}
          status={status} setStatus={setStatus}
          tag={tag} setTag={setTag}
          type={type} setType={setType}
        />
        <MetricsGrid m={metrics} />
        <LifecycleTimeline tasks={filtered} onSelect={setSelectedId} />
        <PipelineKanban tasks={filtered} onSelect={setSelectedId} />
        <HotspotsCharts tasks={filtered} />
        <footer className="pt-4 pb-8 text-center font-mono text-[10px] text-muted-foreground">
          Showing {filtered.length} of {tasks.length} tasks · click any task to inspect lifecycle
        </footer>
      </main>

      <TaskDetailSheet task={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
