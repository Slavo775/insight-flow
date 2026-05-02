import type { ComputedMetrics } from "@/lib/task-metrics";
import { GitMerge, Loader2, AlertTriangle, RotateCw, Clock, GitCommit, Bot, User, Siren } from "lucide-react";

interface Props {
  m: ComputedMetrics;
}

function Card({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-mono text-2xl text-foreground">{value}</div>
          {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{
            color: accent ?? "var(--color-primary)",
            backgroundColor: `color-mix(in oklab, ${accent ?? "var(--color-primary)"} 14%, transparent)`,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function MetricsGrid({ m }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <Card label="Total tasks" value={String(m.total)} icon={<Database />} />
      <Card label="Merged" value={String(m.merged)} icon={<GitMerge className="h-4 w-4" />} accent="var(--color-status-merged)" />
      <Card label="In flight" value={String(m.inFlight)} icon={<Loader2 className="h-4 w-4" />} accent="var(--color-status-progress)" />
      <Card
        label="Fix-needed rate"
        value={`${(m.fixRate * 100).toFixed(0)}%`}
        hint={`${m.fixNeededCount} rejections`}
        icon={<AlertTriangle className="h-4 w-4" />}
        accent="var(--color-status-fix)"
      />
      <Card
        label="Avg review rounds"
        value={m.avgReviewRounds.toFixed(1)}
        icon={<RotateCw className="h-4 w-4" />}
        accent="var(--color-status-review)"
      />
      <Card
        label="Avg cycle"
        value={`${m.avgCycleHours.toFixed(1)}h`}
        hint="created → merged"
        icon={<Clock className="h-4 w-4" />}
      />
      <Card
        label="AI / Human ✓"
        value={`${m.aiApprovals} / ${m.humanApprovals}`}
        hint={`${m.totalCommits} commits`}
        icon={
          <span className="flex items-center gap-0.5">
            <Bot className="h-3 w-3" />
            <User className="h-3 w-3" />
          </span>
        }
        accent="var(--color-status-approved)"
      />
    </div>
  );
}

function Database({ className = "" }: { className?: string }) {
  return <GitCommit className={className || "h-4 w-4"} />;
}
