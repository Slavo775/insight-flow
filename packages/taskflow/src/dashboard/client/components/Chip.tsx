import styled from "styled-components";

export const Chip = styled.span`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${(p) => p.theme.color.border};
  padding: 1px 6px;
  border-radius: ${(p) => p.theme.radius.sm};
  font-size: ${(p) => p.theme.font.size.xs};
  color: ${(p) => p.theme.color.textMuted};
`;
