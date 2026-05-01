import { STATUS_COLORS } from "@/lib/task-types";

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: Props) {
  const color = STATUS_COLORS[status] ?? "var(--color-muted-foreground)";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide ${className}`}
      style={{
        color,
        backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {status}
    </span>
  );
}
