import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// Project GitHub Pages: https://slavo775.github.io/insight-flow/
const organizationName = "Slavo775";
const projectName = "insight-flow";

const config: Config = {
  title: "insight-flow",
  tagline: "A workbench for AI-assisted task lifecycle management",
  // No favicon/logo asset shipped in this scaffold — add under static/img later.

  url: "https://slavo775.github.io",
  baseUrl: "/insight-flow/",
  trailingSlash: false,

  organizationName,
  projectName,

  // Keep as "warn" (not "throw"): the synced reference pages are generated from
  // canonical root files that may introduce links over time — a broken link
  // should not hard-fail the Pages deploy.
  onBrokenLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  // Synced reference files are plain Markdown (CommonMark), not MDX — the
  // canonical role files contain `<...>` / `{...}` that would break the MDX
  // parser. `detect` processes `.md` as CommonMark and `.mdx` as MDX.
  markdown: {
    format: "detect",
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  presets: [
    [
      "classic",
      {
        docs: {
          // Docs live under /docs; "/" is the custom landing page (src/pages).
          routeBasePath: "/docs",
          sidebarPath: "./sidebars.ts",
          editUrl: `https://github.com/${organizationName}/${projectName}/tree/main/website/`,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: "insight-flow",
      items: [
        { to: "/docs/overview", label: "Overview", position: "left" },
        { to: "/docs/getting-started", label: "Get Started", position: "left" },
        { to: "/docs/cli", label: "CLI", position: "left" },
        { to: "/docs/agents", label: "Agents", position: "left" },
        { to: "/docs/flow", label: "Flow", position: "left" },
        {
          href: `https://github.com/${organizationName}/${projectName}`,
          label: "GitHub",
          position: "right",
        },
        {
          href: "https://www.npmjs.com/package/insight-flow",
          label: "npm",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Overview", to: "/docs/overview" },
            { label: "Getting Started", to: "/docs/getting-started" },
            { label: "CLI", to: "/docs/cli" },
            { label: "Agents", to: "/docs/agents" },
            { label: "Default Flow", to: "/docs/flow" },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: `https://github.com/${organizationName}/${projectName}`,
            },
            {
              label: "npm",
              href: "https://www.npmjs.com/package/insight-flow",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} insight-flow.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
