// N106 — create/edit form for custom modules. Kind-specific field sets
// (section / include / mcp-server / hook / skill), harness target, inline
// server-validation mapping, delete with 409-referenced surfacing. Built-ins
// never reach this page (the edit route guards on source === "custom").
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
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
  saveDefinition,
  slugifyIdTail,
  type ModuleDto,
} from "./api.js";
import { Button, Section } from "./components/index.js";
import { SideLayout } from "./components/SideLayout.js";
import { TASK_STATUSES } from "../../core/statuses.js";
import { isLockedModuleClient } from "./locked.js";
import { invalidateRegistry, useRegistry } from "./registry.js";
import { useDashboardStore } from "./store.js";
import { Nav } from "./ui.js";

const FormBox = styled.form`
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.lg};
`;

const IdPreview = styled.code`
  color: ${(p) => p.theme.color.accent};
`;

// N137 — bundle ("Composed module") picker, mirroring AgentForm's pattern.
const PickerList = styled.div`
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  max-height: 240px;
  overflow-y: auto;
`;

export type EditableKind =
  | "section"
  | "include"
  | "mcp-server"
  | "hook"
  | "skill"
  | "bundle"
  | "status-transition"
  | "handover";
const KINDS: EditableKind[] = [
  "section",
  "include",
  "mcp-server",
  "hook",
  "skill",
  "bundle",
  "status-transition",
  "handover",
];
// N137 — "bundle" is surfaced to users as "Composed module"; the rest use their raw kind.
const KIND_LABELS: Record<EditableKind, string> = {
  section: "section",
  include: "include",
  "mcp-server": "mcp-server",
  hook: "hook",
  skill: "skill",
  bundle: "Composed module (bundle)",
  "status-transition": "status transition",
  handover: "handover",
};

interface FormState {
  idTail: string;
  title: string;
  description: string;
  target: "claude" | "cursor" | "both";
  kind: EditableKind;
  heading: string;
  body: string;
  ref: string;
  name: string;
  configText: string;
  event: string;
  matcher: string;
  command: string;
  content: string;
  modules: string[];
  // N128 status-transition + N142 handover fields.
  agent: string;
  sets: string;
  from: string;
  to: string;
  on: string;
  mode: "auto" | "gated";
  label: string;
}

const EMPTY: FormState = {
  idTail: "",
  title: "",
  description: "",
  target: "both",
  kind: "section",
  heading: "",
  body: "",
  ref: "",
  name: "",
  configText: "{}",
  event: "",
  matcher: "",
  command: "",
  content: "",
  modules: [],
  agent: "",
  sets: "",
  from: "",
  to: "",
  on: "",
  mode: "gated",
  label: "",
};

function fromModule(m: ModuleDto): FormState {
  return {
    ...EMPTY,
    idTail: m.id.replace(/^custom:/, ""),
    title: m.title,
    description: m.description ?? "",
    target: m.target ?? "both",
    kind: m.kind as EditableKind,
    heading: m.heading ?? "",
    body: m.body ?? "",
    ref: m.ref ?? "",
    name: m.name ?? "",
    configText: JSON.stringify(m.config ?? {}, null, 2),
    event: m.event ?? "",
    matcher: m.matcher ?? "",
    command: m.command ?? "",
    content: m.content ?? "",
    modules: m.modules ?? [],
    agent: m.agent ?? "",
    sets: m.sets ?? "",
    from: m.from ?? "",
    to: m.to ?? "",
    on: m.on ?? "",
    mode: m.mode ?? "gated",
    label: m.label ?? "",
  };
}

