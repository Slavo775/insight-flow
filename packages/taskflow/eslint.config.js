// Flat ESLint config (N82). typescript-eslint recommended (non-type-checked —
// fast, no parserOptions.project needed; `tsc --noEmit` already covers types) +
// eslint-config-prettier so Prettier owns formatting and ESLint owns code rules.
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "templates/**", "test/fixtures/**"] },
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // `_`-prefixed names are intentional throwaways (rest-destructuring omits,
      // unused catch bindings). tsc strict already flags genuinely-unused code.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
);
