// N93 — module detail: everything about one registry module. Kind badge +
// source + description, kind-specific panels (section body, include ref, MCP
// config JSON, hook table, skill content — markdown-rendered where the content
// is markdown, per change request R1), referencing-agent chips, and an
// interactive map. `KindPanels` and the header bits are exported for reuse by
// the agent page's module modal.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import styled, { useTheme } from "styled-components";
import { fetchIncludeDoc, type ModuleDto } from "./api.js";
import { Button } from "./components/index.js";
import { CompositionMap, kindColor, type MapNodeSpec } from "./components/CompositionMap.js";
import { InstallModal } from "./components/InstallModal.js";
import { ModuleInfoModal } from "./components/ModuleInfoModal.js";
import type { Registry } from "./registry.js";
import { isLockedModuleClient } from "./locked.js";

// N174 — only artifact-bearing module kinds install standalone (a bundle expands
// into them); section/include/status-transition/handover have nothing to install.
const INSTALLABLE_MODULE_KINDS = new Set(["mcp-server", "hook", "skill", "bundle"]);
export function isInstallableModule(module: ModuleDto): boolean {
  return INSTALLABLE_MODULE_KINDS.has(module.kind);
}

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${(p) => p.theme.space.lg};
  margin-bottom: ${(p) => p.theme.space.sm};
`;

const Title = styled.h2`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size["2xl"]};
  margin: 0;
`;

export const Badge = styled.span<{ $color: string }>`
  border: 1px solid ${(p) => p.$color};
  color: ${(p) => p.$color};
  border-radius: ${(p) => p.theme.radius.pill};
  font-size: ${(p) => p.theme.font.size.xs};
  padding: 2px ${(p) => p.theme.space.lg};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const Muted = styled.span`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.sm};
`;

export const Description = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.md};
  margin: 0 0 ${(p) => p.theme.space["2xl"]};
`;

export const Panel = styled.section`
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  padding: ${(p) => p.theme.space["2xl"]};
  margin-bottom: ${(p) => p.theme.space["2xl"]};
  min-width: 0;
`;

export const PanelTitle = styled.h3`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.sm};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 ${(p) => p.theme.space.lg};
`;

const Pre = styled.pre`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.md};
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(p) => p.theme.space.lg};
`;

const Chip = styled(Link)`
  color: ${(p) => p.theme.color.accent};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.pill};
  text-decoration: none;
  font-size: ${(p) => p.theme.font.size.sm};
  padding: ${(p) => p.theme.space.sm} ${(p) => p.theme.space.xl};

  &:hover {
    border-color: ${(p) => p.theme.color.accent};
  }
`;

const KV = styled.dl`
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: ${(p) => p.theme.space.md} ${(p) => p.theme.space["2xl"]};
  margin: 0;

  dt {
    color: ${(p) => p.theme.color.textMuted};
    font-size: ${(p) => p.theme.font.size.sm};
  }
  dd {
    color: ${(p) => p.theme.color.text};
    font-size: ${(p) => p.theme.font.size.md};
    margin: 0;
    word-break: break-word;
  }
