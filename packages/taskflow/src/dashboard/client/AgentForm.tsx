// N107 — compose a custom agent: searchable module picker (built-in + custom,
// kind badges), ordered list with add/remove/reorder, live composition
// preview (the N93 map), persisted via the N103 CRUD API. Built-ins are
// read-only; dangling refs surface inline from the server.
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import {
  Field,
  FieldError,
  TopError,
  FormActions,
  PickerRow,
  OrderedRow,
  RowTitle,
  RowButton,
} from "./components/form.js";
import {
  ApiError,
  deleteDefinition,
  deriveCommandName,
  saveDefinition,
  slugifyIdTail,
} from "./api.js";
import { Button, Section } from "./components/index.js";
import { CompositionMap, kindColor, type MapNodeSpec } from "./components/CompositionMap.js";
import { ModuleInfoModal } from "./components/ModuleInfoModal.js";
import { SideLayout } from "./components/SideLayout.js";
import { KindDot } from "./ModulesPage.js";
import { invalidateRegistry, useRegistry } from "./registry.js";
import { useDashboardStore } from "./store.js";
import { Nav } from "./ui.js";

const FormBox = styled.form`
  max-width: 860px;
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.lg};
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${(p) => p.theme.space["2xl"]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PickerList = styled.div`
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  max-height: 320px;
  overflow-y: auto;
`;

const OriginTag = styled.span<{ $custom: boolean }>`
  color: ${(p) => (p.$custom ? p.theme.color.amber : p.theme.color.textMuted)};
  font-size: ${(p) => p.theme.font.size.xs};
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.sm};
  color: ${(p) => p.theme.color.text};
