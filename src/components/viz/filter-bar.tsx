import { useMemo } from "react";
import { Search, X, Tag as TagIcon } from "lucide-react";
import type { Task } from "@/lib/task-types";

export type StatusGroup = "all" | "active" | "review" | "fix" | "done" | "merged";

const GROUPS: { key: StatusGroup; label: string; matches: (s: string) => boolean }[] = [
  { key: "all", label: "All", matches: () => true },
  { key: "active", label: "Active", matches: (s) => ["ready", "in-progress", "implemented"].includes(s) },
  { key: "review", label: "Review", matches: (s) => s === "reviewing" },
  { key: "fix", label: "Fix needed", matches: (s) => ["fix-needed", "fixing", "fixed"].includes(s) },
  { key: "done", label: "Done", matches: (s) => ["approved", "pushed", "merged"].includes(s) },
  { key: "merged", label: "Merged", matches: (s) => s === "merged" },
];

interface Props {
  tasks: Task[];
  query: string;
  setQuery: (s: string) => void;
  status: string;
  setStatus: (s: string) => void;
  group: StatusGroup;
  setGroup: (g: StatusGroup) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  type: string;
  setType: (s: string) => void;
}

export function FilterBar({
  tasks, query, setQuery, status, setStatus, group, setGroup, tags, setTags, type, setType,
}: Props) {
  const allTags = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => t.tags.forEach((tg) => s.add(tg)));
    return [...s].sort();
  }, [tasks]);
  const allStatuses = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => s.add(t.status as string));
    return [...s].sort();
  }, [tasks]);

  const select =
    "rounded-md border border-border bg-card px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  const toggleTag = (t: string) => {
    setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  };

  const hasFilters = query || status || group !== "all" || tags.length > 0 || type;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, id, tag, file, commit…"
            className="w-full rounded-md border border-border bg-card py-1.5 pl-8 pr-8 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select className={select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">any status</option>
          {allStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className={select} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">any type</option>
          <option value="fix">fix</option>
          <option value="feat">feat</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setQuery(""); setStatus(""); setGroup("all"); setTags([]); setType("");
            }}
            className="rounded-md border border-border bg-card px-2 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">status</span>
        {GROUPS.map((g) => {
          const active = group === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setGroup(g.key)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            <TagIcon className="h-3 w-3" /> tags
          </span>
          {allTags.map((t) => {
            const active = tags.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                #{t}
              </button>
            );
          })}
          {tags.length > 0 && (
            <button
              onClick={() => setTags([])}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
            >
              clear tags
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function filterTasks(
  tasks: Task[],
  query: string,
  status: string,
  group: StatusGroup,
  tags: string[],
  type: string,
): Task[] {
  const q = query.trim().toLowerCase();
  const groupDef = GROUPS.find((g) => g.key === group) ?? GROUPS[0];
  return tasks.filter((t) => {
    if (status && t.status !== status) return false;
    if (!groupDef.matches(t.status as string)) return false;
    if (type && t.type !== type) return false;
    if (tags.length > 0 && !tags.every((tg) => t.tags.includes(tg))) return false;
    if (!q) return true;
    if (t.id.toLowerCase().includes(q)) return true;
    if (t.title.toLowerCase().includes(q)) return true;
    if (t.tags.some((x) => x.toLowerCase().includes(q))) return true;
    if (t.implementation.filesChanged.some((f) => f.toLowerCase().includes(q))) return true;
    if (t.pushes?.some((p) => p.commitMessage.toLowerCase().includes(q))) return true;
    if (t.reviews.some((r) => r.comment.toLowerCase().includes(q))) return true;
    return false;
  });
}
