import type { Metadata } from "next";
import Link from "next/link";
import { leadership, milestones, stats, why } from "@/lib/data/content";
import { photos, type PhotoKey } from "@/lib/data/media";
import { routes } from "@/lib/routes";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { PageHero } from "@/components/ui/PageHero";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "About OVDC",
  description: "Ocean View Development Company has built homes along Sri Lanka’s western coast since 1998. Our story, values, leadership and milestones.",
};

const WHY_PHOTO: Record<string, PhotoKey> = { excellence: "kitchen", trust: "keys", innovation: "solar" };

export default function AboutPage() {
  return (
    <>
      <PageHero
        crumb="About"
        kicker="Since 1998"
        title={
          <>
            We build homes <em>to be handed down.</em>
          </>
        }
        lead="Ocean View Development Company designs, builds and looks after residences along Sri Lanka’s western coast — from Negombo to Mount Lavinia — and in the hills of Kandy."
        photo={photos.colomboGolden}
      />

      <section className={c.section}>
        <div className={c.split}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span className="kicker">Our story</span>
            <h2 className="h-section">From twelve garden apartments to the coast’s most trusted towers</h2>
          </div>
          <div className={c.prose}>
            <p>
              OVDC began in 1998 with twelve garden apartments in Dehiwala and a promise to hand them over on the date in the
              contract. That promise still sets how we work: we build a show apartment before we sell, we publish construction
              progress every month, and we stay on as the building’s manager after handover.
            </p>
            <p>
              Today our team of architects, engineers and site managers delivers apartments, townhouses and villas for families
              in Sri Lanka and for Sri Lankans living in Australia, the Gulf and the UK — many of whom choose their home through our
              360° tours before they ever see it in person.
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", borderTop: "2px solid var(--color-rule-strong)" }}>
          {stats.map((s) => (
            <div key={s.label} className={c.stat}>
              <span className={`${c.statValue} nums`}>
                {s.to.toLocaleString("en-US")}
                <span style={{ color: "var(--color-gold-display)" }}>{s.suffix}</span>
              </span>
              <span className="label muted">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={`${c.section} ${c.navyBand}`}>
        <div className={c.headText}>
          <span className="kicker">What we stand for</span>
          <h2 className="h-section">Three promises in every sale agreement</h2>
        </div>
        <div className={c.cards}>
          {why.map((w) => (
            <div key={w.id} className={c.card} style={{ borderTopColor: "var(--color-rule-dark-strong)" }}>
              <span className={`zoom ${c.media}`}>
                <ImageSlot photo={photos[WHY_PHOTO[w.id]]} tone="dark" sizes="(max-width: 760px) 100vw, 33vw" />
              </span>
              <h3 className={c.cardTitle} style={{ color: "var(--color-gold)", fontStyle: "italic", fontSize: 40 }}>
                {w.title}
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--color-on-navy-muted)" }}>{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={c.section}>
        <div className={c.split}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 24 }}>
            <span className="kicker">Milestones</span>
            <h2 className="h-section">Twenty-eight years on the coast</h2>
            <div className="zoom" style={{ position: "relative", aspectRatio: "4/3", marginTop: 12 }}>
              <ImageSlot photo={photos.drafting} sizes="(max-width: 760px) 100vw, 50vw" />
            </div>
          </div>
          <ol className={c.timeline}>
            {milestones.map((m) => (
              <li key={m.year}>
                <span className={c.timelineYear}>{m.year}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <strong style={{ fontSize: 17 }}>{m.title}</strong>
                  <span className="muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                    {m.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${c.section} ${c.surface}`}>
        <div className={c.sectionHead}>
          <div className={c.headText}>
            <span className="kicker" style={{ color: "var(--color-kicker-sand)" }}>
              Leadership
            </span>
            <h2 className="h-section">The people accountable for every handover</h2>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))", gap: 24 }}>
          {leadership.map((l) => (
            <figure key={l.id} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <div className={c.monogram} aria-hidden>
                {l.role
                  .split(/[\s,]+/)
                  .filter((w) => /^[A-Z]/.test(w))
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <figcaption style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <strong style={{ fontSize: 17 }}>{l.name}</strong>
                <span className="muted" style={{ fontSize: 14 }}>
                  {l.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={c.cta}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="kicker">Work with us</span>
          <h2 style={{ fontSize: "clamp(32px, 3.6vw, 48px)", lineHeight: 1 }}>Build the coast’s next landmark</h2>
        </div>
        <div className={c.ctaActions}>
          <Link className="btn btn-primary btn-lg" href={routes.careers}>
            Open roles<span aria-hidden>→</span>
          </Link>
          <Link className="btn btn-secondary on-dark btn-lg" href={routes.awards}>
            Awards &amp; certifications
          </Link>
        </div>
      </section>
    </>
  );
}