`;

// N138 — RESERVED_COMMAND_NAMES mirrors core/schema (kept inline so the client
// bundle doesn't import the zod schema module); deriveCommandName lives in api.js.
const RESERVED_COMMAND_NAMES = new Set([
  "task-analyze",
  "taskmaster",
  "taskmaster-change",
  "task-implement",
  "task-review",
  "task-review-fix",
  "task-human-review",
  "task-git",
  "task-incident",
  "task-request-changes",
]);

export function AgentForm() {
  const params = useParams();
  const editId = params.id ?? null;
  const navigate = useNavigate();
  const theme = useTheme();
  const { registry, error: registryError } = useRegistry();
  const projectName = useDashboardStore((s) => s.snapshot?.projectName || "");

  const editing = useMemo(
    () => (editId && registry ? (registry.agents.find((a) => a.id === editId) ?? null) : null),
    [editId, registry],
  );

  const [idTail, setIdTail] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [moduleIds, setModuleIds] = useState<string[] | null>(null);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // N135 — a click on a preview module node opens this modal instead of
  // navigating away (which would discard the unsaved form).
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  // N138 — opt-in install of this agent as a runnable command/skill on flow install.
  const [installCommand, setInstallCommand] = useState<boolean | null>(null);
  const [commandAs, setCommandAs] = useState<"command" | "skill" | null>(null);

  if (registryError) return <p>Failed to load registry: {registryError}</p>;
  if (!registry) return <p>Loading…</p>;
  if (editId && !editing) return <p>Unknown agent “{editId}”.</p>;
  if (editing && !editing.id.startsWith("custom:")) {
    return (
      <p>
        Built-in agents are immutable. <Link to={`/agent/${editing.id}`}>Back</Link>
      </p>
    );
  }

  const isEdit = Boolean(editing);
  const sIdTail = idTail ?? (editing ? editing.id.replace(/^custom:/, "") : "");
  const sTitle = title ?? editing?.title ?? "";
  const sDescription = description ?? editing?.description ?? "";
  const sModules = moduleIds ?? editing?.modules.map((m) => m.id) ?? [];
  const fullId = `custom:${sIdTail.trim() || "<id>"}`;
  // N138 — derived command state + collision check.
  const sInstallCommand = installCommand ?? editing?.command?.install ?? false;
  const sCommandAs = commandAs ?? editing?.command?.as ?? "command";
  const commandName = deriveCommandName(fullId);
  const commandReserved = sInstallCommand && RESERVED_COMMAND_NAMES.has(commandName);

  const moduleById = new Map(registry.modules.map((m) => [m.id, m]));
  // Every registry module is pickable — bundles included (they expand at
  // compose time, N95).
  const pickable = registry.modules;
  const filtered = search.trim()
    ? pickable.filter((m) =>
        `${m.id} ${m.title}`.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : pickable;

  const move = (index: number, delta: number): void => {
    const next = [...sModules];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setModuleIds(next);
  };

  const previewNodes: MapNodeSpec[] = [
    ...sModules.map((id, i) => ({
      id,
      label: `${i + 1}. ${moduleById.get(id)?.title ?? id}`,
      kind: moduleById.get(id)?.kind ?? "unknown",
      role: "module" as const,
    })),
    {
      id: "agent:__preview",
      label: `⚙ ${sTitle || fullId}`,
      kind: "agent",
      role: "agent" as const,
      emphasis: true,
    },
  ];
  const previewEdges: [string, string][] = sModules.map((id) => [id, "agent:__preview"]);
  // N135 — resolve the clicked preview module for the in-place info modal.
  const openModule = openModuleId
    ? (registry.modules.find((m) => m.id === openModuleId) ?? null)
    : null;

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setTopError(null);
    const localErrors: Record<string, string> = {};
    if (!sIdTail.trim()) localErrors.idTail = "required";
    if (!sTitle.trim()) localErrors.title = "required";
    if (!sModules.length) localErrors.modules = "add at least one module";
    if (commandReserved)
      localErrors.command = `/${commandName} collides with a built-in command — rename the agent`;
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const record = {
        id: `custom:${sIdTail.trim()}`,
        title: sTitle.trim(),
        ...(sDescription.trim() ? { description: sDescription.trim() } : {}),
        modules: sModules,
        ...(sInstallCommand ? { command: { install: true, as: sCommandAs } } : {}),
      };
      await saveDefinition("agents", record, isEdit);
      invalidateRegistry();
      navigate(`/agent/${record.id}`);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    if (!editing) return;
    if (!window.confirm(`Delete ${editing.id}?`)) return;
    setBusy(true);
    setTopError(null);
    try {
      await deleteDefinition("agents", editing.id);
      invalidateRegistry();
      navigate("/agent");
    } catch (err) {
      if (err instanceof ApiError && err.referencedBy?.length) {
        setTopError(
          `Still referenced by: ${err.referencedBy.join(", ")} — remove those references first.`,
        );
      } else {
        setTopError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Nav projectName={projectName} />
      <SideLayout
        title={isEdit ? `Edit ${editing!.id}` : "New agent"}
        sidebar={<Link to="/agent">← All agents</Link>}
      >
        <Section title={isEdit ? "Edit custom agent" : "Compose custom agent"}>
          {topError ? <TopError role="alert">{topError}</TopError> : null}
          <FormBox onSubmit={(e) => void submit(e)}>
            <Field>
              Id {errors.idTail ? <FieldError>{errors.idTail}</FieldError> : null}
              <input
                value={sIdTail}
                disabled={isEdit}
                placeholder="my-agent"
                onChange={(e) => setIdTail(slugifyIdTail(e.target.value))}
              />
              <span>
                Stored as <code>{fullId}</code>
              </span>
            </Field>
            <Field>
              Title {errors.title ? <FieldError>{errors.title}</FieldError> : null}
              <input value={sTitle} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field>
              Description
              <input value={sDescription} onChange={(e) => setDescription(e.target.value)} />
            </Field>

            <Columns>
              <div>
                <Field as="div">
                  Module picker {errors.modules ? <FieldError>{errors.modules}</FieldError> : null}
                  <input
                    placeholder="Search modules…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </Field>
                <PickerList>
                  {filtered.map((m) => (
                    <PickerRow
                      key={m.id}
                      type="button"
                      disabled={sModules.includes(m.id)}
                      onClick={() => setModuleIds([...sModules, m.id])}
                    >
                      <KindDot $color={kindColor(theme, m.kind)} />
                      <RowTitle>
                        {m.title} <OriginTag $custom={false}>· {m.id}</OriginTag>
                      </RowTitle>
                      <OriginTag $custom={m.source === "custom"}>{m.source}</OriginTag>
                    </PickerRow>
                  ))}
                </PickerList>
              </div>
              <div>
                <Field as="div">Composition ({sModules.length} modules, ordered)</Field>
                {sModules.map((id, i) => (
                  <OrderedRow key={id}>
                    <span>{i + 1}.</span>
                    <KindDot $color={kindColor(theme, moduleById.get(id)?.kind ?? "unknown")} />
                    <RowTitle title={id}>{moduleById.get(id)?.title ?? id}</RowTitle>
                    <RowButton type="button" disabled={i === 0} onClick={() => move(i, -1)}>
                      ↑
                    </RowButton>
                    <RowButton
                      type="button"
                      disabled={i === sModules.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </RowButton>
                    <RowButton
                      type="button"
                      onClick={() => setModuleIds(sModules.filter((x) => x !== id))}
                    >
                      ✕
                    </RowButton>
                  </OrderedRow>
                ))}
              </div>
            </Columns>

            {sModules.length ? (
              <CompositionMap
                nodes={previewNodes}
                edges={previewEdges}
                readOnly
                onModuleClick={setOpenModuleId}
              />
            ) : null}

            <Field as="div">
              Runnable command (N138){" "}
              {errors.command ? <FieldError>{errors.command}</FieldError> : null}
              <CheckRow>
                <input
                  type="checkbox"
                  checked={sInstallCommand}
                  onChange={(e) => setInstallCommand(e.target.checked)}
                />
                Install this agent as a runnable command/skill when its flow is installed
              </CheckRow>
              {sInstallCommand ? (
                <>
                  <CheckRow>
                    <input
                      type="radio"
                      checked={sCommandAs === "command"}
                      onChange={() => setCommandAs("command")}
                    />
                    Slash command (<code>.claude/commands</code>)
                  </CheckRow>
                  <CheckRow>
                    <input
                      type="radio"
                      checked={sCommandAs === "skill"}
                      onChange={() => setCommandAs("skill")}
                    />
                    Skill (<code>.claude/skills</code> — also works in Cursor)
                  </CheckRow>
                  <span>
                    Installs as <code>/{commandName}</code>
                  </span>
                  {commandReserved ? (
                    <FieldError>
                      /{commandName} collides with a built-in command — rename the agent
                    </FieldError>
                  ) : null}
                </>
              ) : null}
            </Field>

            <FormActions>
              <Button type="submit" $variant="primary" disabled={busy}>
                {isEdit ? "Save changes" : "Create agent"}
              </Button>
              {isEdit ? (
                <Button
                  type="button"
                  $variant="danger"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  Delete
                </Button>
              ) : null}
              <Link to={isEdit ? `/agent/${editing!.id}` : "/agent"}>Cancel</Link>
            </FormActions>
          </FormBox>
        </Section>
      </SideLayout>
      {openModule ? (
        <ModuleInfoModal module={openModule} onClose={() => setOpenModuleId(null)} />
      ) : null}
    </>
  );
}
