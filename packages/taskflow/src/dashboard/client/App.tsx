import { useEffect, useMemo, useState } from "react";
import type { ClaudeStatus } from "./activity.js";
import { ActivityFeed } from "./ActivityFeed.js";
import { Route, Routes } from "react-router-dom";
import { AgentForm } from "./AgentForm.js";
import { AgentsPage } from "./AgentsPage.js";
import { DetailPanel } from "./DetailPanel.js";
import { ModuleForm } from "./ModuleForm.js";
import { ModulesPage } from "./ModulesPage.js";
import { ProjectForm } from "./ProjectForm.js";
import { ProjectPage } from "./ProjectPage.js";
import { TaskDetailPage } from "./TaskDetailPage.js";
import styled from "styled-components";
import { Button, Card, Text } from "./components/index.js";
// N238 — notifications/sounds moved wholly to the hub (/hub-notify.js). The
// project dashboard keeps only the visual tab-title helper.
import { updatePageTitle } from "./notifications.js";
import { useDashboardStore } from "./store.js";
import { useDashboardStream } from "./useDashboardStream.js";
import { useFlowColumns } from "./flow-columns.js";
import { Kanban, Nav, ShardNav, Stats, Timeline } from "./ui.js";

// N259 — the project-header card: reuse the shared Card (border/surface/radius) but
// give it more padding and suppress the clickable hover accent (this card is static).
const HeaderCard = styled(Card)`
  padding: ${(p) => p.theme.space["2xl"]} ${(p) => p.theme.space["3xl"]};
  margin-bottom: ${(p) => p.theme.space["3xl"]};
  &:hover {
    border-color: ${(p) => p.theme.color.border};
  }
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${(p) => p.theme.space.md};
`;

function activityStatusView(s: ClaudeStatus | null): { text: string; cls: string } {
  if (s === "active") return { text: "active", cls: "activity-status active" };
  if (s === "idle") return { text: "idle", cls: "activity-status idle" };
  if (s === "permission-needed")
    return { text: "🚨 permission", cls: "activity-status permission-needed" };
  return { text: "", cls: "activity-status" };
}

