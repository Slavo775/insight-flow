import { useEffect, useRef, useState, type ReactNode } from "react";
import styled from "styled-components";

// N258 — a horizontal scroll strip that fades its left/right edge only while
// there is more content to scroll to in that direction. One scroll listener + one
// ResizeObserver drive two data-attributes; the fade is a CSS mask (no extra DOM,
// no per-frame work). Reusable for any overflow-x row (the header nav, the board).

const FADE = "24px";

const Strip = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* the strip is a compact toolbar; the fade cues overflow */
  &::-webkit-scrollbar {
    display: none;
  }

  /* Fade only the edge(s) that have hidden content. Both edges have content: */
  &[data-at-start="false"][data-at-end="false"] {
    mask-image: linear-gradient(
      to right,
      transparent 0,
      #000 ${FADE},
      #000 calc(100% - ${FADE}),
      transparent 100%
    );
  }
  /* Scrolled to the start — only the right edge has hidden content: */
  &[data-at-start="true"][data-at-end="false"] {
    mask-image: linear-gradient(to right, #000 calc(100% - ${FADE}), transparent 100%);
  }
  /* Scrolled to the end — only the left edge has hidden content: */
  &[data-at-start="false"][data-at-end="true"] {
    mask-image: linear-gradient(to right, transparent 0, #000 ${FADE});
  }
  /* No overflow (both true) → no mask. */
`;

/** Tracks whether a horizontally-scrollable element is at its start / end edge. */
export function useScrollEdges<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const T = 1; // px threshold — treat sub-pixel rounding as "at the edge"
      setEdges({ atStart: el.scrollLeft <= T, atEnd: el.scrollLeft >= max - T });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref]);
  return edges;
}

export function ScrollShadow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { atStart, atEnd } = useScrollEdges(ref);
  return (
    <Strip ref={ref} className={className} data-at-start={atStart} data-at-end={atEnd}>
      {children}
    </Strip>
  );
}
