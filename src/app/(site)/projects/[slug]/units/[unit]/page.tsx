import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAllUnitRefs, getProject, getProjectContent, getTourForType, getTowers, getUnit, getUnitTypes, unitRef, getSiteSettings } from "@/lib/api";
import { photos, typePhoto, type PhotoKey } from "@/lib/data/media";
import { UNIT_STATUS } from "@/lib/status";
import { routes } from "@/lib/routes";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Icon360, IconPhone, IconWhatsApp } from "@/components/ui/Icons";
import { PerSqft, Price, PriceLkr } from "@/components/ui/Price";
import { UnitStatusTag } from "@/components/ui/Status";
import { ShortlistShare } from "@/components/project/ProjectActions";
import { FloorPlanSvg } from "@/components/project/FloorPlanSvg";
import { FloorPlate } from "@/components/explorer/FloorPlate";
import { UnitCard } from "@/components/units/UnitCard";
import s from "@/components/units/unitPage.module.css";

type Params = PageProps<"/projects/[slug]/units/[unit]">["params"];

export async function generateStaticParams() {
  return getAllUnitRefs();
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]/units/[unit]">): Promise<Metadata> {
  const { slug, unit } = await params;
  const [p, u] = await Promise.all([getProject(slug), getUnit(slug, unit)]);
  if (!p || !u) return {};
  return {
    title: `${p.name} ${unitRef(u)} · ${u.label}, ${u.view.toLowerCase()} view`,
    description: `${u.label} on floor ${u.floor} of ${p.name}, ${p.loc}: ${u.sqft.toLocaleString("en-US")} sqft, ${u.facing}-facing. ${UNIT_STATUS[u.status].label}.`,
  };
}

export default function UnitPage({ params }: PageProps<"/projects/[slug]/units/[unit]">) {
  return (
    <Suspense fallback={<div className="wrap skeleton" style={{ height: 720, marginTop: 40 }} />}>
      <UnitBody params={params} />
    </Suspense>
  );
}

const GALLERY: PhotoKey[] = ["kitchen", "bedroomSea", "bathroom", "balconySea"];

