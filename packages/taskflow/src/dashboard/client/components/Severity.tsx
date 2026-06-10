import styled from "styled-components";

const SEVERITY: Record<string, { bg: string; fg: string }> = {
  critical: { bg: "#4a0f0f", fg: "#fca5a5" },
  high: { bg: "#3b1111", fg: "#ef4444" },
  medium: { bg: "#3b2f06", fg: "#eab308" },
  low: { bg: "#1e3a5f", fg: "#06b6d4" },
};

export const Severity = styled.span<{ $level: string }>`
  font-size: ${(p) => p.theme.font.size.xs};
  padding: 1px 6px;
  border-radius: ${(p) => p.theme.radius.sm};
  font-weight: ${(p) => p.theme.font.weight.medium};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${(p) => (SEVERITY[p.$level] ?? SEVERITY.medium).bg};
  color: ${(p) => (SEVERITY[p.$level] ?? SEVERITY.medium).fg};
`;
