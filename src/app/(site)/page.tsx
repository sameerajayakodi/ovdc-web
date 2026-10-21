import Link from "next/link";
import { getFeaturedUnits, getProject, getProjects, getSiteSettings, getTestimonials, getTourForType } from "@/lib/api";
import { homeAmenities, stats, why } from "@/lib/data/content";
import { routes } from "@/lib/routes";
import { photos, type PhotoKey } from "@/lib/data/media";
import { HomeSearch } from "@/components/home/HomeSearch";
import { Stats } from "@/components/home/Stats";
import { Portfolio } from "@/components/home/Portfolio";
import { WhySlider } from "@/components/home/WhySlider";
import { VisitForm } from "@/components/home/VisitForm";
import { UnitCard } from "@/components/units/UnitCard";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Icon360 } from "@/components/ui/Icons";
import { Price } from "@/components/ui/Price";
import s from "@/components/home/home.module.css";

const AMENITY_PHOTO: Record<string, PhotoKey> = {
  pool: "poolDay",
  gym: "gym",
  lounge: "library",
  garden: "koiPond",
  kids: "playground",
  concierge: "lobby",
};

/** Optional hero film. Set NEXT_PUBLIC_HERO_VIDEO (e.g. /media/hero.mp4) once the drone film is ready. */
const HERO_VIDEO = process.env.NEXT_PUBLIC_HERO_VIDEO;

