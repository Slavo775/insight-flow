// N127 — "Install this flow" modal. Lists the flow's install plan (task 7),
// runs it via POST /api/flow-install (task 8), and shows each step's outcome.
// The POST response carries the authoritative emitter reports; while it runs we
// also listen to the `install-progress` SSE frames so steps light up live as
// insight-flow writes them. Re-runnable (the emitter is idempotent) and safe to
// close once finished.
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  fetchInstallPlan,
  runInstall,
  fetchUninstallPlan,
  runUninstall,
  restoreMcpServer,
  InstallConflictError,
  type InstallReport,
  type InstallStepDto,
  type UninstallStepDto,
  type InputSpecDto,
  type InstallConflictDto,
  type InstallTargetKind,
} from "../api.js";
import { Button } from "./index.js";
import type { Theme } from "../theme.js";

type ActionToken = "green" | "amber" | "muted";

function tokenColor(token: ActionToken, theme: Theme): string {
  if (token === "green") return theme.color.green;
  if (token === "amber") return theme.color.amber;
  return theme.color.textMuted;
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${(p) => p.theme.space["2xl"]};

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const Dialog = styled.div`
  background: ${(p) => p.theme.color.bg};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius["2xl"]};
  width: min(620px, 100%);
  max-height: 85vh;
  overflow-y: auto;
  padding: ${(p) => p.theme.space["3xl"]};

  @media (max-width: 768px) {
    width: 100%;
    max-height: 100vh;
    height: 100%;
    border-radius: 0;
  }
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: ${(p) => p.theme.space.lg};
  margin-bottom: ${(p) => p.theme.space.lg};
`;

const Title = styled.h3`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.xl};
  margin: 0;
`;

const CloseBtn = styled.button`
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.lg};
  line-height: 1;
  padding: ${(p) => p.theme.space.md} ${(p) => p.theme.space.lg};
  cursor: pointer;

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

const Lead = styled.p`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.sm};
  margin: 0 0 ${(p) => p.theme.space.lg};
`;

const StepList = styled.ul`
  list-style: none;
  margin: 0 0 ${(p) => p.theme.space.lg};
  padding: 0;
`;

const StepRow = styled.li`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  padding: ${(p) => p.theme.space.md} 0;
  border-bottom: 1px solid ${(p) => p.theme.color.border};
  font-size: ${(p) => p.theme.font.size.sm};

  &:last-child {
    border-bottom: none;
  }
`;

const StepIcon = styled.span<{ $token: ActionToken }>`
  color: ${(p) => tokenColor(p.$token, p.theme)};
  width: 1.25em;
  text-align: center;
  flex: none;
`;

const StepLabel = styled.span`
  color: ${(p) => p.theme.color.text};
  flex: 1;
`;

const StepTarget = styled.code`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.xs};
`;

const StepAction = styled.span<{ $token: ActionToken }>`
  color: ${(p) => tokenColor(p.$token, p.theme)};
  font-size: ${(p) => p.theme.font.size.xs};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex: none;
`;

const Summary = styled.div<{ $tone: "ok" | "error" }>`
  border: 1px solid ${(p) => (p.$tone === "ok" ? p.theme.color.green : p.theme.color.red)};
  color: ${(p) => (p.$tone === "ok" ? p.theme.color.green : p.theme.color.red)};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.md};
  margin-bottom: ${(p) => p.theme.space.lg};
  font-size: ${(p) => p.theme.font.size.sm};
`;

const Actions = styled.div`
  display: flex;
  gap: ${(p) => p.theme.space.lg};
  justify-content: flex-end;
`;

// N165 — input fields for `${VAR}` placeholders + the conflict diff.
const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.sm};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.textMuted};
  margin-bottom: ${(p) => p.theme.space.md};

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

const FieldHint = styled.span`
  color: ${(p) => p.theme.color.textMuted};
  font-size: ${(p) => p.theme.font.size.xs};
`;

// N165 — "saved" affordance: a value is already stored locally (the value itself
// never leaves the server; this is just the indicator).
const FieldLabelRow = styled.span`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
`;

const SavedBadge = styled.span`
  color: ${(p) => p.theme.color.green};
  border: 1px solid ${(p) => p.theme.color.green};
  border-radius: ${(p) => p.theme.radius.pill};
  font-size: ${(p) => p.theme.font.size.xs};
  padding: 0 ${(p) => p.theme.space.md};
