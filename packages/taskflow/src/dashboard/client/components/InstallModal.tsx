// N127 — "Install this flow" modal. Lists the flow's install plan (task 7),
// runs it via POST /api/flow-install (task 8), and shows each step's outcome.
// The POST response carries the authoritative emitter reports; while it runs we
// also listen to the `install-progress` SSE frames so steps light up live as
// insight-flow writes them. Re-runnable (the emitter is idempotent) and safe to
// close once finished.
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  fetchFlowInstallPlan,
  runFlowInstall,
  type InstallReport,
  type InstallStepDto,
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

export function InstallModal({
  flowId,
  flowTitle,
  onClose,
}: {
  flowId: string;
  flowTitle: string;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<InstallStepDto[] | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  // target → emitter action; populated live from SSE and finalized from the
  // POST response. The emitter reports per file, so several plan steps that
  // share a target (e.g. multiple hooks → .claude/settings.json) resolve to the
  // same action — the honest granularity insight-flow actually writes at.
  const [actions, setActions] = useState<Record<string, InstallReport["action"]>>({});
  const [runError, setRunError] = useState<string | null>(null);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  // Load the plan once.
  useEffect(() => {
    let alive = true;
    fetchFlowInstallPlan(flowId).then(
      (steps) => alive && setPlan(steps),
      (e: unknown) => alive && setPlanError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      alive = false;
    };
  }, [flowId]);

  // Live progress: listen to install-progress only while an install is running.
  useEffect(() => {
    if (phase !== "running") return;
    const es = new EventSource("/sse");
    es.addEventListener("install-progress", (e) => {
      const frame = JSON.parse((e as MessageEvent).data) as ProgressFrame;
      if (frame.phase === "step" && frame.target && frame.action) {
        const { target, action } = frame;
        setActions((prev) => ({ ...prev, [target]: action }));
      }
    });
    return () => es.close();
  }, [phase]);

  // Escape / backdrop close — blocked mid-install so a run isn't abandoned.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && phaseRef.current !== "running") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const install = async (): Promise<void> => {
    setRunError(null);
    setActions({});
    setPhase("running");
    try {
      const reports = await runFlowInstall(flowId);
      // The response is authoritative — fold every report in by target.
      const final: Record<string, InstallReport["action"]> = {};
      for (const r of reports) final[r.target] = r.action;
      setActions(final);
      setPhase("done");
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
      setPhase("failed");
    }
  };

  const running = phase === "running";

  const stepStatus = (
    step: InstallStepDto,
  ): { glyph: string; token: ActionToken; label: string } => {
    const action = actions[step.target];
    if (action) return ACTION_STYLE[action];
    return running
      ? { glyph: "◌", token: "muted", label: "" }
      : { glyph: "○", token: "muted", label: "" };
  };

  return (
    <Backdrop onClick={() => !running && onClose()}>
      <Dialog role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <TopRow>
          <Title>Install “{flowTitle}”</Title>
          <CloseBtn type="button" aria-label="Close" disabled={running} onClick={onClose}>
            ✕
          </CloseBtn>
        </TopRow>

        {planError ? (
          <Summary $tone="error">Could not load the install plan: {planError}</Summary>
        ) : null}

        {!plan && !planError ? <Lead>Loading the install plan…</Lead> : null}

        {plan && plan.length === 0 ? (
          <Lead>
            This flow contributes no installable artifacts (no MCP servers, hooks, or skills).
          </Lead>
        ) : null}

        {plan && plan.length > 0 ? (
          <>
            <Lead>
              insight-flow will write {plan.length} artifact{plan.length === 1 ? "" : "s"} into this
              project. Re-running is safe — unchanged files are left alone.
            </Lead>
            <StepList>
              {plan.map((step) => {
                const status = stepStatus(step);
                return (
                  <StepRow key={`${step.kind}:${step.key}`}>
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
          <Summary $tone="ok">Install complete — {flowTitle} is wired into this project.</Summary>
        ) : null}
        {phase === "failed" ? <Summary $tone="error">Install failed: {runError}</Summary> : null}

        <Actions>
          <Button type="button" $variant="nav" disabled={running} onClick={onClose}>
            {phase === "done" ? "Close" : "Cancel"}
          </Button>
          {plan && plan.length > 0 ? (
            <Button
              type="button"
              $variant="primary"
              disabled={running}
              onClick={() => void install()}
            >
              {running
                ? "Installing…"
                : phase === "done" || phase === "failed"
                  ? "Run again"
                  : "Install"}
            </Button>
          ) : null}
        </Actions>
      </Dialog>
    </Backdrop>
  );
}
