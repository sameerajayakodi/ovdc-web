import type { Metadata } from "next";
import Link from "next/link";
import { getProjectContent, getProjects } from "@/lib/api";
import { photos, progressPhotos, projectPhoto } from "@/lib/data/media";
import { routes } from "@/lib/routes";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { PageHero } from "@/components/ui/PageHero";
import c from "@/components/content/content.module.css";
import s from "@/components/project/project.module.css";

export const metadata: Metadata = {
  title: "Construction progress",
  description: "Monthly photographs and percentage complete for every OVDC project under construction.",
};

export default async function ProgressPage() {
  const building = (await getProjects()).filter((p) => p.status === "uc");
  const contents = await Promise.all(building.map((p) => getProjectContent(p.slug)));

  return (
    <>
      <PageHero
        crumb="Construction progress"
        kicker="Updated on the first working day of each month"
        title="On site this month"
        lead="Every project under construction, with photographs and the percentage complete certified by the project architect."
        photo={photos.site2}
      />

      <section className={c.section}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 24 }}>
          {building.map((p) => (
            <a key={p.id} href={`#${p.slug}`} style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 16, borderTop: "2px solid var(--color-rule-strong)", textDecoration: "none" }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</span>
                <span className="nums" style={{ fontFamily: "var(--font-heading)", fontSize: 44, lineHeight: 1 }}>
                  {p.progress}
                  <span style={{ font: "600 20px var(--font-body)" }}>%</span>
                </span>
              </span>
              <span className="muted" style={{ fontSize: 13 }}>
                {p.loc} · completion {p.completion}
              </span>
              <span role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`} className={s.miniBar}>
                <span style={{ width: `${p.progress}%` }} />
              </span>
            </a>
          ))}
        </div>
      </section>

      {building.map((p, idx) => {
        const content = contents[idx];
        return (
          <section key={p.id} id={p.slug} className={`${c.section} ${idx % 2 ? "" : c.surface}`} style={{ scrollMarginTop: 24 }}>
            <div className={c.sectionHead}>
              <div className={c.headText}>
                <span className="kicker" style={{ color: idx % 2 ? undefined : "var(--color-kicker-sand)" }}>
                  {p.loc} · completion {p.completion}
                </span>
                <h2 className="h-section">
                  {p.name} · {p.progress}%
                </h2>
              </div>
              <Link className="btn btn-ghost" href={routes.project(p.slug)}>
                Project details
              </Link>
            </div>
            {content?.progress ? (
              <ol className={s.timeline}>
                {content.progress.updates.map((m, i) => (
                  <li key={m.month}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{m.month}</span>
                      <span className="nums" style={{ fontSize: 20, fontWeight: 600 }}>
                        {m.pct}%
                      </span>
                    </div>
                    <div className="zoom" style={{ position: "relative", aspectRatio: "4/3" }}>
                      <ImageSlot photo={photos[progressPhotos[i % progressPhotos.length]]} alt={`${p.name} site, ${m.month}`} sizes="260px" />
                    </div>
                    <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {m.note}
                    </span>
                    <span className="subtle" style={{ fontSize: 12 }}>
                      Tower A {m.a}% · Tower B {m.b}%
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className={c.split}>
                <div className="zoom" style={{ position: "relative", aspectRatio: "16/10" }}>
                  <ImageSlot photo={photos[projectPhoto[p.slug] ?? "site3"]} sizes="(max-width: 760px) 100vw, 50vw" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p className="lead">Monthly photo sets for {p.name} start with the next update. Subscribe at the foot of this page to receive them by email.</p>
                  <Link className="btn btn-secondary" href={routes.project(p.slug)} style={{ alignSelf: "flex-start" }}>
                    View {p.name}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