async function UnitBody({ params }: { params: Params }) {
  const { company } = await getSiteSettings();
  const { slug, unit: ref } = await params;
  const [p, u, towers, types, content] = await Promise.all([getProject(slug), getUnit(slug, ref), getTowers(slug), getUnitTypes(slug), getProjectContent(slug)]);
  if (!p || !u || !towers) notFound();
  const type = types.find((t) => t.type === u.type);
  const tour = await getTourForType(slug, u.type);
  const floor = towers[u.tower].find((f) => f.n === u.floor)!;
  const id = unitRef(u);
  const href = routes.unit(slug, id);
  const status = UNIT_STATUS[u.status];
  const priced = u.status === "A" || u.status === "R";
  const title = `${u.label}, ${u.view.toLowerCase()} view`;
  const similar = Object.values(towers)
    .flatMap((fl) => fl.flatMap((f) => f.units))
    .filter((x) => x.type === u.type && x.status === "A" && !(x.tower === u.tower && x.id === u.id))
    .sort((a, b) => Math.abs(a.floor - u.floor) - Math.abs(b.floor - u.floor))
    .slice(0, 4);
  const booking = Math.round(u.price * 20) / 100;

  return (
    <>
      <div className={`wrap ${s.header}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Breadcrumbs
            items={[
              { label: "Projects", href: routes.projects },
              { label: p.name, href: routes.project(slug) },
              { label: `Tower ${u.tower} · Floor ${u.floor}`, href: routes.explorer(slug, u.tower, u.floor) },
              { label: `Unit ${u.id}` },
            ]}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <UnitStatusTag status={u.status} />
            <span className="badge badge-outline">
              Tower {u.tower} · Floor {u.floor} · {u.type}
            </span>
          </div>
          <h1 className="h-page" style={{ fontSize: "clamp(40px, 5vw, 72px)" }}>
            {title.charAt(0).toUpperCase() + title.slice(1)}
          </h1>
          <span className="muted" style={{ fontSize: 15 }}>
            Unit {id} · {p.name}, {p.loc}
          </span>
        </div>
        <ShortlistShare id={`unit:${slug}:${id}`} name={`Unit ${id}`} path={href} />
      </div>

      <section aria-label="Photos" className={`wrap ${s.gallery}`}>
        <div className={`zoom ${s.galleryMain}`}>
          <ImageSlot photo={photos[typePhoto[u.type] ?? "living"]} priority sizes="(max-width: 760px) 100vw, 60vw" />
          {tour && (
            <Link href={routes.tour(tour.id, href)} className={s.tourLaunch}>
              <span className={s.tourPulse}>
                <Icon360 size={22} stroke="var(--color-navy)" />
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="kicker kicker-on-navy" style={{ letterSpacing: ".14em" }}>
                  360° virtual tour
                </span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Walk through {u.type} · {tour.scenes.length} rooms</span>
              </span>
            </Link>
          )}
        </div>
        {GALLERY.map((k) => (
          <div key={k} className={`zoom ${s.galleryThumb}`}>
            <ImageSlot photo={photos[k]} sizes="(max-width: 760px) 50vw, 20vw" />
          </div>
        ))}
        <p className={s.galleryNote}>Photographs show the {u.type} show apartment and finishes; furniture is not included.</p>
      </section>

      <div className={s.layout}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <section className={s.sec} data-reveal>
            <span className="kicker">The residence</span>
            <div className={s.specGrid}>
              {[
                ["Bedrooms", u.label],
                ["Bathrooms", String(u.baths)],
                ["Interior", `${u.sqft.toLocaleString("en-US")} sqft`],
                ["Balcony", `${u.balcony} sqft`],
                ["Floor", `${u.floor} of ${towers[u.tower][0].n}`],
                ["Facing", u.facing],
                ["View", `${u.view === "Sea" ? "Indian Ocean" : "City skyline"}`],
                ["Parking", u.beds >= 3 ? "2 bays" : "1 bay"],
              ].map(([l, v]) => (
                <div key={l}>
                  <span>{l}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </section>

          {type && (
            <section id="plan" className={s.sec} data-reveal style={{ scrollMarginTop: 80 }}>
              <span className="kicker">Floor plan · {type.type}</span>
              <div className={s.planSplit}>
                <div className={s.planBox}>
                  <FloorPlanSvg rooms={type.rooms} title={`${type.type} · ${type.label}`} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0, borderTop: "2px solid var(--color-rule-strong)" }}>
                  {type.rooms.map((r) => (
                    <div key={r.name} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--color-divider)", fontSize: 14 }}>
                      <span>{r.name}</span>
                      <span className="nums muted">{r.dim}</span>
                    </div>
                  ))}
                  <p className="subtle" style={{ fontSize: 12, paddingTop: 12 }}>
                    Dimensions are approximate and taken from architect’s drawings; final areas are confirmed on the condominium plan.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className={s.sec} data-reveal>
            <span className="kicker">Position on floor {u.floor}</span>
            <div className={s.plateWrap}>
              <FloorPlate units={floor.units} highlight={[u.id]} dark={false} />
            </div>
            <Link className="btn btn-secondary" href={routes.explorer(slug, u.tower, u.floor)} style={{ alignSelf: "flex-start" }}>
              See every unit on this floor<span aria-hidden>→</span>
            </Link>
          </section>

          {priced && content?.payment && (
            <section className={s.sec} data-reveal>
              <span className="kicker">Payment plan for this unit</span>
              <h2 className="h-sub">
                <Price mn={booking} /> to book, the rest as we build
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>When</th>
                      <th className="num">%</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.payment.stages.map((r) => (
                      <tr key={r.stage}>
                        <td style={{ fontWeight: 500 }}>{r.stage}</td>
                        <td className="muted">{r.when}</td>
                        <td className="num">{r.pct}%</td>
                        <td className="num" style={{ fontWeight: 600 }}>
                          <Price mn={Math.round(u.price * r.pct) / 100} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link className="btn btn-ghost" href={`${routes.calculators}?price=${u.price}`} style={{ alignSelf: "flex-start" }}>
                Estimate a housing loan for this unit
              </Link>
            </section>
          )}

          {content?.specs && (
            <section className={s.sec} data-reveal>
              <span className="kicker">Finishes included</span>
              <ul className={s.finishes}>
                {content.specs.slice(1, 6).map((sp) => (
                  <li key={sp.title}>
                    <strong>{sp.title}</strong>
                    <span>{sp.items[0]}</span>
                  </li>
                ))}
              </ul>
              <Link className="btn btn-ghost" href={`${routes.project(slug)}#specs`} style={{ alignSelf: "flex-start" }}>
                Full specification
              </Link>
            </section>
          )}
        </div>

        <aside className={s.aside} aria-label="Price and actions">
          <div className={s.priceCard}>
            <div className={s.priceHead}>
              <span className="kicker" style={{ letterSpacing: ".14em" }}>
                {priced ? "Price" : status.label}
              </span>
              {priced ? (
                <>
                  <span className="nums" style={{ fontFamily: "var(--font-heading)", fontSize: 48, lineHeight: 1 }}>
                    <Price mn={u.price} />
                  </span>
                  <span className="subtle" style={{ fontSize: 13 }}>
                    <PriceLkr mn={u.price} /> <PerSqft mn={u.price} sqft={u.sqft} /> · 20% to book
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 15, lineHeight: 1.5 }}>
                  {u.status === "S"
                    ? "This home has been sold. The same layout is still available on other floors."
                    : "This floor is released with the next price list. Register to hear first."}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "20px 24px 24px" }}>
              {u.status === "A" && (
                <Link className="btn btn-primary btn-block" href={routes.bookVisit({ project: slug, unit: id }) + "&intent=reserve"}>
                  Reserve this unit<span aria-hidden>→</span>
                </Link>
              )}
              <Link className={`btn btn-block ${u.status === "A" ? "btn-secondary" : "btn-primary"}`} href={routes.bookVisit({ project: slug, unit: id })}>
                {u.status === "A" ? "Book a site visit" : u.status === "R" ? "Join the waiting list" : "Register interest"}
                <span aria-hidden>→</span>
              </Link>
              {tour && (
                <Link className="btn btn-ghost" href={routes.tour(tour.id, href)} style={{ alignSelf: "flex-start" }}>
                  Open the 360° tour
                </Link>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingTop: 12, borderTop: "1px solid var(--color-divider)", fontSize: 13 }}>
                <a href={`${company.whatsappHref}?text=${encodeURIComponent(`Hi OVDC, I'm interested in ${p.name} unit ${id}.`)}`} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, textDecoration: "none" }}>
                  <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "50%", background: "var(--status-available)" }}>
                    <IconWhatsApp size={14} stroke="var(--color-white)" />
                  </span>
                  WhatsApp
                </a>
                <a href={company.hotlineHref} className="nums" style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 44, textDecoration: "none" }}>
                  <IconPhone size={14} />
                  {company.hotline}
                </a>
              </div>
              <span className="subtle" style={{ fontSize: 12 }}>
                Prices in other currencies are indicative; the sale agreement is in LKR.
              </span>
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className={`section ${s.similar}`} data-reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <h2 className="h-sub">Same layout, other floors</h2>
            <Link className="btn btn-ghost" href={`${routes.explorer(slug)}?type=${encodeURIComponent(u.type)}`}>
              All {u.type} units
            </Link>
          </div>
          <div className={s.similarGrid}>
            {similar.map((x) => (
              <UnitCard key={`${x.tower}-${x.id}`} unit={x} projectSlug={slug} projectShort={p.name.split(" ").slice(0, 2).join(" ")} tourId={tour?.id} />
            ))}
          </div>
        </section>
      )}

      <div className={s.mobileBar}>
        <a href={company.hotlineHref}>
          <IconPhone />
          Call
        </a>
        <a href={company.whatsappHref}>
          <IconWhatsApp size={18} />
          WhatsApp
        </a>
        <Link href={routes.bookVisit({ project: slug, unit: id })}>
          {u.status === "A" ? "Reserve" : "Enquire"}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </>
  );
}
