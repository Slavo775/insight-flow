import { useEffect, useId, useRef, type ReactNode } from "react";
import styled from "styled-components";

// N231 — the shared modal shell, extracted from the duplicated Backdrop/Dialog/
// header/close pattern in InstallModal + ModuleInfoModal. Provides the backdrop,
// a titled header with a close button, a scrollable body, an optional footer, and
// the shared behaviors: Escape-to-close, backdrop-click-to-close, and a
// mobile-fullscreen layout. Consumers render their own body/footer content.

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: oklch(0.08 0.02 260 / 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${(p) => p.theme.space["2xl"]};

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const Dialog = styled.div`
  display: flex;
  flex-direction: column;
  background: ${(p) => p.theme.color.bg};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius["2xl"]};
  width: min(620px, 100%);
  max-height: 85vh;

  @media (max-width: 768px) {
    width: 100%;
    max-height: 100vh;
    height: 100%;
    border-radius: 0;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${(p) => p.theme.space.lg};
  padding: ${(p) => p.theme.space["2xl"]} ${(p) => p.theme.space["3xl"]};
  border-bottom: 1px solid ${(p) => p.theme.color.border};
`;

const Title = styled.h3`
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.xl};
  margin: 0;
`;

const CloseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  color: ${(p) => p.theme.color.text};
  font-size: ${(p) => p.theme.font.size.lg};
  line-height: 1;
  cursor: pointer;

  &:hover {
    border-color: ${(p) => p.theme.color.accent};
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px ${(p) => p.theme.space["3xl"]};
`;

const Footer = styled.div`
  display: flex;
  gap: ${(p) => p.theme.space.lg};
  justify-content: flex-end;
  padding: ${(p) => p.theme.space["2xl"]} ${(p) => p.theme.space["3xl"]};
  border-top: 1px solid ${(p) => p.theme.color.border};
`;

export function Modal({
  title,
  onClose,
  children,
  footer,
  closeDisabled = false,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Blocks Escape / backdrop / the close button (e.g. while an action runs). */
  closeDisabled?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const disabledRef = useRef(closeDisabled);
  disabledRef.current = closeDisabled;

  // Escape closes; body scroll is locked while open; focus is moved into the
  // dialog on open, trapped inside it (Tab / Shift+Tab), and restored to the
  // triggering element on close (WCAG 2.4.3 / 2.1.2).
  useEffect(() => {
    const dialog = dialogRef.current;
    const prevFocus = document.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : [];

    // Move focus into the dialog (first focusable, else the dialog itself).
    (focusables()[0] ?? dialog)?.focus();

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        if (!disabledRef.current) closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  return (
    <Backdrop onMouseDown={() => !closeDisabled && onClose()}>
      <Dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Header>
          <Title id={titleId}>{title}</Title>
          <CloseBtn type="button" aria-label="Close" disabled={closeDisabled} onClick={onClose}>
            ✕
          </CloseBtn>
        </Header>
        <Body>{children}</Body>
        {footer ? <Footer>{footer}</Footer> : null}
      </Dialog>
    </Backdrop>
  );
}
