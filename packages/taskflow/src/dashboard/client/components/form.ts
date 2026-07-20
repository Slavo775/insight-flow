import styled from "styled-components";

// N255 — form styled-components shared by ModuleForm / AgentForm / ProjectForm.
// Only the definitions that were provably behavior-preserving to share live here:
// the seven that were byte-identical across the forms, plus `Field` (ModuleForm's
// superset — it also styles select/textarea, which is inert for the input-only
// Agent/Project forms). FormBox / OriginTag / CheckRow / PickerList are NOT here:
// they genuinely differ per form, so merging them would change appearance.

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.space.sm};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.textMuted};

  input,
  select,
  textarea {
    background: ${(p) => p.theme.color.bg};
    color: ${(p) => p.theme.color.text};
    border: 1px solid ${(p) => p.theme.color.border};
    border-radius: ${(p) => p.theme.radius.lg};
    padding: ${(p) => p.theme.space.md};
    font-family: ${(p) => p.theme.font.family};
    font-size: ${(p) => p.theme.font.size.md};
  }

  textarea {
    font-family: monospace;
    min-height: 120px;
  }
`;

export const FieldError = styled.span`
  color: ${(p) => p.theme.color.red};
  font-size: ${(p) => p.theme.font.size.xs};
`;

export const TopError = styled.div`
  border: 1px solid ${(p) => p.theme.color.red};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.md};
  font-size: ${(p) => p.theme.font.size.sm};
`;

export const FormActions = styled.div`
  display: flex;
  gap: ${(p) => p.theme.space.md};
  align-items: center;
`;

export const PickerRow = styled.button`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid ${(p) => p.theme.color.border};
  color: ${(p) => p.theme.color.text};
  font-family: inherit;
  font-size: ${(p) => p.theme.font.size.sm};
  padding: ${(p) => p.theme.space.md};
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${(p) => p.theme.color.border};
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

export const OrderedRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: ${(p) => p.theme.space.sm} ${(p) => p.theme.space.md};
  margin-bottom: ${(p) => p.theme.space.sm};
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.text};
`;

export const RowTitle = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const RowButton = styled.button`
  background: none;
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.md};
  color: ${(p) => p.theme.color.textMuted};
  cursor: pointer;
  padding: 2px 8px;

  &:hover {
    border-color: ${(p) => p.theme.color.accent};
    color: ${(p) => p.theme.color.text};
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;
