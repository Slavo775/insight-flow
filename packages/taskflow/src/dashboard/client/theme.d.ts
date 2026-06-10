// Augments styled-components' DefaultTheme so `props.theme` is fully typed as
// the N86 token object — `styled.button\`color: ${(p) => p.theme.color.accent}\``
// is type-checked, no casts needed.
import "styled-components";
import type { Tokens } from "./theme.js";

declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Tokens {}
}