/** Build the wire record; returns field-keyed errors instead when invalid. */
function toRecord(s: FormState): {
  record?: Record<string, unknown>;
  errors?: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!s.idTail.trim()) errors.idTail = "required";
  if (!s.title.trim()) errors.title = "required";

  const record: Record<string, unknown> = {
    id: `custom:${s.idTail.trim()}`,
    title: s.title.trim(),
    kind: s.kind,
    source: "custom",
    ...(s.description.trim() ? { description: s.description.trim() } : {}),
    ...(s.target !== "both" ? { target: s.target } : { target: "both" }),
  };

  switch (s.kind) {
    case "section":
      if (!s.heading.trim() && !s.body.trim()) errors.body = "a heading or a body is required";
      if (s.heading.trim()) record.heading = s.heading.trim();
      record.body = s.body;
      break;
    case "include":
      if (!s.ref.trim()) errors.ref = "required";
      record.ref = s.ref.trim();
      break;
    case "mcp-server": {
      if (!s.name.trim()) errors.name = "required";
      record.name = s.name.trim();
      try {
        const parsed: unknown = JSON.parse(s.configText || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          errors.configText = "must be a JSON object";
        } else {
          record.config = parsed;
        }
      } catch {
        errors.configText = "invalid JSON";
      }
      break;
    }
    case "hook":
      if (!s.event.trim()) errors.event = "required";
      if (!s.command.trim()) errors.command = "required";
      record.event = s.event.trim();
      if (s.matcher.trim()) record.matcher = s.matcher.trim();
      record.command = s.command;
      break;
    case "skill":
      if (!s.name.trim()) errors.name = "required";
      if (!s.content.trim()) errors.content = "required";
      record.name = s.name.trim();
      record.content = s.content;
      break;
    case "bundle":
      if (!s.modules.length) errors.modules = "pick at least one module";
      record.modules = s.modules;
      break;
    case "status-transition":
      if (!s.agent.trim()) errors.agent = "required";
      if (!s.sets.trim()) errors.sets = "required";
      record.agent = s.agent.trim();
      record.sets = s.sets.trim();
      if (s.from.trim()) record.from = s.from.trim();
      break;
    case "handover":
      if (!s.to.trim()) errors.to = "required";
      record.to = s.to.trim();
      if (s.on.trim()) record.on = s.on.trim();
      record.mode = s.mode;
      if (s.label.trim()) record.label = s.label.trim();
      break;
  }

  return Object.keys(errors).length ? { errors } : { record };
}

/** Server zod issue paths → form field keys. */
function fieldForIssuePath(path: string): string {
  if (path === "config") return "configText";
  if (path === "id") return "idTail";
  return path.split(".")[0] || "form";
}