`;

const DiffBox = styled.div`
  border: 1px solid ${(p) => p.theme.color.amber};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.md};
  margin-bottom: ${(p) => p.theme.space.lg};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.text};

  pre {
    background: ${(p) => p.theme.color.surface};
    border-radius: ${(p) => p.theme.radius.md};
    padding: ${(p) => p.theme.space.md};
    margin: ${(p) => p.theme.space.sm} 0 0;
    overflow-x: auto;
    font-size: ${(p) => p.theme.font.size.xs};
    color: ${(p) => p.theme.color.text};
  }
`;

type Phase = "idle" | "running" | "done" | "failed";

const ACTION_STYLE: Record<
  InstallReport["action"],
  { label: string; glyph: string; token: ActionToken }
> = {
  created: { label: "added", glyph: "✚", token: "green" },
  updated: { label: "updated", glyph: "✚", token: "green" },
  unchanged: { label: "up to date", glyph: "✓", token: "muted" },
  removed: { label: "removed", glyph: "−", token: "amber" },
};

/** SSE frame shapes emitted by POST /api/flow-install (server index.ts). */
interface ProgressFrame {
  phase: "started" | "step" | "done" | "failed";
  target?: string;
  action?: InstallReport["action"];
  reports?: InstallReport[];
  error?: string;
}

// N174 — the modal installs or uninstalls any target (flow | agent | module).
export interface InstallTargetRef {
  kind: InstallTargetKind;
  id: string;
  title: string;
}

const KIND_LABEL: Record<InstallTargetKind, string> = {
  flow: "flow",
  agent: "agent",
  module: "module",
};

export function InstallModal({
  target,
  mode = "install",
  onClose,
}: {
  target: InstallTargetRef;
  mode?: "install" | "uninstall";
  onClose: () => void;
}) {
  const uninstalling = mode === "uninstall";
  const kindLabel = KIND_LABEL[target.kind];
  // Install plan (no action until run) vs uninstall plan (removed/retained known up front).
  const [plan, setPlan] = useState<InstallStepDto[] | null>(null);
  const [uplan, setUplan] = useState<UninstallStepDto[] | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  // target → emitter action; populated live from SSE and finalized from the
  // POST response. The emitter reports per file, so several plan steps that
  // share a target (e.g. multiple hooks → .claude/settings.json) resolve to the
  // same action — the honest granularity insight-flow actually writes at.
  const [actions, setActions] = useState<Record<string, InstallReport["action"]>>({});
  const [runError, setRunError] = useState<string | null>(null);
  // N165 — collected `${VAR}` input values + a structured conflict (if any).
  const [requiredInputs, setRequiredInputs] = useState<InputSpecDto[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<InstallConflictDto | null>(null);
  // N172 — the conflict that was just overwritten (kept so we can offer Undo).
  const [lastOverwrite, setLastOverwrite] = useState<InstallConflictDto | null>(null);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  // Load the plan once.
  useEffect(() => {
    let alive = true;
    if (uninstalling) {
      fetchUninstallPlan(target.kind, target.id).then(
        (res) => alive && setUplan(res.plan),
        (e: unknown) => alive && setPlanError(e instanceof Error ? e.message : String(e)),
      );
    } else {
      fetchInstallPlan(target.kind, target.id).then(
        (res) => {
          if (!alive) return;
          setPlan(res.plan);
          setRequiredInputs(res.requiredInputs);
        },
        (e: unknown) => alive && setPlanError(e instanceof Error ? e.message : String(e)),
      );
    }
    return () => {
      alive = false;
    };
  }, [target.kind, target.id, uninstalling]);

  // Escape / backdrop close — blocked mid-run so a run isn't abandoned.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && phaseRef.current !== "running") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (force = false): Promise<void> => {
    setRunError(null);
    if (!uninstalling) {
      // N172 — overwriting? capture the conflict so we can offer an undo on success.
      if (force && conflict) setLastOverwrite(conflict);
      else if (!force) setLastOverwrite(null);
      setConflict(null);
    }
    setActions({});
    setPhase("running");
    // Open the progress stream and wait for it to CONNECT before the POST: the
    // server emits the progress frames synchronously inside the request handler,
    // so a listener attached after the POST would miss them. We await `onopen`
    // (with a short fallback so a blocked SSE never hangs the run).
    const es = new EventSource("/sse");
    const eventName = uninstalling ? "uninstall-progress" : "install-progress";
    es.addEventListener(eventName, (e) => {
      const frame = JSON.parse((e as MessageEvent).data) as ProgressFrame;
      if (frame.phase === "step" && frame.target && frame.action) {
        const { target: t, action } = frame;
        setActions((prev) => ({ ...prev, [t]: action }));
      }
    });
    try {
      await new Promise<void>((resolve) => {
        es.onopen = () => resolve();
        setTimeout(resolve, 1500); // fall through if onopen never fires
      });
      const reports = uninstalling
        ? await runUninstall(target.kind, target.id)
        : await runInstall(target.kind, target.id, { values, force });
      // The response is authoritative — fold every report in by target.
      const final: Record<string, InstallReport["action"]> = {};
      for (const r of reports) final[r.target] = r.action;
      setActions(final);
      setPhase("done");
    } catch (err) {
      // N165 — a differing config comes back as a structured conflict: surface
      // the before/after diff and let the user choose to overwrite.
      if (err instanceof InstallConflictError) {
        setConflict(err.conflict);
      } else {
        setRunError(err instanceof Error ? err.message : String(err));
      }
      setPhase("failed");
    } finally {
      es.close();
    }
  };

  // N172 — undo the last overwrite: restore the prior `.mcp.json` server entry.
  const undoOverwrite = async (): Promise<void> => {
    if (!lastOverwrite || lastOverwrite.kind !== "mcp") return;
    try {
      await restoreMcpServer(lastOverwrite.name);
      setLastOverwrite(null);
      setRunError(null);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
    }
  };

  const running = phase === "running";

  const installStepStatus = (
    step: InstallStepDto,
  ): { glyph: string; token: ActionToken; label: string } => {
    const action = actions[step.target];
    if (action) return ACTION_STYLE[action];
    return running
      ? { glyph: "◌", token: "muted", label: "" }
      : { glyph: "○", token: "muted", label: "" };
  };

  // N174 — an uninstall step is either retained (kept; still owned by another
  // target) or removed. Live SSE upgrades a pending "removed" to its final state.
  const uninstallStepStatus = (
    step: UninstallStepDto,
  ): { glyph: string; token: ActionToken; label: string } => {
    if (step.action === "retained") {
      return { glyph: "•", token: "muted", label: "kept (still used)" };
    }
    const action = actions[step.target];
    if (action === "removed") return ACTION_STYLE.removed;
    return running
      ? { glyph: "◌", token: "amber", label: "" }
      : { glyph: "○", token: "amber", label: "removed" };
  };

  const verb = uninstalling ? "Uninstall" : "Install";
  const planLoaded = uninstalling ? uplan : plan;
  const planEmpty = planLoaded != null && planLoaded.length === 0;

  return (
    <Backdrop onClick={() => !running && onClose()}>
      <Dialog role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <TopRow>
          <Title>
            {verb} “{target.title}”
          </Title>
          <CloseBtn type="button" aria-label="Close" disabled={running} onClick={onClose}>
            ✕
          </CloseBtn>
        </TopRow>

        {planError ? (
          <Summary $tone="error">
            Could not load the {verb.toLowerCase()} plan: {planError}
          </Summary>
        ) : null}

        {!planLoaded && !planError ? (
          <Lead>Loading the {verb.toLowerCase()} plan…</Lead>
        ) : null}

        {planEmpty ? (
          <Lead>
            {uninstalling
              ? `Nothing to uninstall — this ${kindLabel} owns no installed artifacts.`
              : `This ${kindLabel} contributes no installable artifacts (no MCP servers, hooks, or skills).`}
          </Lead>
        ) : null}

        {!uninstalling && requiredInputs.length > 0 ? (
          <>
            <Lead>
              This {kindLabel} needs {requiredInputs.length} value
              {requiredInputs.length === 1 ? "" : "s"}. They are substituted into{" "}
              <code>.mcp.json</code> at install and saved locally (gitignored), so you won&apos;t be
              asked again. Leave a field blank to reuse a saved value.
            </Lead>
            {requiredInputs.map((inp) => (
              <Field key={inp.name}>
                <FieldLabelRow>
                  {inp.title}
                  {inp.saved ? <SavedBadge>✓ saved</SavedBadge> : null}
                </FieldLabelRow>
                <input
                  type={inp.secret ? "password" : "text"}
                  autoComplete="off"
                  placeholder={
                    inp.saved
                      ? "•••••• saved — leave blank to reuse"
                      : inp.secret
                        ? "••••••"
                        : inp.name
                  }
                  value={values[inp.name] ?? ""}
                  disabled={running}
                  onChange={(e) => setValues((prev) => ({ ...prev, [inp.name]: e.target.value }))}
                />
                {inp.saved ? (
                  <FieldHint>Saved locally — leave blank to reuse, or type to change.</FieldHint>
                ) : inp.description ? (
                  <FieldHint>{inp.description}</FieldHint>
                ) : null}
              </Field>
            ))}
          </>
        ) : null}

        {!uninstalling && plan && plan.length > 0 ? (
          <>
            <Lead>
              insight-flow will write {plan.length} artifact{plan.length === 1 ? "" : "s"} into this
              project. Re-running is safe — unchanged files are left alone.
            </Lead>
            <StepList>
              {plan.map((step) => {
                const status = installStepStatus(step);
                return (
                  <StepRow key={`${step.kind}:${step.key}`} title={`written to ${step.target}`}>
                    <StepIcon $token={status.token}>{status.glyph}</StepIcon>
                    <StepLabel>{step.label}</StepLabel>
                    <StepTarget>{step.target}</StepTarget>
                    {status.label ? (
                      <StepAction $token={status.token}>{status.label}</StepAction>
                    ) : null}
                  </StepRow>
                );
              })}
            </StepList>
          </>
        ) : null}

        {uninstalling && uplan && uplan.length > 0 ? (
          <>
            <Lead>
              Removing this {kindLabel}&apos;s artifacts. Anything still used by another installed
              flow, agent, or module is <strong>kept</strong>.
            </Lead>
            <StepList>
              {uplan.map((step) => {
                const status = uninstallStepStatus(step);
                return (
                  <StepRow key={`${step.kind}:${step.key}`} title={`from ${step.target}`}>
                    <StepIcon $token={status.token}>{status.glyph}</StepIcon>
                    <StepLabel>{step.label}</StepLabel>
                    <StepTarget>{step.target}</StepTarget>
                    {status.label ? (
                      <StepAction $token={status.token}>{status.label}</StepAction>
                    ) : null}
                  </StepRow>
                );
              })}
            </StepList>
          </>
        ) : null}

        {phase === "done" ? (
          <Summary $tone="ok">
            {uninstalling
              ? `Uninstall complete — removed ${target.title}'s artifacts.`
              : `Install complete — ${target.title} is wired into this project.`}
          </Summary>
        ) : null}
        {/* N172 — offer to undo the overwrite we just performed. */}
        {!uninstalling && phase === "done" && lastOverwrite && lastOverwrite.kind === "mcp" ? (
          <DiffBox>
            Overwrote <strong>{lastOverwrite.name}</strong>. Changed your mind?
            <div style={{ marginTop: 8 }}>
              <Button type="button" $variant="secondary" onClick={() => void undoOverwrite()}>
                ↩ Undo overwrite (restore previous)
              </Button>
            </div>
          </DiffBox>
        ) : null}
        {!uninstalling && phase === "failed" && conflict ? (
          <DiffBox>
            <strong>{conflict.name}</strong> already exists with a different config. Review the
            change, then overwrite to replace it (secret values are masked).
            <div>
              <FieldHint>installed</FieldHint>
              <pre>{JSON.stringify(conflict.installed, null, 2)}</pre>
            </div>
            <div>
              <FieldHint>incoming</FieldHint>
              <pre>{JSON.stringify(conflict.incoming, null, 2)}</pre>
            </div>
          </DiffBox>
        ) : null}
        {phase === "failed" && !conflict ? (
          <Summary $tone="error">
            {verb} failed: {runError}
          </Summary>
        ) : null}

        <Actions>
          <Button type="button" $variant="nav" disabled={running} onClick={onClose}>
            {phase === "done" ? "Close" : "Cancel"}
          </Button>
          {!uninstalling && conflict ? (
            <Button
              type="button"
              $variant="danger"
              disabled={running}
              onClick={() => void run(true)}
            >
              {running ? "Overwriting…" : "Overwrite"}
            </Button>
          ) : null}
          {planLoaded && planLoaded.length > 0 ? (
            <Button
              type="button"
              $variant={uninstalling ? "danger" : "primary"}
              disabled={running}
              onClick={() => void run(false)}
            >
              {running
                ? uninstalling
                  ? "Uninstalling…"
                  : "Installing…"
                : phase === "done"
                  ? "Run again"
                  : phase === "failed"
                    ? "Retry"
                    : verb}
            </Button>
          ) : null}
        </Actions>
      </Dialog>
    </Backdrop>
  );
}
