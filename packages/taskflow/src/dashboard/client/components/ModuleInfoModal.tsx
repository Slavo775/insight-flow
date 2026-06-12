// N93 change request R1 — module info modal for the agent composition map:
// clicking a module node opens this overlay instead of navigating away.
// Shows the same header + kind-specific panels as the module page, plus a
// link to the full page. Closes via ✕, backdrop click, or Escape.
import { useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import type { ModuleDto } from "../api.js";
import { KindPanels, ModuleHeader } from "../ModuleDetail.js";

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
  width: min(720px, 100%);
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
  justify-content: flex-end;
  gap: ${(p) => p.theme.space["2xl"]};
  align-items: center;
  margin-bottom: ${(p) => p.theme.space.lg};
`;

const FullPageLink = styled(Link)`
  color: ${(p) => p.theme.color.accent};
  font-size: ${(p) => p.theme.font.size.sm};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
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
`;

export function ModuleInfoModal({ module, onClose }: { module: ModuleDto; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Backdrop onClick={onClose}>
      <Dialog role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <TopRow>
          <FullPageLink to={`/module/${module.id}`}>Open full page →</FullPageLink>
          <CloseBtn type="button" aria-label="Close" onClick={onClose}>
            ✕
          </CloseBtn>
        </TopRow>
        <ModuleHeader module={module} />
        <KindPanels module={module} />
      </Dialog>
    </Backdrop>
  );
}