export function ModuleForm() {
  const params = useParams();
  const editId = params["*"] || null; // /module/edit/<id>
  const navigate = useNavigate();
  const { registry, error: registryError } = useRegistry();
  const projectName = useDashboardStore((s) => s.snapshot?.projectName || "");

  const editing = useMemo(
    () => (editId && registry ? (registry.modules.find((m) => m.id === editId) ?? null) : null),
    [editId, registry],
  );

  const [state, setState] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // N137 — search box for the bundle ("Composed module") picker.
  const [pickSearch, setPickSearch] = useState("");

  if (registryError) return <p>Failed to load registry: {registryError}</p>;
  if (!registry) return <p>Loading…</p>;
  if (editId && !editing) return <p>Unknown module “{editId}”.</p>;
  // N120 — locked modules stay read-only; defaults are editable (saving ejects
  // an override into insightFlow/), custom is full CRUD.
  if (editing && isLockedModuleClient(editing)) {
    return (
      <p>
        “{editing.id}” is locked (read-only). <Link to={`/module/${editing.id}`}>Back</Link>
      </p>
    );
  }

  const s = state ?? (editing ? fromModule(editing) : EMPTY);
  const set = (patch: Partial<FormState>): void => setState({ ...s, ...patch });
  // N137 — reorder a bundle's selected modules (declared order is significant at compose).
  const moveModule = (index: number, delta: number): void => {
    const next = [...s.modules];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set({ modules: next });
  };
  const isEdit = Boolean(editing);
  // Editing a built-in keeps its real id (the save ejects an override); custom
  // new/edit builds a custom: id from the tail.
  const editingDefault = Boolean(editing) && !editing!.id.startsWith("custom:");
  const fullId = editingDefault ? editing!.id : `custom:${s.idTail.trim() || "<id>"}`;

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setTopError(null);
    const { record, errors: localErrors } = toRecord(s);
    if (localErrors || !record) {
      setErrors(localErrors ?? {});
      return;
    }
    // Editing a default → write under its real (built-in) id, not a custom: id.
    if (editingDefault) record.id = editing!.id;
    setErrors({});
    setBusy(true);
    try {
      await saveDefinition("modules", record as { id: string }, isEdit);
      invalidateRegistry();
      navigate(`/module/${record.id as string}`);
    } catch (err) {
      if (err instanceof ApiError && err.issues?.length) {
        setErrors(
          Object.fromEntries(err.issues.map((i) => [fieldForIssuePath(i.path), i.message])),
        );
      } else {
        setTopError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    if (!editing) return;
    // N120 — a built-in is reverted to its shipped version; a custom is deleted.
    const msg = editingDefault
      ? `Revert ${editing.id} to the shipped version?`
      : `Delete ${editing.id}? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setTopError(null);
    setBusy(true);
    try {
      await deleteDefinition("modules", editing.id);
      invalidateRegistry();
      navigate(editingDefault ? `/module/${editing.id}` : "/module");
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

  const err = (key: string): ReactNode =>
    errors[key] ? <FieldError>{errors[key]}</FieldError> : null;

  return (
    <>
      <Nav projectName={projectName} />
      <SideLayout
        title={isEdit ? `Edit ${editing!.id}` : "New module"}
        sidebar={
          <Button as={Link} to="/module" $variant="secondary">
            ← All modules
          </Button>
        }
      >
        <Section
          title={
            !isEdit
              ? "Create custom module"
              : editingDefault
                ? `Edit default — saving ejects an override into insightFlow/`
                : "Edit custom module"
          }
        >
          {topError ? <TopError role="alert">{topError}</TopError> : null}
          <FormBox onSubmit={(e) => void submit(e)}>
            <Field>
              Id {err("idTail")}
              <input
                value={s.idTail}
                disabled={isEdit}
                placeholder="my-module"
                onChange={(e) => set({ idTail: slugifyIdTail(e.target.value) })}
              />
              <span>
                Stored as <IdPreview>{fullId}</IdPreview>
              </span>
            </Field>
            <Field>
              Title {err("title")}
              <input value={s.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field>
              Description
              <input value={s.description} onChange={(e) => set({ description: e.target.value })} />
            </Field>
            <Field>
              Harness target
              <select
                value={s.target}
                onChange={(e) => set({ target: e.target.value as FormState["target"] })}
              >
                <option value="both">Claude + Cursor</option>
                <option value="claude">Claude only</option>
                <option value="cursor">Cursor only</option>
              </select>
            </Field>
            <Field>
              Kind
              <select
                value={s.kind}
                disabled={isEdit}
                onChange={(e) => set({ kind: e.target.value as EditableKind })}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>

            {s.kind === "section" ? (
              <>
                <Field>
                  Heading {err("heading")}
                  <input value={s.heading} onChange={(e) => set({ heading: e.target.value })} />
                </Field>
                <Field>
                  Body (markdown) {err("body")}
                  <textarea value={s.body} onChange={(e) => set({ body: e.target.value })} />
                </Field>
              </>
            ) : null}

            {s.kind === "include" ? (
              <Field>
                Include ref (file emitted as @ref) {err("ref")}
                <input
                  value={s.ref}
                  placeholder="AGENT_CUSTOM.md"
                  onChange={(e) => set({ ref: e.target.value })}
                />
              </Field>
            ) : null}

            {s.kind === "mcp-server" ? (
              <>
                <Field>
                  Server name {err("name")}
                  <input value={s.name} onChange={(e) => set({ name: e.target.value })} />
                </Field>
                <Field>
                  Config (JSON object, merged into .mcp.json) {err("configText")}
                  <textarea
                    value={s.configText}
                    onChange={(e) => set({ configText: e.target.value })}
                  />
                </Field>
              </>
            ) : null}

            {s.kind === "hook" ? (
              <>
                <Field>
                  Event {err("event")}
                  <input
                    value={s.event}
                    placeholder="PostToolUse"
                    onChange={(e) => set({ event: e.target.value })}
                  />
                </Field>
                <Field>
                  Matcher (optional) {err("matcher")}
                  <input value={s.matcher} onChange={(e) => set({ matcher: e.target.value })} />
                </Field>
                <Field>
                  Command {err("command")}
                  <textarea value={s.command} onChange={(e) => set({ command: e.target.value })} />
                </Field>
              </>
            ) : null}

            {s.kind === "skill" ? (
              <>
                <Field>
                  Skill name (path segment) {err("name")}
                  <input
                    value={s.name}
                    placeholder="my-skill"
                    onChange={(e) => set({ name: e.target.value })}
                  />
                </Field>
                <Field>
                  SKILL.md content {err("content")}
                  <textarea value={s.content} onChange={(e) => set({ content: e.target.value })} />
                </Field>
              </>
            ) : null}

            {s.kind === "bundle" ? (
              <Field as="div">
                Modules to compose {err("modules")}
                <input
                  placeholder="Search modules…"
                  value={pickSearch}
                  onChange={(e) => setPickSearch(e.target.value)}
                />
                <PickerList>
                  {registry.modules
                    .filter((m) => m.id !== fullId)
                    .filter(
                      (m) =>
                        !pickSearch.trim() ||
                        `${m.id} ${m.title}`
                          .toLowerCase()
                          .includes(pickSearch.trim().toLowerCase()),
                    )
                    .map((m) => (
                      <PickerRow
                        key={m.id}
                        type="button"
                        disabled={s.modules.includes(m.id)}
                        onClick={() => set({ modules: [...s.modules, m.id] })}
                      >
                        <RowTitle>
                          {m.title} · {m.id}
                        </RowTitle>
                        <span>{m.source}</span>
                      </PickerRow>
                    ))}
                </PickerList>
                <div>
                  {s.modules.map((id, i) => (
                    <OrderedRow key={id}>
                      <span>{i + 1}.</span>
                      <RowTitle title={id}>
                        {registry.modules.find((m) => m.id === id)?.title ?? id}
                      </RowTitle>
                      <RowButton type="button" disabled={i === 0} onClick={() => moveModule(i, -1)}>
                        ↑
                      </RowButton>
                      <RowButton
                        type="button"
                        disabled={i === s.modules.length - 1}
                        onClick={() => moveModule(i, 1)}
                      >
                        ↓
                      </RowButton>
                      <RowButton
                        type="button"
                        onClick={() => set({ modules: s.modules.filter((x) => x !== id) })}
                      >
                        ✕
                      </RowButton>
                    </OrderedRow>
                  ))}
                </div>
              </Field>
            ) : null}

            {/* N155 — status pickers here stay canonical: a module is global
                (not bound to one flow), so it can't offer a specific flow's
                custom statuses. Flow-specific triggers are picked in the flow
                editor (FlowEditor.TriggerOptions), which has the flow context. */}
            {s.kind === "status-transition" ? (
              <>
                <Field>
                  Agent (whose completion advances the task) {err("agent")}
                  <select value={s.agent} onChange={(e) => set({ agent: e.target.value })}>
                    <option value="">Pick an agent…</option>
                    {registry.agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} · {a.id}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  Sets status {err("sets")}
                  <select value={s.sets} onChange={(e) => set({ sets: e.target.value })}>
                    <option value="">Pick a status…</option>
                    {TASK_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  Only from status (optional) {err("from")}
                  <select value={s.from} onChange={(e) => set({ from: e.target.value })}>
                    <option value="">(any status)</option>
                    {TASK_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}

            {s.kind === "handover" ? (
              <>
                <Field>
                  Hand over to agent {err("to")}
                  <select value={s.to} onChange={(e) => set({ to: e.target.value })}>
                    <option value="">Pick an agent…</option>
                    {registry.agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} · {a.id}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  On status (optional — blank = direct handoff) {err("on")}
                  <select value={s.on} onChange={(e) => set({ on: e.target.value })}>
                    <option value="">(direct handoff)</option>
                    {TASK_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  Mode
                  <select
                    value={s.mode}
                    onChange={(e) => set({ mode: e.target.value as FormState["mode"] })}
                  >
                    <option value="gated">gated — stop for an explicit human go-ahead</option>
                    <option value="auto">auto — chain the next command in-session</option>
                  </select>
                </Field>
                <Field>
                  Label (optional) {err("label")}
                  <input value={s.label} onChange={(e) => set({ label: e.target.value })} />
                </Field>
              </>
            ) : null}

            <FormActions>
              <Button type="submit" $variant="primary" disabled={busy}>
                {isEdit ? "Save changes" : "Create module"}
              </Button>
              {isEdit ? (
                <Button
                  type="button"
                  $variant="secondary"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  {editingDefault ? "Revert to shipped" : "Delete"}
                </Button>
              ) : null}
              <Button
                as={Link}
                to={isEdit ? `/module/${editing!.id}` : "/module"}
                $variant="secondary"
              >
                Cancel
              </Button>
            </FormActions>
          </FormBox>
        </Section>
      </SideLayout>
    </>
  );
}