`;

/**
 * Include module panels (human review R2): the @ref line plus the referenced
 * markdown file's content rendered as a formatted preview, fetched from the
 * whitelisted /api/include-doc endpoint.
 */
function IncludePanels({ module }: { module: ModuleDto }) {
  // undefined = loading, null = file not found in this project
  const [doc, setDoc] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setDoc(undefined);
    if (!module.ref) {
      setDoc(null);
      return;
    }
    fetchIncludeDoc(module.ref).then(
      (text) => alive && setDoc(text),
      () => alive && setDoc(null),
    );
    return () => {
      alive = false;
    };
  }, [module.ref]);

  return (
    <>
      <Panel>
        <PanelTitle>Include reference</PanelTitle>
        <Pre>@{module.ref}</Pre>
      </Panel>
      <Panel>
        <PanelTitle>{module.ref} — preview</PanelTitle>
        {doc === undefined ? (
          <Muted>Loading preview…</Muted>
        ) : doc === null ? (
          <Muted>File not found in this project.</Muted>
        ) : (
          <MarkdownBlock text={doc} />
        )}
      </Panel>
    </>
  );
}

/** Markdown-rendered block (change request R1: "if we have md so text in md"). */
function MarkdownBlock({ text }: { text: string }) {
  return (
    <div className="markdown-body">
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {text}
      </Markdown>
    </div>
  );
}

/** Kind-specific information panels — shared by the module page and the agent-map modal. */
export function KindPanels({ module }: { module: ModuleDto }) {
  switch (module.kind) {
    case "section":
      return (
        <>
          {module.heading ? (
            <Panel>
              <PanelTitle>Heading</PanelTitle>
              <Pre>{module.heading}</Pre>
            </Panel>
          ) : null}
          {module.body ? (
            <Panel>
              <PanelTitle>Body (prompt text)</PanelTitle>
              <MarkdownBlock text={module.body} />
            </Panel>
          ) : null}
        </>
      );
    case "include":
      return <IncludePanels module={module} />;
    case "mcp-server":
      return (
        <Panel>
          <PanelTitle>MCP server — {module.name}</PanelTitle>
          <Pre>{JSON.stringify(module.config ?? {}, null, 2)}</Pre>
        </Panel>
      );
    case "hook":
      return (
        <Panel>
          <PanelTitle>Claude Code hook</PanelTitle>
          <KV>
            <dt>Event</dt>
            <dd>{module.event}</dd>
            <dt>Matcher</dt>
            <dd>{module.matcher ?? "(all tools)"}</dd>
            <dt>Command</dt>
            <dd>
              <Pre as="code">{module.command}</Pre>
            </dd>
          </KV>
        </Panel>
      );
    case "skill":
      return (
        <Panel>
          <PanelTitle>Skill — .claude/skills/{module.name}/SKILL.md</PanelTitle>
          <MarkdownBlock text={module.content ?? ""} />
        </Panel>
      );
    case "bundle":
      return (
        <Panel>
          <PanelTitle>Contains {module.modules?.length ?? 0} modules</PanelTitle>
          <BundleChips>
            {(module.modules ?? []).map((id) => (
              <BundleChip key={id} to={`/module/${id}`}>
                {id}
              </BundleChip>
            ))}
          </BundleChips>
        </Panel>
      );
    // N154 — N128/N142 behavior-as-data kinds: show their fields.
    case "status-transition":
      return (
        <Panel>
          <PanelTitle>Status transition</PanelTitle>
          <KV>
            <dt>Agent</dt>
            <dd>{module.agent}</dd>
            <dt>Sets</dt>
            <dd>{module.sets}</dd>
            <dt>From</dt>
            <dd>{module.from ?? "(any status)"}</dd>
          </KV>
        </Panel>
      );
    case "handover":
      return (
        <Panel>
          <PanelTitle>Handover</PanelTitle>
          <KV>
            <dt>To</dt>
            <dd>{module.to}</dd>
            <dt>On</dt>
            <dd>{module.on ?? "(direct handoff)"}</dd>
            <dt>Mode</dt>
            <dd>{module.mode ?? "gated"}</dd>
            {module.label ? (
              <>
                <dt>Label</dt>
                <dd>{module.label}</dd>
              </>
            ) : null}
          </KV>
        </Panel>
      );
    default:
      return null;
  }
}

const BundleChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(p) => p.theme.space.lg};
`;

const BundleChip = styled(Link)`
  color: ${(p) => p.theme.color.amber};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.pill};
  text-decoration: none;
  font-size: ${(p) => p.theme.font.size.sm};
  padding: ${(p) => p.theme.space.sm} ${(p) => p.theme.space.xl};

  &:hover {
    border-color: ${(p) => p.theme.color.amber};
  }
`;

/** Header line (title + kind badge + id/source) — shared with the modal. */
export function ModuleHeader({ module }: { module: ModuleDto }) {
  const theme = useTheme();
  return (
    <>
      <Header>
        <Title>{module.title}</Title>
        <Badge $color={kindColor(theme, module.kind)}>{module.kind}</Badge>
        <Muted>
          {module.id} · {module.source}
          {module.target ? ` · ${module.target}` : ""}
          {isLockedModuleClient(module) ? " · locked" : ""}
        </Muted>
        {/* N120/N142 — custom + non-locked defaults are editable (editing a default
            ejects); locked-by-id and locked-by-kind (status-transition/handover)
            stay read-only, so no Edit link. */}
        {!isLockedModuleClient(module) ? (
          <Button as={Link} to={`/module/edit/${module.id}`} $variant="primary">
            Edit
          </Button>
        ) : null}
      </Header>
      {module.description ? <Description>{module.description}</Description> : null}
    </>
  );
}

