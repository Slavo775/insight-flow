import styled, { type DefaultTheme } from "styled-components";

// N259 — a small KPI tile (label + big number), shared for the project-header card
// and reusable for any dashboard metric. The `tone` colors the number (the design
// uses a plain border + a tone-colored value); `neutral` keeps the default text.

export type StatTone = "neutral" | "green" | "amber" | "violet";

function toneColor(theme: DefaultTheme, tone: StatTone): string {
  switch (tone) {
    case "green":
      return theme.color.green;
    case "amber":
      return theme.color.amber;
    case "violet":
      return theme.color.purple;
    default:
      return theme.color.text;
  }
}

const Tile = styled.div`
  min-width: 0;
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  padding: ${(p) => p.theme.space.xl} ${(p) => p.theme.space["2xl"]};
`;

const Value = styled.div<{ $tone: StatTone }>`
  font-size: ${(p) => p.theme.font.size["3xl"]};
  font-weight: ${(p) => p.theme.font.weight.bold};
  font-variant-numeric: tabular-nums;
  color: ${(p) => toneColor(p.theme, p.$tone)};
`;

const Label = styled.div`
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.textMuted};
  margin-top: 2px;
`;

export function StatTile({
  value,
  label,
  tone = "neutral",
}: {
  value: number;
  label: string;
  tone?: StatTone;
}) {
  return (
    <Tile>
      <Value $tone={tone}>{value}</Value>
      <Label>{label}</Label>
    </Tile>
  );
}
