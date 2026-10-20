"use client";

import Link from "next/link";
import { useState } from "react";
import type { Project, ProjectStatus } from "@/lib/types";
import { routes } from "@/lib/routes";
import { ProjectCard } from "@/components/projects/ProjectCard";
import styles from "./home.module.css";

const TABS: { k: ProjectStatus; label: string }[] = [
  { k: "done", label: "Completed" },
  { k: "uc", label: "Under construction" },
  { k: "soon", label: "Upcoming" },
];

export function Portfolio({ projects }: { projects: Project[] }) {
  const [tab, setTab] = useState<ProjectStatus>("uc");
  const shown = projects.filter((p) => p.status === tab);

  return (
    <section id="projects" className={`section ${styles.stack}`} data-reveal>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className="kicker">01 · Portfolio</span>
          <h2 className="h-section">Our developments</h2>
        </div>
        <div role="tablist" aria-label="Filter by status" className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.k}
              role="tab"
              id={`tab-${t.k}`}
              aria-selected={tab === t.k}
              aria-controls="portfolio-panel"
              onClick={() => setTab(t.k)}
            >
              {t.label}
              <span className="nums" style={{ fontWeight: 400 }}>
                0{projects.filter((p) => p.status === t.k).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div id="portfolio-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className={styles.projectGrid}>
        {shown.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>
      <Link className="btn btn-secondary" href={routes.projects} style={{ alignSelf: "flex-start" }}>
        View all projects<span aria-hidden>→</span>
      </Link>
    </section>
  );
}
