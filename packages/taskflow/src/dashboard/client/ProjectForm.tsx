// N108 — create a named project flow: pick its own agent set, or duplicate
// from the shipped default. N113 — a new flow no longer inherits the default's
// agents; the author picks them up front (default none). Triggers stay
// constrained to the canonical status enum by the server schema.
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { fetchProject, saveDefinition, slugifyIdTail } from "./api.js";
import { Button, Section } from "./components/index.js";
import { SideLayout } from "./components/SideLayout.js";
import { useRegistry } from "./registry.js";
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

// N113 — the agent multi-select (custom path only).
const AgentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.sm};
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.md};
`;

const AgentCheck = styled.label`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.text};
`;

const OriginTag = styled.span`
  color: ${(p) => p.theme.color.amber};
  font-size: ${(p) => p.theme.font.size.xs};
`;

export function ProjectForm() {
  const navigate = useNavigate();
  const projectName = useDashboardStore((s) => s.snapshot?.projectName || "");
  const { registry } = useRegistry();
  const [idTail, setIdTail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // N113 — duplicate-from-default is now the explicit opt-in (default off);
  // the default new-flow path is "pick your own agents".
  const [duplicate, setDuplicate] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleAgent = (id: string): void =>
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setTopError(null);
    const localErrors: Record<string, string> = {};
    if (!idTail.trim()) localErrors.idTail = "required";
    if (!title.trim()) localErrors.title = "required";
    if (!duplicate && selectedAgents.length === 0) {
      localErrors.agents = "pick at least one agent";
    }
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      // Duplicate-from-default copies agents + flow + install verbatim; the
      // default path (N113) creates the flow with exactly the picked agents
      // and an empty edge set + install — nothing inherited.
      const base = duplicate ? await fetchProject() : null;
      const record = {
        id: `custom:${idTail.trim()}`,
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        agents: base ? base.agents : selectedAgents,
        flow: base ? base.flow : [],
        install: base ? base.install : [],
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
              Duplicate the default flow instead (copies its agents, edges, and install)
            </CheckRow>
            {!duplicate ? (
              <Field as="div">
                Agents {errors.agents ? <FieldError>{errors.agents}</FieldError> : null}
                {!registry ? (
                  <span>Loading agents…</span>
                ) : (
                  <AgentList>
                    {registry.agents.map((a) => (
                      <AgentCheck key={a.id}>
                        <input
                          type="checkbox"
                          checked={selectedAgents.includes(a.id)}
                          onChange={() => toggleAgent(a.id)}
                        />
                        {a.title}
                        {a.source === "custom" ? <OriginTag>· custom</OriginTag> : null}
                      </AgentCheck>
                    ))}
                  </AgentList>
                )}
              </Field>
            ) : null}
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
