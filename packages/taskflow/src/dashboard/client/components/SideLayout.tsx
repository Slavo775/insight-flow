// N93 — shared two-pane page shell: left sidebar menu, right content.
// Desktop: fixed sidebar column. Mobile (≤768px): the sidebar collapses behind
// a hamburger button in the page header and opens as a fullscreen overlay with
// touch-friendly items; the overlay closes on navigation (route change) or via
// the ✕ button. Reused by the /module and /agent page families.
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";

export const MOBILE_BP = "768px";

const Shell = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: ${(p) => p.theme.space["2xl"]};
  align-items: start;
  padding: ${(p) => p.theme.space["2xl"]};
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: ${MOBILE_BP}) {
    grid-template-columns: 1fr;
    padding: ${(p) => p.theme.space.lg};
  }
`;

const Sidebar = styled.aside`
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  padding: ${(p) => p.theme.space.xl};
  position: sticky;
  top: ${(p) => p.theme.space["2xl"]};
  max-height: calc(100vh - 48px);
  overflow-y: auto;

  @media (max-width: ${MOBILE_BP}) {
    display: none;
  }
`;

const Content = styled.main`
  min-width: 0; /* allow children (maps, pre blocks) to shrink, not overflow */
`;

const PageBar = styled.div`
  display: none;

  @media (max-width: ${MOBILE_BP}) {
    display: flex;
    align-items: center;
    gap: ${(p) => p.theme.space.lg};
    margin-bottom: ${(p) => p.theme.space.lg};
  }
`;

const Burger = styled.button`
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.xl};
  line-height: 1;
  padding: ${(p) => p.theme.space.lg} ${(p) => p.theme.space.xl};
  cursor: pointer;
`;

const PageTitle = styled.span`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.lg};
  font-weight: ${(p) => p.theme.font.weight.semibold};
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: ${(p) => p.theme.color.bg};
  padding: ${(p) => p.theme.space["2xl"]};
  overflow-y: auto;

  /* touch-friendly: enlarge interactive sidebar items inside the overlay */
  a,
  button {
    min-height: 40px;
  }
`;

const OverlayHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${(p) => p.theme.space["2xl"]};
`;

const CloseBtn = styled(Burger)`
  font-size: ${(p) => p.theme.font.size["2xl"]};
`;

export function SideLayout({
  title,
  sidebar,
  children,
}: {
  title: string;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the fullscreen menu whenever navigation happens.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <Shell>
      <PageBar>
        <Burger type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          ☰
        </Burger>
        <PageTitle>{title}</PageTitle>
      </PageBar>

      <Sidebar>{sidebar}</Sidebar>
      <Content>{children}</Content>

      {menuOpen ? (
        <Overlay>
          <OverlayHead>
            <PageTitle>{title}</PageTitle>
            <CloseBtn type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              ✕
            </CloseBtn>
          </OverlayHead>
          {sidebar}
        </Overlay>
      ) : null}
    </Shell>
  );
}
