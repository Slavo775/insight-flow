import { useEffect, useState } from "react";
import styled, { css } from "styled-components";
import {
  Button,
  Header,
  SearchInput,
  Select,
  StatusPill,
  statusToneColors,
  type StatusTone,
} from "../../dashboard/client/components/index.js";
import { Main, PANEL_GRADIENT } from "./layout.js";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FilterIcon,
  InfoIcon,
  ServerIcon,
} from "../../dashboard/client/components/icons.js";
import { fetchLogs, fetchProjects, type LogCounts, type LogEntry } from "./api.js";

// N244/N248 — the debug log viewer at /logs, redesigned to the Lovable design:
// shared Header (Projects back + Insight Flow / Logs + search), level chips with
// real counts, a project filter, and colored collapsible rows. Search + counts
// run server-side (across all logs); see /api/logs (N242/N248).

const PAGE_SIZE = 100;
// N248 — Lovable uses 14px (text-sm) for the row message + chips; the theme scale
// has no 14px token (md=13px), so these two use a raw value.
const LOVABLE_TEXT_SM = "14px";
// N248 — a lighter muted than theme.textMuted (0.78 L) for small meta text that
// sits on very dark badge/row backgrounds, so it clears WCAG AA 4.5:1.
const META_FG = "oklch(0.88 0.02 260)";

type Level = "error" | "warning" | "info";
const LEVELS: Level[] = ["error", "warning", "info"];
const LEVEL_LABEL: Record<Level, string> = { error: "Error", warning: "Warning", info: "Info" };

function LevelIcon({ level, size = 14 }: { level: Level; size?: number }) {
  if (level === "error") return <AlertCircleIcon size={size} />;
  if (level === "warning") return <AlertTriangleIcon size={size} />;
  return <InfoIcon size={size} />;
}

// N248 — the shared SearchInput/Select render at the theme `md` (13px); Lovable
// uses text-sm (14px) here, so force 14px on the header search + project select
// on this page only (shared components stay 13px elsewhere).
const HeaderSearch = styled.div`
  width: 288px;
  max-width: 100%;
  input {
    font-size: 14px;
  }
`;

// Neutral bordered "Projects" back button (reuses the shared Button, anchor).
// Lovable back button is text-sm font-semibold (14px / 600).
const BackButton = styled(Button)`
  min-height: 44px;
  gap: ${(p) => p.theme.space.md};
  text-decoration: none;
  font-size: 14px;
  font-weight: ${(p) => p.theme.font.weight.semibold};
`;

// Summary + filters card — a subtle vertical gradient panel (Lovable).
const FiltersCard = styled.section`
  margin-bottom: ${(p) => p.theme.space["3xl"]};
  padding: 16px;
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  background: ${PANEL_GRADIENT};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${(p) => p.theme.space.lg};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(p) => p.theme.space.md};
`;

const Chip = styled.button<{ $active: boolean; $level: "all" | Level }>`
  display: inline-flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  min-height: 40px;
  padding: 0 12px;
  border-radius: ${(p) => p.theme.radius.md};
  border: 1px solid;
  font-family: inherit;
  font-size: ${LOVABLE_TEXT_SM};
  font-weight: ${(p) => p.theme.font.weight.semibold};
  cursor: pointer;
  ${(p) => {
    if (p.$level === "all") {
      return css`
        background: ${p.$active ? "oklch(0.32 0.02 260)" : p.theme.color.surface};
        border-color: ${p.$active ? "oklch(0.45 0.02 260)" : p.theme.color.border};
        color: ${p.theme.color.text};
      `;
    }
    const t = statusToneColors(p.$level);
    return css`
      background: ${p.$active ? t.bg : p.theme.color.surface};
      border-color: ${p.$active ? t.border : p.theme.color.border};
      color: ${p.$active ? t.fg : p.theme.color.textMuted};
    `;
  }}
  &:focus-visible {
    outline: none;
    border-color: ${(p) => p.theme.color.accent};
    box-shadow: 0 0 0 2px ${(p) => p.theme.color.accent};
  }
`;

