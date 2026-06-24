import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

function Hero(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero", styles.hero)}>
      <div className="container">
        <p className={styles.eyebrow}>AI-assisted task lifecycle management</p>
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>
          Design agent flows, run them, and track every task from idea to merge —
          a CLI plus a live dashboard. Built for Claude Code, useful to anyone who
          wants structured, auditable, visual delivery.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/docs/getting-started">
            Get Started →
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/overview">
            What is insight-flow?
          </Link>
        </div>
        <pre className={styles.snippet}>
          <code>npx insight-flow init</code>
        </pre>
      </div>
    </header>
  );
}

type Feature = { title: string; emoji: string; body: ReactNode; to: string };

const FEATURES: Feature[] = [
  {
    title: "Design agent flows",
    emoji: "🧩",
    body: "A visual flow governs every task's lifecycle. Compose agents from modules and customize them in user-space — without forking.",
    to: "/docs/flow",
  },
  {
    title: "Track every task",
    emoji: "📊",
    body: "Tasks carry a spec, a checklist, reviews and incidents — stored as auditable JSON and visualized on a live Kanban + timeline dashboard.",
    to: "/docs/agents",
  },
  {
    title: "Drive it from the CLI",
    emoji: "⌨️",
    body: "One binary owns task state and serves the dashboard. ~40 commands cover create → implement → review → fix → merge, plus incidents.",
    to: "/docs/cli",
  },
];

function Features(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FEATURES.map((f) => (
            <div key={f.title} className={clsx("col col--4", styles.featureCol)}>
              <Link to={f.to} className={styles.featureCard}>
                <div className={styles.featureEmoji}>{f.emoji}</div>
                <Heading as="h3">{f.title}</Heading>
                <p>{f.body}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — ${siteConfig.tagline}`}
      description="Design agent flows, run them, and track every task from idea to merge."
    >
      <Hero />
      <main>
        <Features />
      </main>
    </Layout>
  );
}
