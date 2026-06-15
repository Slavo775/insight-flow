// N106 — create/edit form for custom modules. Kind-specific field sets
// (section / include / mcp-server / hook / skill), harness target, inline
// server-validation mapping, delete with 409-referenced surfacing. Built-ins
// never reach this page (the edit route guards on source === "custom").
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import {
  ApiError,
  deleteDefinition,
  saveDefinition,
  slugifyIdTail,
  type ModuleDto,
} from "./api.js";
import { Button, Section } from "./components/index.js";
import { SideLayout } from "./components/SideLayout.js";
import { invalidateRegistry, useRegistry } from "./registry.js";
import { useDashboardStore } from "./store.js";
import { Nav } from "./ui.js";

const FormBox = styled.form`
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.lg};
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.sm};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.textMuted};

  input,
  select,
  textarea {
    background: ${(p) => p.theme.color.bg};
    color: ${(p) => p.theme.color.text};
    border: 1px solid ${(p) => p.theme.color.border};
    border-radius: ${(p) => p.theme.radius.lg};
    padding: ${(p) => p.theme.space.md};
    font-family: ${(p) => p.theme.font.family};
    font-size: ${(p) => p.theme.font.size.md};
  }

  textarea {
    font-family: monospace;
    min-height: 120px;
  }
`;

const FieldError = styled.span`
  color: ${(p) => p.theme.color.red};
  font-size: ${(p) => p.theme.font.size.xs};
`;

const FormActions = styled.div`
  display: flex;
  gap: ${(p) => p.theme.space.md};
  align-items: center;
`;

const TopError = styled.div`
  border: 1px solid ${(p) => p.theme.color.red};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.md};
  font-size: ${(p) => p.theme.font.size.sm};
`;

const IdPreview = styled.code`
  color: ${(p) => p.theme.color.accent};
`;

export type EditableKind = "section" | "include" | "mcp-server" | "hook" | "skill";
const KINDS: EditableKind[] = ["section", "include", "mcp-server", "hook", "skill"];

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
};

function fromModule(m: ModuleDto): FormState {
  return {
    ...EMPTY,
    idTail: m.id.replace(/^custom:/, ""),
    title: m.title,
    description: m.description ?? "",
    target: m.target ?? "both",
    kind: (m.kind === "bundle" ? "section" : m.kind) as EditableKind,
    heading: m.heading ?? "",
    body: m.body ?? "",
    ref: m.ref ?? "",
    name: m.name ?? "",
    configText: JSON.stringify(m.config ?? {}, null, 2),
    event: m.event ?? "",
    matcher: m.matcher ?? "",
    command: m.command ?? "",
    content: m.content ?? "",
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

  if (registryError) return <p>Failed to load registry: {registryError}</p>;
  if (!registry) return <p>Loading…</p>;
  if (editId && !editing) return <p>Unknown module “{editId}”.</p>;
  if (editing && editing.source !== "custom") {
    return (
      <p>
        Built-in modules are immutable. <Link to={`/module/${editing.id}`}>Back</Link>
      </p>
    );
  }

  const s = state ?? (editing ? fromModule(editing) : EMPTY);
  const set = (patch: Partial<FormState>): void => setState({ ...s, ...patch });
  const isEdit = Boolean(editing);
  const fullId = `custom:${s.idTail.trim() || "<id>"}`;

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setTopError(null);
    const { record, errors: localErrors } = toRecord(s);
    if (localErrors || !record) {
      setErrors(localErrors ?? {});
      return;
    }
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
    if (!window.confirm(`Delete ${editing.id}? This cannot be undone.`)) return;
    setTopError(null);
    setBusy(true);
    try {
      await deleteDefinition("modules", editing.id);
      invalidateRegistry();
      navigate("/module");
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
        sidebar={<Link to="/module">← All modules</Link>}
      >
        <Section title={isEdit ? "Edit custom module" : "Create custom module"}>
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
                    {k}
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

            <FormActions>
              <Button type="submit" $variant="primary" disabled={busy}>
                {isEdit ? "Save changes" : "Create module"}
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
              <Link to={isEdit ? `/module/${editing!.id}` : "/module"}>Cancel</Link>
            </FormActions>
          </FormBox>
        </Section>
      </SideLayout>
    </>
  );
}