const CountBadge = styled.span`
  border-radius: ${(p) => p.theme.radius.sm};
  padding: 1px 6px;
  font-size: ${(p) => p.theme.font.size.base};
  font-variant-numeric: tabular-nums;
  background: oklch(0.15 0.02 260 / 0.6);
  color: ${META_FG};
`;

const ProjectFilter = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  color: ${(p) => p.theme.color.textMuted};
  select {
    font-size: 14px;
  }
`;

const Note = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  padding: ${(p) => p.theme.space.lg} 0;
`;

const List = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.md};
`;

const Row = styled.article<{ $tone: StatusTone }>`
  border: 1px solid ${(p) => statusToneColors(p.$tone).border};
  background: ${(p) => statusToneColors(p.$tone).rowBg};
  border-radius: ${(p) => p.theme.radius.md};
`;

// Shared row layout for the interactive (button) and static (div) variants.
const rowLayout = css`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: ${(p) => p.theme.space.lg};
  padding: 12px 16px;
  text-align: left;
  box-sizing: border-box;
`;

const RowButton = styled.button`
  ${rowLayout}
  background: none;
  border: none;
  color: inherit;
  font-family: inherit;
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.color.accent};
    outline-offset: -2px;
    border-radius: ${(p) => p.theme.radius.md};
  }
`;

const RowStatic = styled.div`
  ${rowLayout}
`;

// Phrasing-friendly wrappers (span) so they are valid inside the RowButton.
const RowMain = styled.span`
  display: block;
  min-width: 0;
  flex: 1;
`;

const BadgeRow = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
`;

const ProjectBadge = styled.span<{ $master: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${(p) => p.theme.space.sm};
  height: 26px;
  padding: 0 8px;
  border-radius: ${(p) => p.theme.radius.sm};
  font-size: ${(p) => p.theme.font.size.base};
  font-variant-numeric: tabular-nums;
  border: 1px solid
    ${(p) => (p.$master ? "oklch(0.5 0.15 150 / 0.6)" : p.theme.color.border)};
  background: ${(p) => (p.$master ? "oklch(0.28 0.09 150 / 0.35)" : p.theme.color.surface)};
  color: ${(p) => (p.$master ? "oklch(0.9 0.15 155)" : p.theme.color.textMuted)};
`;

const Time = styled.time`
  font-size: ${(p) => p.theme.font.size.base};
  font-variant-numeric: tabular-nums;
  color: ${META_FG};
`;

const Message = styled.span`
  display: block;
  margin-top: 6px;
  font-size: ${LOVABLE_TEXT_SM};
  line-height: 1.4;
  color: ${(p) => p.theme.color.text};
`;

const Chevron = styled.span`
  flex-shrink: 0;
  margin-top: 2px;
  color: ${(p) => p.theme.color.textMuted};
`;

const DataWrap = styled.div<{ $tone: StatusTone }>`
  border-top: 1px solid ${(p) => statusToneColors(p.$tone).border};
  padding: 12px 16px;
`;

const DataLabel = styled.p`
  margin: 0 0 8px;
  font-size: ${(p) => p.theme.font.size.base};
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${META_FG};
`;

const Pre = styled.pre`
  margin: 0;
  padding: 10px 12px;
  background: oklch(0.13 0.02 260);
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.sm};
  overflow-x: auto;
  font-size: ${(p) => p.theme.font.size.base};
  line-height: 1.5;
`;

const Pager = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.lg};
  margin-top: ${(p) => p.theme.space["3xl"]};
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.base};
`;

function LogRowContent({
  log,
  isOpen,
  hasData,
}: {
  log: LogEntry;
  isOpen: boolean;
  hasData: boolean;
}) {
  const lvl = log.type as Level;
  const isMaster = log.projectName === "master";
  return (
    <>
      <RowMain>
        <BadgeRow>
          <StatusPill tone={lvl} icon={<LevelIcon level={lvl} />}>
            {LEVEL_LABEL[lvl]}
          </StatusPill>
          <ProjectBadge $master={isMaster}>
            <ServerIcon size={12} />
            {log.projectName}
          </ProjectBadge>
          <Time dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleString()}</Time>
        </BadgeRow>
        <Message>{log.message}</Message>
      </RowMain>
      {hasData ? (
        <Chevron aria-hidden="true">
          {isOpen ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
        </Chevron>
      ) : null}
    </>
  );
}

