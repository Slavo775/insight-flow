import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Button,
  ProjectCard,
  SearchInput,
  Section,
  type ProjectCardPill,
} from "../../dashboard/client/components/index.js";
import type { PublicProjectEntry } from "../types.js";
import { fetchProjects, refreshProjects, startProject } from "./api.js";
import { currentlyWorking, effectiveClaudeStatus, taskText } from "./status.js";
import {
  isMuted,
  loadNotifSettings,
  saveNotifSettings,
  toggleMuted,
  type NotifSettings,
} from "./notif.js";
import { SettingsMenu } from "./SettingsMenu.js";
import { NewProjectModal } from "./NewProjectModal.js";
import { SquareIconButton } from "./ui.js";
import {
  ActivityIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  MoonIcon,
  PlayIcon,
  PlusIcon,
  PowerOffIcon,
  RefreshIcon,
  ServerIcon,
  ShieldAlertIcon,
} from "./icons.js";

// ---- layout ---------------------------------------------------------------

const MAX_WIDTH = "1152px";

const Root = styled.div`
  min-height: 100dvh;
`;

// Full-width sticky header with a bottom border (Lovable): 76px tall = 44px
// controls + 16px top/bottom padding; 32px left/right; inner content centered.
const HeaderBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid ${(p) => p.theme.color.border};
  background: oklch(0.19 0.02 260 / 0.9);
  backdrop-filter: blur(8px);
`;

const HeaderInner = styled.div`
  max-width: ${MAX_WIDTH};
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(p) => p.theme.space["2xl"]};
  padding: 16px 32px;
  flex-wrap: wrap;
`;

const Main = styled.main`
  max-width: ${MAX_WIDTH};
  margin: 0 auto;
  padding: 32px;
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.lg};
`;

const BrandIcon = styled.span`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: ${(p) => p.theme.radius.lg};
  background: #12351f;
  color: ${(p) => p.theme.color.green};
`;

const Eyebrow = styled.p`
  font-size: ${(p) => p.theme.font.size.xs};
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: ${(p) => p.theme.color.textMuted};
  margin: 0;
`;

const Title = styled.h1`
  font-size: ${(p) => p.theme.font.size["2xl"]};
  font-weight: ${(p) => p.theme.font.weight.semibold};
  margin: 0;
  line-height: 1.2;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  width: 288px;
  max-width: 100%;
`;

const HeroCard = styled.section`
  box-sizing: border-box;
  min-height: 118px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  padding: ${(p) => p.theme.space["2xl"]};
  margin-bottom: ${(p) => p.theme.space["3xl"]};
  background: linear-gradient(180deg, oklch(0.22 0.03 260) 0%, oklch(0.2 0.02 260) 100%);
`;

// The hero "Currently working on" label — its own style (the header keeps Eyebrow).
const HeroLabel = styled.p`
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${(p) => p.theme.color.textMuted};
  margin: 0;
`;

const HeroBody = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${(p) => p.theme.space["2xl"]};
  margin-top: ${(p) => p.theme.space.md};
  flex-wrap: wrap;
`;

const HeroName = styled.p`
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
  margin: 0;
`;

const HeroTask = styled.p`
  font-size: 14px;
  line-height: 20px;
  color: ${(p) => p.theme.color.textMuted};
  margin: 4px 0 0;
`;

const HeroEmpty = styled.p`
  font-size: 14px;
  line-height: 20px;
  color: ${(p) => p.theme.color.textMuted};
  margin: ${(p) => p.theme.space.md} 0 0;
`;

const Stack = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.lg};
`;

const Empty = styled.p`
  border: 1px dashed ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space["3xl"]};
  font-size: ${(p) => p.theme.font.size.md};
  color: ${(p) => p.theme.color.textMuted};
`;

// 28×28 rounded box behind the section-header icon (Lovable `size-7`): green for
// online, grey for offline.
const SectionIconBox = styled.span<{ $online: boolean }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: ${(p) => p.theme.radius.xl};
  background: ${(p) => (p.$online ? "oklch(0.28 0.09 150)" : "oklch(0.26 0.02 260)")};
  color: ${(p) => (p.$online ? "oklch(0.95 0.15 155)" : "oklch(0.85 0.02 260)")};
`;

// Master button palette (Lovable): green CTAs + blue Open/notification.
const CTA_GREEN = "oklch(0.85 0.19 150)";
const CTA_TEXT = "oklch(0.15 0.02 260)";
const BLUE_BORDER = "oklch(0.6 0.14 240)";
const BLUE_FG = "oklch(0.95 0.14 240)";