export default async function HomePage() {
  const [projects, featured, ovr, testimonials, { company }] = await Promise.all([getProjects(), getFeaturedUnits(), getProject("ocean-view-residences"), getTestimonials(), getSiteSettings()]);
  const tourIds = await Promise.all(featured.map((u) => getTourForType(u.projectSlug, u.type).then((t) => t?.id ?? null)));
  const building = projects.filter((p) => p.status === "uc");

  return (
    <>
      {/* ── Hero ── */}
      <section aria-label="Introduction" className={s.hero}>
        <div className={s.heroMedia}>
          {HERO_VIDEO ? (
            <video src={HERO_VIDEO} poster={photos.heroPool.src + "&w=1920"} autoPlay muted loop playsInline aria-hidden />
          ) : (
            <ImageSlot photo={photos.heroPool} priority sizes="100vw" className={s.heroImage} />
          )}
        </div>
        <div className={s.heroScrim} />
        <div className={s.heroCopy}>
          <span className="kicker kicker-on-navy" style={{ letterSpacing: ".2em" }}>
            Ocean View Development Company · Sri Lanka
          </span>
          <h1 className={s.heroTitle}>
            Homes that face
            <br />
            <em>the ocean.</em>
          </h1>
          <p className={s.heroLead}>Luxury apartments, houses and land along Sri Lanka’s western coast, built to last for generations.</p>
          <div className={s.heroCtas}>
            <Link className="btn btn-primary btn-lg" href={routes.projects}>
              View projects<span aria-hidden>→</span>
            </Link>
            <Link className={`btn btn-lg ${s.glassBtn}`} href={routes.tour("ovr-type-c", "/")}>
              Take a 360° tour
              <Icon360 size={16} />
            </Link>
          </div>
        </div>
        <div className={s.heroFoot}>
          <span className={s.scrollHint}>Scroll to explore</span>
          <span className="only-desktop" style={{ fontSize: 12, color: "var(--color-on-navy-muted)", textAlign: "right" }}>
            Now selling · Ocean View Residences, Mount Lavinia · from <Price mn={68.5} />
          </span>
        </div>
      </section>

      <HomeSearch />
      <Stats stats={stats} />

      <Portfolio projects={projects} />

      {/* ── Amenities ── */}
      <section className={`section rule-top ${s.stack}`} data-reveal>
        <div className={s.head}>
          <div className={s.headText} style={{ maxWidth: 640 }}>
            <span className="kicker">02 · Amenities</span>
            <h2 className="h-section">
              Resort-style living, <em>every day</em>
            </h2>
          </div>
          <p className="lead" style={{ maxWidth: "44ch" }}>
            Every OVDC development is planned around shared spaces that feel like a coastal hotel: the pool, the gym and the
            gardens are part of the home.
          </p>
        </div>
        <div className={s.amenityGrid}>
          {homeAmenities.map((a, i) => (
            <figure key={a.id} className={s.amenity}>
              <div className="zoom" style={{ position: "relative", aspectRatio: "3/2" }}>
                <ImageSlot photo={photos[AMENITY_PHOTO[a.id]]} sizes="(max-width: 760px) 100vw, 33vw" />
              </div>
              <figcaption>
                <span className="kicker nums" style={{ fontSize: 12, letterSpacing: 0 }}>
                  0{i + 1}
                </span>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{a.title}</span>
                <span />
                <span className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {a.body}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <WhySlider items={why} />

      {/* ── Explore in 3D ── */}
      <section className={s.explore} data-reveal>
        <div className={s.exploreText}>
          <span className="kicker kicker-on-navy">04 · Explore in 3D</span>
          <h2 style={{ fontSize: "clamp(40px, 4.6vw, 64px)", lineHeight: 0.98, textWrap: "balance" }}>
            Choose your floor. <em>Walk through your home.</em>
          </h2>
          <p style={{ maxWidth: "46ch", fontSize: 16, lineHeight: 1.65, color: "var(--color-on-navy-muted)" }}>
            Hover over Tower A to see live availability floor by floor, open any unit’s plan, then step inside with a 360°
            tour. Built for buyers in Colombo, Dubai, Melbourne and London alike.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href={routes.explorer("ocean-view-residences")}>
              Open building explorer<span aria-hidden>→</span>
            </Link>
            <Link className="btn btn-secondary on-dark" href={routes.tour("ovr-type-c", "/")}>
              Enter 360° tour<span aria-hidden>◎</span>
            </Link>
          </div>
          <div className={s.exploreFacts}>
            <div>
              <span className="nums">{ovr?.available ?? "—"}</span>
              <span>Units available now</span>
            </div>
            <div>
              <span>5</span>
              <span>Rooms per 360° tour</span>
            </div>
            <div>
              <span>24</span>
              <span>Floors to explore</span>
            </div>
          </div>
        </div>
        <div className={s.exploreTiles}>
          <Link href={routes.explorer("ocean-view-residences", "A", 14)} className={`zoom ${s.exploreTile}`}>
            <ImageSlot tone="dark" photo={photos.towerDusk} sizes="(max-width: 760px) 50vw, 25vw" />
            <div className={s.tileScrim} />
            <span className={s.tileCaption}>
              <span className="kicker kicker-on-navy" style={{ letterSpacing: ".14em" }}>
                Building explorer
              </span>
              <span>
                Floor 14 · 4 of 6 available · from <Price mn={82} />
              </span>
            </span>
          </Link>
          <Link href={routes.tour("ovr-type-c", "/")} className={`zoom ${s.exploreTile}`}>
            <ImageSlot tone="dark" src="/tours/ovr-type-c/master.jpg" alt="360° view of the master bedroom" fit="cover" sizes="(max-width: 760px) 50vw, 25vw" />
            <div className={s.tileScrim} />
            <span className={s.pulse} aria-hidden>
              <span>◎</span>
            </span>
            <span className={s.tileCaption}>
              <span className="kicker kicker-on-navy" style={{ letterSpacing: ".14em" }}>
                360° tour
              </span>
              <span>Unit 14B · Living, kitchen, master, bath, terrace</span>
            </span>
          </Link>
        </div>
      </section>

      {/* ── Featured residences ── */}
      <section className={`section ${s.stack}`} data-reveal>
        <div className={s.head}>
          <div className={s.headText}>
            <span className="kicker">05 · Residences</span>
            <h2 className="h-section">Featured residences</h2>
          </div>
          <Link className="btn btn-ghost" href={routes.explorer("ocean-view-residences")}>
            All available units
          </Link>
        </div>
        <div className={s.unitGrid}>
          {featured.map((u, i) => (
            <UnitCard key={`${u.tower}-${u.id}`} unit={u} projectSlug={u.projectSlug} projectShort="Ocean View" tourId={tourIds[i]} />
          ))}
        </div>
      </section>

      {/* ── Construction progress ── */}
      <section className={s.progress} data-reveal>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="kicker" style={{ color: "var(--color-kicker-sand)" }}>
            06 · On site this month
          </span>
          <h2 className="h-section">Construction progress</h2>
          <div className="zoom" style={{ position: "relative", aspectRatio: "16/10", marginTop: 8 }}>
            <ImageSlot photo={photos.site1} alt="Ocean View Residences construction site, October 2026" sizes="(max-width: 760px) 100vw, 50vw" />
            <div className={s.tileScrim} />
            <span style={{ position: "absolute", left: 16, bottom: 14, fontSize: 13, color: "var(--color-white)" }}>
              Tower A, 17th floor slab · 12 October 2026
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {building.map((p) => (
            <Link key={p.id} href={`${routes.project(p.slug)}#progress`} className={s.progressRow}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {p.loc} · completion {p.completion}
                  </span>
                </span>
                <span className="nums" style={{ fontFamily: "var(--font-heading)", fontSize: 44, lineHeight: 1 }}>
                  {p.progress}
                  <span style={{ font: "600 20px var(--font-body)" }}>%</span>
                </span>
              </div>
              <div role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`} className={s.bar}>
                <span style={{ width: `${p.progress}%` }} />
              </div>
            </Link>
          ))}
          <Link className="btn btn-ghost" href={routes.progress} style={{ alignSelf: "flex-start", marginTop: 12 }}>
            Monthly updates &amp; drone film
          </Link>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className={`section ${s.stack}`} data-reveal>
        <div className={s.headText}>
          <span className="kicker">07 · In their words</span>
          <h2 className="h-section">Ambassadors &amp; homeowners</h2>
        </div>
        <div className={s.testimonials}>
          <div className={s.ambassador}>
            <div className={s.ambassadorMedia}>
              <ImageSlot photo={photos.towerBeach} tone="dark" sizes="(max-width: 1000px) 100vw, 33vw" />
            </div>
            <div className={s.ambassadorCopy}>
              <span aria-hidden className={s.bigQuote}>
                “
              </span>
              <p className={s.ambassadorQuote}>I chose OVDC because they build the way I train: patiently, with no shortcuts.</p>
              <div className={s.ambassadorBy}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>OVDC brand ambassador</span>
                <span style={{ fontSize: 13, color: "var(--color-on-navy-muted)" }}>Full announcement coming soon</span>
              </div>
            </div>
          </div>
          {testimonials.map((t) => (
            <figure key={t.id} className={s.quoteCard}>
              <span aria-label="5 out of 5" style={{ fontSize: 13, letterSpacing: ".2em", color: "var(--color-gold-display)" }}>
                ★★★★★
              </span>
              <blockquote style={{ margin: 0, fontSize: 18, lineHeight: 1.55, textWrap: "pretty" }}>{t.quote}</blockquote>
              <figcaption style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--color-divider)" }}>
                <span aria-hidden className={s.monogram}>
                  {t.name
                    .split(/[\s&]+/)
                    .filter((w) => /^[A-Z]/.test(w) && !/^Dr\.?$/.test(w))
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")}
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {t.role}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── Approvals, partners & awards ── */}
      <section aria-label="Approvals, partner banks and awards" className="wrap" style={{ paddingBottom: "clamp(64px, 8vw, 112px)" }} data-reveal>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "18px 0", borderTop: "2px solid var(--color-rule-strong)", borderBottom: "1px solid var(--color-divider)" }}
        >
          <span className="label" style={{ letterSpacing: ".18em" }}>
            Approvals, partner banks &amp; awards
          </span>
          <Link href={routes.awards} style={{ fontSize: 13 }}>
            All awards &amp; certifications →
          </Link>
        </div>
        <div className={s.trust}>
          <div>
            <span className={s.trustMark}>UDA</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>UDA approved</span>
              <span className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                Every project carries its Urban Development Authority approval number.
              </span>
            </span>
          </div>
          <div>
            <span className={s.trustMark}>CMA</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>CMA registered</span>
              <span className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                Condominium plans registered with the Condominium Management Authority.
              </span>
            </span>
          </div>
          <div style={{ flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Housing-loan partners</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, width: "100%" }}>
              {[1, 2, 3, 4].map((b) => (
                <div key={b} style={{ position: "relative", height: 40 }}>
                  <ImageSlot label={`Bank ${b}`} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <span className={s.trustMark} style={{ background: "var(--color-navy)", color: "var(--color-gold)", fontFamily: "var(--font-heading)", fontSize: 28, border: 0 }}>
              18
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Industry awards</span>
              <span className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                Including Best Luxury Residential Developer 2025 [award body].
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Book a visit ── */}
      <section id="visit" className={`section on-navy ${s.visit}`} data-reveal>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span className="kicker">Book a site visit</span>
          <h2 style={{ fontSize: "clamp(44px, 6vw, 96px)", lineHeight: 0.92 }}>
            See it <em>in person.</em>
          </h2>
          <p className="lead" style={{ maxWidth: "42ch" }}>
            Our sales team will walk you through the show apartment, the site and the payment plans. Visits run daily;
            overseas buyers can book a live video walk-through.
          </p>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginTop: "auto", paddingTop: 24, borderTop: "1px solid var(--color-rule-dark)" }}>
            <a href={company.hotlineHref} style={{ display: "flex", flexDirection: "column", gap: 4, textDecoration: "none" }}>
              <span className="kicker" style={{ letterSpacing: ".14em" }}>
                Hotline
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>{company.hotline}</span>
            </a>
            <a href={company.whatsappHref} style={{ display: "flex", flexDirection: "column", gap: 4, textDecoration: "none" }}>
              <span className="kicker" style={{ letterSpacing: ".14em" }}>
                WhatsApp
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>{company.whatsapp}</span>
            </a>
          </div>
        </div>
        <VisitForm projects={projects.filter((p) => p.status !== "done").map(({ slug, name }) => ({ slug, name }))} />
      </section>
    </>
  );
}
