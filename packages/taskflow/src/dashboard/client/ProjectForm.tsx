// N108 — create a named project flow: empty (picks agents later in the
// editor, N109–N111) or duplicated from the shipped default. Triggers stay
// constrained to the canonical status enum by the server schema.
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { fetchProject, saveDefinition, slugifyIdTail } from "./api.js";
import { Button, Section } from "./components/index.js";
import { SideLayout } from "./components/SideLayout.js";
import { useDashboardStore } from "./store.js";
import { Nav } from "./ui.js";

const FormBox = styled.form`
  max-width: 640px;
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

  input {
    background: ${(p) => p.theme.color.bg};
    color: ${(p) => p.theme.color.text};
    border: 1px solid ${(p) => p.theme.color.border};
    border-radius: ${(p) => p.theme.radius.lg};
    padding: ${(p) => p.theme.space.md};
    font-family: ${(p) => p.theme.font.family};
    font-size: ${(p) => p.theme.font.size.md};
  }
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.text};
`;

const FieldError = styled.span`
  color: ${(p) => p.theme.color.red};
  font-size: ${(p) => p.theme.font.size.xs};
`;

const TopError = styled.div`
  border: 1px solid ${(p) => p.theme.color.red};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.md};
  font-size: ${(p) => p.theme.font.size.sm};
`;

export function ProjectForm() {
  const navigate = useNavigate();
  const projectName = useDashboardStore((s) => s.snapshot?.projectName || "");
  const [idTail, setIdTail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duplicate, setDuplicate] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setTopError(null);
    const localErrors: Record<string, string> = {};
    if (!idTail.trim()) localErrors.idTail = "required";
    if (!title.trim()) localErrors.title = "required";
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      // Duplicate-from-default copies agents + flow + install; an empty flow
      // starts with the default's agents so the editor has nodes to wire.
      const base = await fetchProject();
      const record = {
        id: `custom:${idTail.trim()}`,
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        agents: base.agents,
        flow: duplicate ? base.flow : [],
        install: duplicate ? base.install : [],
      };
      await saveDefinition("projects", record, false);
      navigate(`/project/${record.id}`);
    } catch (err) {
      setTopError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Nav projectName={projectName} />
      <SideLayout title="New flow" sidebar={<Link to="/project">← Back to project</Link>}>
        <Section title="Create project flow">
          {topError ? <TopError role="alert">{topError}</TopError> : null}
          <FormBox onSubmit={(e) => void submit(e)}>
            <Field>
              Id {errors.idTail ? <FieldError>{errors.idTail}</FieldError> : null}
              <input
                value={idTail}
                placeholder="hotfix"
                onChange={(e) => setIdTail(slugifyIdTail(e.target.value))}
              />
              <span>
                Stored as <code>custom:{idTail.trim() || "<id>"}</code>
              </span>
            </Field>
            <Field>
              Title {errors.title ? <FieldError>{errors.title}</FieldError> : null}
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field>
              Description
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <CheckRow>
              <input
                type="checkbox"
                checked={duplicate}
                onChange={(e) => setDuplicate(e.target.checked)}
              />
              Duplicate edges + install from the default flow (recommended until the flow editor
              lands)
            </CheckRow>
            <div>
              <Button type="submit" $variant="primary" disabled={busy}>
                Create flow
              </Button>{" "}
              <Link to="/project">Cancel</Link>
            </div>
          </FormBox>
        </Section>
      </SideLayout>
    </>
  );
}