// Shared metrics for every master button: 44px tall, 14px text, 8px radius.
const actionBase = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
`;

// Blue "Open ↗" (online action; the notification bell shares this look).
const OpenLink = styled.a`
  ${actionBase}
  background: oklch(0.28 0.08 240);
  border: 1px solid ${BLUE_BORDER};
  color: ${BLUE_FG};
  &:hover {
    border-color: oklch(0.7 0.14 240);
  }
`;

// Green CTA fill (Start server / New project / Jump to task) — no contrasting border.
const greenCta = `
  ${actionBase}
  background: ${CTA_GREEN};
  border: 1px solid ${CTA_GREEN};
  color: ${CTA_TEXT};
`;

const StartBtn = styled.button`
  ${greenCta}
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

// Green anchor for the hero "Jump to task" CTA.
const GreenLink = styled.a`
  ${greenCta}
  &:hover {
    opacity: 0.9;
  }
`;

// The header "New project" button — green CTA on the shared Button.
const NewProjectBtn = styled(Button)`
  min-height: 44px;
  padding: 0 16px;
  gap: 8px;
  border-radius: 8px;
  font-size: 14px;
  background: ${CTA_GREEN};
  border: 1px solid ${CTA_GREEN};
  color: ${CTA_TEXT};
  &:hover {
    opacity: 0.9;
  }
`;

// N244 — link to the debug logs page (a full navigation; the master serves the
// same shell at /logs and main.tsx renders LogsPage there).
const LogsLink = styled.a`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 14px;
  text-decoration: none;
  color: ${(p) => p.theme.color.textMuted};
  border: 1px solid ${(p) => p.theme.color.border};
  background: ${(p) => p.theme.color.surface};
  &:hover {
    color: ${(p) => p.theme.color.text};
  }
`;

// ---- component ------------------------------------------------------------

function rowPill(p: PublicProjectEntry): ProjectCardPill {
  const s = effectiveClaudeStatus(p);
  if (s === "active") return { tone: "active", label: "Active", icon: <ActivityIcon size={14} /> };
  if (s === "permission-required")
    return {
      tone: "permission",
      label: "Permission required",
      icon: <ShieldAlertIcon size={14} />,
    };
  if (s === "awaiting-permission")
    return {
      tone: "awaiting-permission",
      label: "Awaiting permission",
      icon: <ShieldAlertIcon size={14} />,
    };
  if (s === "done") return { tone: "done", label: "Done", icon: <CheckCircleIcon size={14} /> };
  return { tone: "idle", label: "Idle", icon: <MoonIcon size={14} /> };
}