function DashboardView() {
  const [actTab, setActTab] = useState<"claude" | "recent">("claude");
  // N258 — header search filters the board by task id / title.
  const [query, setQuery] = useState("");

  // Global state from the Zustand store (fed by the SSE stream).
  const connection = useDashboardStore((s) => s.connection);
  const agentStatus = useDashboardStore((s) => s.agentStatus);
  const snapshot = useDashboardStore((s) => s.snapshot);
  const activityEvents = useDashboardStore((s) => s.activityEvents);
  const shards = useDashboardStore((s) => s.shards);
  const currentShard = useDashboardStore((s) => s.currentShard);
  const tasks = useDashboardStore((s) => s.tasks);
  const label = useDashboardStore((s) => s.label);
  const loadError = useDashboardStore((s) => s.loadError);
  const sync = useDashboardStore((s) => s.sync);
  const selectedTaskId = useDashboardStore((s) => s.selectedTaskId);
  const loadShard = useDashboardStore((s) => s.loadShard);
  const selectTask = useDashboardStore((s) => s.selectTask);
  // N129 — kanban columns derived from the flows' status sets (canonical fallback).
  const columns = useFlowColumns();

  const selected = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  // N258 — board tasks filtered by the header search (id or title, case-insensitive).
  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => `${t.id} ${t.title}`.toLowerCase().includes(q));
  }, [tasks, query]);

  const dot = "live-dot" + (connection === "reconnecting" ? " reconnecting" : "");
  const activityEnabled = snapshot?.activityEnabled === true;
  const st = activityStatusView(agentStatus);

  return (
    <>
      <Nav projectName={snapshot?.projectName || ""} query={query} onQuery={setQuery} />
      {/* N259 — project-header card: title + shard/tasks/current meta line + stat tiles. */}
      <HeaderCard>
        <TitleRow>
          <div>
            {/* N259 — h2 (not h1): the Nav banner already renders the project name as
                the page's single h1, so the card title is its logical child heading.
                $variant keeps the visual size unchanged. */}
            <Text as="h2" $variant="h1">
              <span className={dot} id="status-dot" />
              {snapshot?.projectName ? `${snapshot.projectName} Dashboard` : "Dashboard"}
            </Text>
            <Text as="p" $variant="subtitle">
              {label}
            </Text>
            {loadError ? (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                  color: "var(--red, #e5484d)",
                  fontSize: 12,
                }}
              >
                <span>{loadError} — retrying…</span>
                <Button $variant="secondary" onClick={() => void sync()}>
                  Retry now
                </Button>
              </div>
            ) : null}
          </div>
          {snapshot && !activityEnabled ? (
            <span
              className="engine-chip engine-off"
              title="Set activityEngine.enabled to true in taskflow.config.json to enable"
            >
              Engine: off (config)
            </span>
          ) : null}
        </TitleRow>
        <Stats tasks={tasks} />
      </HeaderCard>

      <div className="layout">
        <div className="main-content">
          {shards.length > 0 ? (
            <ShardNav shards={shards} current={currentShard} onSelect={(n) => void loadShard(n)} />
          ) : null}
          <Kanban tasks={visibleTasks} columns={columns} onOpen={selectTask} />

          {activityEnabled ? (
            <div className="act-tabs">
              <div className="act-tab-bar" role="tablist" aria-label="Activity views">
                <Button
                  $variant="tab"
                  $active={actTab === "claude"}
                  onClick={() => setActTab("claude")}
                  role="tab"
                  id="tab-agent"
                  aria-selected={actTab === "claude"}
                  aria-controls="panel-agent"
                >
                  Agent Activity <span className={st.cls}>{st.text}</span>
                </Button>
                <Button
                  $variant="tab"
                  $active={actTab === "recent"}
                  onClick={() => setActTab("recent")}
                  role="tab"
                  id="tab-status"
                  aria-selected={actTab === "recent"}
                  aria-controls="panel-status"
                >
                  Status Transitions
                </Button>
              </div>
              <div
                className="act-panel"
                role="tabpanel"
                id="panel-agent"
                aria-labelledby="tab-agent"
                hidden={actTab !== "claude"}
              >
                <ActivityFeed
                  events={activityEvents}
                  verbosity={snapshot?.verbosity || "both"}
                  hookStatus={snapshot?.hookStatus || "ok"}
                />
              </div>
              <div
                className="act-panel"
                role="tabpanel"
                id="panel-status"
                aria-labelledby="tab-status"
                hidden={actTab !== "recent"}
              >
                <Timeline tasks={tasks} />
              </div>
            </div>
          ) : (
            <div id="timeline" className="act-panel">
              <Timeline tasks={tasks} />
            </div>
          )}
        </div>
      </div>

      <DetailPanel task={selected} onClose={() => selectTask(null)} />
    </>
  );
}

export function App() {
  // App-level: the SSE stream + one-time bootstrap run once across routes.
  useDashboardStream();

  useEffect(() => {
    updatePageTitle("idle");
    void useDashboardStore.getState().sync();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<DashboardView />} />
      <Route path="/task/:id" element={<TaskDetailPage />} />
      {/* N93 — composer registry browser. Module ids contain "/"
          (task-implement/never), so the module route is a splat. */}
      <Route path="/module" element={<ModulesPage />} />
      {/* N106 — authoring routes win over the id splat below. */}
      <Route path="/module/new" element={<ModuleForm />} />
      <Route path="/module/edit/*" element={<ModuleForm />} />
      <Route path="/module/*" element={<ModulesPage />} />
      <Route path="/agent" element={<AgentsPage />} />
      {/* N107 — authoring routes win over the :id route below. */}
      <Route path="/agent/new" element={<AgentForm />} />
      <Route path="/agent/edit/:id" element={<AgentForm />} />
      <Route path="/agent/:id" element={<AgentsPage />} />
      <Route path="/project" element={<ProjectPage />} />
      {/* N108 — multiple named flows; /new wins over the :id route. */}
      <Route path="/project/new" element={<ProjectForm />} />
      <Route path="/project/:id" element={<ProjectPage />} />
    </Routes>
  );
}