export function LogsPage() {
  const [project, setProject] = useState("all");
  const [level, setLevel] = useState<"all" | Level>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<LogCounts>({ error: 0, warning: 0, info: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [projectOpts, setProjectOpts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProjects()
      .then((ps) => setProjectOpts([...new Set(ps.map((p) => p.projectId))]))
      .catch(() => {});
  }, []);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter change goes back to page 1.
  useEffect(() => {
    setPage(1);
  }, [debounced, project, level]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchLogs({ project, type: level, page, pageSize: PAGE_SIZE, search: debounced })
      .then((d) => {
        if (cancelled) return;
        setTotal(d.total);
        setCounts(d.counts);
        setLogs(d.logs);
        // Row keys are page-local (index-based), so reset expansion on every
        // load — otherwise a same-index row on another page could show expanded.
        setExpanded(new Set());
      })
      .catch((e) => !cancelled && setErr(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [project, level, page, debounced]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allCount = counts.error + counts.warning + counts.info;

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <Header
        eyebrow="Insight Flow"
        title="Logs"
        before={
          <BackButton as="a" href="/" $variant="secondary" title="Back to projects">
            <ArrowLeftIcon size={16} />
            Projects
          </BackButton>
        }
      >
        <HeaderSearch>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs…"
            aria-label="Search logs"
          />
        </HeaderSearch>
      </Header>

      <Main>
        <FiltersCard aria-label="Log filters">
          <Chips role="group" aria-label="Filter by level">
            {(["all", ...LEVELS] as const).map((lvl) => (
              <Chip
                key={lvl}
                type="button"
                $active={level === lvl}
                $level={lvl}
                aria-pressed={level === lvl}
                onClick={() => setLevel(lvl)}
              >
                {lvl === "all" ? "All" : LEVEL_LABEL[lvl]}
                <CountBadge>{lvl === "all" ? allCount : counts[lvl]}</CountBadge>
              </Chip>
            ))}
          </Chips>

          <ProjectFilter>
            <FilterIcon size={16} />
            <Select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              aria-label="Filter by project"
            >
              <option value="all">All projects</option>
              <option value="master">master</option>
              {projectOpts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </ProjectFilter>
        </FiltersCard>

        {err ? <Note>Failed to load logs: {err}</Note> : null}
        {loading ? <Note>Loading…</Note> : null}
        {!loading && !err && logs.length === 0 ? (
          <Note>No logs match your filters.</Note>
        ) : null}

        <List aria-label="Log entries">
          {logs.map((l, i) => {
            const lvl = l.type as Level;
            const key = `${l.timestamp}-${i}`;
            const hasData = l.data !== undefined;
            const isOpen = hasData && expanded.has(key);
            return (
              <Row key={key} $tone={lvl}>
                {hasData ? (
                  <RowButton
                    type="button"
                    onClick={() => toggle(key)}
                    aria-expanded={isOpen}
                    aria-controls={`log-data-${key}`}
                  >
                    <LogRowContent log={l} isOpen={isOpen} hasData={hasData} />
                  </RowButton>
                ) : (
                  <RowStatic>
                    <LogRowContent log={l} isOpen={false} hasData={false} />
                  </RowStatic>
                )}
                {isOpen ? (
                  <DataWrap id={`log-data-${key}`} $tone={lvl}>
                    <DataLabel>Extra data</DataLabel>
                    <Pre>{JSON.stringify(l.data, null, 2)}</Pre>
                  </DataWrap>
                ) : null}
              </Row>
            );
          })}
        </List>

        {logs.length > 0 ? (
          <Pager>
            <Button
              type="button"
              $variant="nav"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span>
              Page {page} / {totalPages} · {total} logs
            </span>
            <Button
              type="button"
              $variant="nav"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </Pager>
        ) : null}
      </Main>
    </div>
  );
}