function facetLabel(module: ModuleDto): string {
  switch (module.kind) {
    case "section":
      return module.heading ? `section “${module.heading}”` : "section (body only)";
    case "include":
      return `@${module.ref}`;
    case "mcp-server":
      return `.mcp.json → ${module.name}`;
    case "hook":
      return `${module.event} hook`;
    case "skill":
      return `skill: ${module.name}`;
    case "bundle":
      return `${module.modules?.length ?? 0} bundled modules`;
    case "status-transition":
      return `sets ${module.sets}`;
    case "handover":
      return `→ ${module.to} (${module.mode ?? "gated"})`;
    default:
      return module.kind;
  }
}

export function ModuleDetail({ module, registry }: { module: ModuleDto; registry: Registry }) {
  const [modalId, setModalId] = useState<string | null>(null);
  // N174 — install/uninstall this module standalone (installable kinds only).
  const [installModal, setInstallModal] = useState<"install" | "uninstall" | null>(null);
  const refs = registry.referencedBy[module.id] ?? [];
  const agentTitle = (id: string): string => registry.agents.find((a) => a.id === id)?.title ?? id;

  // Bundles map to their children (clickable, open the modal); other kinds
  // show their single contribution facet.
  const childIds = module.kind === "bundle" ? (module.modules ?? []) : [];
  const children: MapNodeSpec[] = childIds.map((id) => ({
    id,
    label: registry.modules.find((m) => m.id === id)?.title ?? id,
    kind: registry.modules.find((m) => m.id === id)?.kind ?? "unknown",
    role: "module" as const,
  }));
  const nodes: MapNodeSpec[] = [
    { id: module.id, label: module.title, kind: module.kind, role: "facet", emphasis: true },
    ...(module.kind === "bundle"
      ? children
      : [
          {
            id: `facet:${module.id}`,
            label: facetLabel(module),
            kind: module.kind,
            role: "facet" as const,
          },
        ]),
    ...refs.map((a) => ({
      id: `agent:${a}`,
      label: `⚙ ${agentTitle(a)}`,
      kind: "agent",
      role: "agent" as const,
    })),
  ];
  const edges: [string, string][] = [
    ...(module.kind === "bundle"
      ? childIds.map((c): [string, string] => [c, module.id])
      : [[`facet:${module.id}`, module.id] as [string, string]]),
    ...refs.map((a): [string, string] => [module.id, `agent:${a}`]),
  ];

  return (
    <>
      <ModuleHeader module={module} />

      {/* N174 — installable kinds (mcp-server / hook / skill / bundle) install
          standalone; other kinds have no install action. */}
      {isInstallableModule(module) ? (
        <InstallActions>
          <Button type="button" $variant="primary" onClick={() => setInstallModal("install")}>
            Install
          </Button>
          <Button type="button" $variant="nav" onClick={() => setInstallModal("uninstall")}>
            Uninstall
          </Button>
        </InstallActions>
      ) : null}

      <KindPanels module={module} />

      <Panel>
        <PanelTitle>
          Referenced by {refs.length} agent{refs.length === 1 ? "" : "s"}
        </PanelTitle>
        {refs.length ? (
          <Chips>
            {refs.map((a) => (
              <Chip key={a} to={`/agent/${a}`}>
                {agentTitle(a)}
              </Chip>
            ))}
          </Chips>
        ) : (
          <Muted>No composed agent references this module yet.</Muted>
        )}
      </Panel>

      <Panel>
        <PanelTitle>Map</PanelTitle>
        <CompositionMap nodes={nodes} edges={edges} onModuleClick={setModalId} />
      </Panel>

      {modalId ? (
        <ModuleInfoModal
          module={registry.modules.find((m) => m.id === modalId) ?? module}
          onClose={() => setModalId(null)}
        />
      ) : null}
      {installModal ? (
        <InstallModal
          target={{ kind: "module", id: module.id, title: module.title }}
          mode={installModal}
          onClose={() => setInstallModal(null)}
        />
      ) : null}
    </>
  );
}

const InstallActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(p) => p.theme.space.lg};
  margin-bottom: ${(p) => p.theme.space["2xl"]};
`;