export function App() {
  const [projects, setProjects] = useState<PublicProjectEntry[]>([]);
  const [query, setQuery] = useState("");
  const [, setTick] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [starting, setStarting] = useState<Set<string>>(() => new Set());
  const [settings, setSettings] = useState<NotifSettings>(() => loadNotifSettings());

  const upsert = (p: PublicProjectEntry): void => {
    setProjects((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx < 0) return [...prev, p];
      const next = prev.slice();
      next[idx] = p;
      return next;
    });
    if (p.online) {
      setStarting((s) => {
        if (!s.has(p.id)) return s;
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    }
  };

  // Initial load + on-demand refresh, then the live stream.
  useEffect(() => {
    let alive = true;
    fetchProjects()
      .then((list) => alive && setProjects(list))
      .catch(() => {});
    refreshProjects()
      .then((list) => alive && setProjects(list))
      .catch(() => {});

    const es = new EventSource("/events");
    es.addEventListener("project-update", (e) => {
      try {
        upsert(JSON.parse((e as MessageEvent).data) as PublicProjectEntry);
      } catch {
        /* ignore malformed frame */
      }
    });

    // Re-render every 30s so stale (>60s) projects decay to neutral even when no
    // other update arrives (ported from overview.ts refreshStaleCards).
    const timer = setInterval(() => alive && setTick((t) => t + 1), 30000);

    return () => {
      alive = false;
      es.close();
      clearInterval(timer);
    };
  }, []);

  const onRefresh = (): void => {
    refreshProjects()
      .then(setProjects)
      .catch(() => {});
  };

  const onStart = (p: PublicProjectEntry): void => {
    setStarting((s) => new Set(s).add(p.id));
    setTimeout(() => {
      setStarting((s) => {
        if (!s.has(p.id)) return s;
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    }, 20000);
    startProject(p.id)
      .then((d) => {
        if (d.url) {
          window.location.href = `/project/${encodeURIComponent(p.projectId)}/`;
        } else if (!d.starting) {
          setStarting((s) => {
            const n = new Set(s);
            n.delete(p.id);
            return n;
          });
        }
      })
      .catch(() =>
        setStarting((s) => {
          const n = new Set(s);
          n.delete(p.id);
          return n;
        }),
      );
  };

  const onToggleMute = (id: string): void => {
    setSettings((prev) => {
      const next = toggleMuted(prev, id);
      saveNotifSettings(next);
      return next;
    });
  };

  const onSettingsChange = (next: NotifSettings): void => {
    saveNotifSettings(next);
    setSettings(next);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? projects.filter((p) => p.label.toLowerCase().includes(q)) : projects;
  }, [projects, query]);

  const online = filtered.filter((p) => p.online);
  const offline = filtered.filter((p) => !p.online);
  const current = currentlyWorking(projects);

  const renderRow = (p: PublicProjectEntry) => {
    const action = p.online ? (
      <OpenLink href={`/project/${encodeURIComponent(p.projectId)}/`}>
        Open <ArrowUpRightIcon size={14} />
      </OpenLink>
    ) : (
      <StartBtn
        type="button"
        disabled={starting.has(p.id)}
        aria-label={`Start server for ${p.label}`}
        onClick={() => onStart(p)}
      >
        <PlayIcon size={13} />
        {starting.has(p.id) ? "Starting…" : "Start server"}
      </StartBtn>
    );
    return (
      <ProjectCard
        key={p.id}
        label={p.label}
        pill={rowPill(p)}
        taskText={taskText(p)}
        muted={isMuted(settings, p.id)}
        onToggleMute={() => onToggleMute(p.id)}
        action={action}
      />
    );
  };

  return (
    <Root>
      <HeaderBar>
        <HeaderInner>
          <Brand>
            <BrandIcon aria-hidden="true">
              <ServerIcon size={20} />
            </BrandIcon>
            <div>
              <Eyebrow>Insight Flow</Eyebrow>
              <Title>Projects overview</Title>
            </div>
          </Brand>

          <Actions>
            <SearchBox>
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                aria-label="Search projects"
              />
            </SearchBox>
            <SquareIconButton
              type="button"
              aria-label="Refresh"
              title="Re-check which projects are running"
              onClick={onRefresh}
            >
              <RefreshIcon size={16} />
            </SquareIconButton>
            <LogsLink href="/logs" title="Debug logs">
              Logs
            </LogsLink>
            <SettingsMenu settings={settings} onChange={onSettingsChange} />
            <NewProjectBtn type="button" $variant="success" onClick={() => setNewOpen(true)}>
              <PlusIcon size={14} />
              New project
            </NewProjectBtn>
          </Actions>
        </HeaderInner>
      </HeaderBar>

      <Main>
        <HeroCard aria-labelledby="hero-h">
          <HeroLabel id="hero-h">Currently working on</HeroLabel>
          {current ? (
            <HeroBody>
              <div>
                <HeroName>{current.label}</HeroName>
                <HeroTask>{taskText(current)}</HeroTask>
              </div>
              <GreenLink href={`/project/${encodeURIComponent(current.projectId)}/`}>
                Jump to task <ArrowUpRightIcon size={14} />
              </GreenLink>
            </HeroBody>
          ) : (
            <HeroEmpty>No project is currently active.</HeroEmpty>
          )}
        </HeroCard>

        <Section
          title="Online servers"
          count={online.length}
          icon={
            <SectionIconBox $online>
              <ServerIcon size={16} />
            </SectionIconBox>
          }
          titleVariant="heading"
        >
          {online.length ? (
            <Stack>{online.map(renderRow)}</Stack>
          ) : (
            <Empty>No servers are online right now.</Empty>
          )}
        </Section>

        <Section
          title="Offline servers"
          count={offline.length}
          icon={
            <SectionIconBox $online={false}>
              <PowerOffIcon size={16} />
            </SectionIconBox>
          }
          titleVariant="heading"
        >
          {offline.length ? (
            <Stack>{offline.map(renderRow)}</Stack>
          ) : (
            <Empty>All servers are online.</Empty>
          )}
        </Section>
      </Main>

      {newOpen ? <NewProjectModal onClose={() => setNewOpen(false)} /> : null}
    </Root>
  );
}
