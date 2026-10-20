import type { Metadata } from "next";
import Link from "next/link";
import { roles } from "@/lib/data/editorial";
import { photos } from "@/lib/data/media";
import { routes } from "@/lib/routes";
import { PageHero } from "@/components/ui/PageHero";
import { ImageSlot } from "@/components/ui/ImageSlot";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Careers at OVDC",
  description: "Join the engineers, architects and advisors building homes along Sri Lanka’s coast. Open roles in projects, sales, design and marketing.",
};

export default function CareersPage() {
  return (
    <>
      <PageHero
        crumb="Careers"
        kicker="Join OVDC"
        title={
          <>
            Build the homes <em>people keep for life.</em>
          </>
        }
        lead="We are engineers, architects, site managers and advisors who care about getting the details right — and about handing over on time."
        photo={photos.drafting}
      />
      <section className={c.section}>
        <div className={c.sectionHead}>
          <div className={c.headText}>
            <span className="kicker">Open roles</span>
            <h2 className="h-section">{roles.length} positions open</h2>
          </div>
        </div>
        <ul className={c.list}>
          {roles.map((r) => (
            <li key={r.slug} style={{ padding: 0 }}>
              <Link href={routes.career(r.slug)} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", gap: "8px 16px", alignItems: "center", width: "100%", padding: "20px 0", textDecoration: "none" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <strong style={{ fontSize: 20, fontWeight: 600 }}>{r.title}</strong>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {r.summary}
                  </span>
                </span>
                <span className="muted">{r.team}</span>
                <span className="muted">{r.location}</span>
                <span className="label">View →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className={`${c.section} ${c.surface}`}>
        <div className={c.split} style={{ alignItems: "center" }}>
          <div className="zoom" style={{ position: "relative", aspectRatio: "16/10" }}>
            <ImageSlot photo={photos.site5} sizes="(max-width: 760px) 100vw, 50vw" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span className="kicker" style={{ color: "var(--color-kicker-sand)" }}>
              Don’t see your role?
            </span>
            <h2 className="h-section">Send us your CV anyway</h2>
            <p className="lead">We keep strong applications on file for upcoming launches. Email your CV and a short note about the work you do best.</p>
            <a className="btn btn-primary" href="mailto:careers@ovdc.lk?subject=General%20application" style={{ alignSelf: "flex-start" }}>
              careers@ovdc.lk<span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
