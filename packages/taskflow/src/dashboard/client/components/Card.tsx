import styled from "styled-components";

export const Card = styled.div`
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: 10px 12px;
  margin-bottom: ${(p) => p.theme.space.md};
  cursor: default;
  transition: border-color 0.15s;
  &:hover {
    border-color: ${(p) => p.theme.color.accent};
  }
`;

export const CardId = styled.div`
  font-size: ${(p) => p.theme.font.size.sm};
  font-weight: ${(p) => p.theme.font.weight.bold};
  color: ${(p) => p.theme.color.accent};
`;

export const CardTitle = styled.div`
  font-size: ${(p) => p.theme.font.size.base};
  margin-top: ${(p) => p.theme.space.xs};
  line-height: 1.4;
`;

export const CardMeta = styled.div`
  font-size: ${(p) => p.theme.font.size.xs};
  color: ${(p) => p.theme.color.textMuted};
  margin-top: ${(p) => p.theme.space.sm};
  display: flex;
  gap: ${(p) => p.theme.space.md};
`;
