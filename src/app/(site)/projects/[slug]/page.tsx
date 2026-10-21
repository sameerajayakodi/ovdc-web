import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProject, getProjectContent, getProjects, getTour, getTowers, getUnitTypes, getSiteSettings } from "@/lib/api";
import { AMENITY_ICONS } from "@/lib/data/content";
import { routes } from "@/lib/routes";
import { UNIT_STATUS } from "@/lib/status";
import type { UnitStatus } from "@/lib/types";
import { Gallery } from "@/components/project/Gallery";
import { SubNav } from "@/components/project/SubNav";
import { FloorPlans, type TypeRow } from "@/components/project/FloorPlans";
import { BrochureForm, EnquiryCard } from "@/components/project/Forms";
import { ProjectMap } from "@/components/project/ProjectMap";
import { ShortlistShare } from "@/components/project/ProjectActions";
import { Accordion } from "@/components/ui/Accordion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { IconPath, IconPhone, IconWhatsApp } from "@/components/ui/Icons";
import { Price } from "@/components/ui/Price";
import { photos, progressPhotos, projectPhoto } from "@/lib/data/media";
import { ProjectBadge, StatusLegend } from "@/components/ui/Status";
import s from "@/components/project/project.module.css";

type Params = PageProps<"/projects/[slug]">["params"];

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const p = await getProject((await params).slug);
  if (!p) return {};
  return { title: `${p.name}, ${p.loc} · ${p.type}`, description: p.blurb };
}

export default function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  return (
    <Suspense fallback={<div className="wrap skeleton" style={{ height: 720, marginTop: 40 }} />}>
      <ProjectBody params={params} />
    </Suspense>
  );
}

async function ProjectBody({ params }: { params: Params }) {
  const { company } = await getSiteSettings();
  const slug = (await params).slug;
  const p = await getProject(slug);
  if (!p) notFound();
  const [content, towers, types, all] = await Promise.all([getProjectContent(slug), getTowers(slug), getUnitTypes(slug), getProjects()]);
  const typeTour = types.find((t) => t.tourId);
  const tour = typeTour?.tourId ? await getTour(typeTour.tourId) : null;

  // Unit-type availability from live inventory.
  const allUnits = towers ? Object.values(towers).flatMap((fl) => fl.flatMap((f) => f.units)) : [];
  const typeRows: TypeRow[] = types.map((t) => {
    const us = allUnits.filter((u) => u.type === t.type);
    const av = us.filter((u) => u.status === "A");
    const k: UnitStatus = av.length > 3 ? "A" : av.length ? "R" : "S";
    return { ...t, from: av.length ? Math.min(...av.map((u) => u.price)) : null, available: av.length, total: us.length, k };
  });

  const sub: [string, string][] = [["overview", "Overview"]];
  if (towers) sub.push(["explorer", "Building explorer"]);
  if (types.length) sub.push(["plans", "Floor plans"]);
  if (content?.amenityGroups) sub.push(["amenities", "Amenities"]);
  if (content?.specs) sub.push(["specs", "Specifications"]);
  sub.push(["location", "Location"]);
  if (content?.payment) sub.push(["payment", "Payment plan"]);
  if (content?.progress) sub.push(["progress", "Progress"]);
  if (content?.faq) sub.push(["faq", "FAQ"]);

  const similar = all.filter((x) => x.slug !== slug && x.status !== "soon").slice(0, 3);
  const amenityCount = content?.amenityGroups?.reduce((n, g) => n + g.items.length, 0) ?? 0;

  return (
    <>
      <div className={`wrap ${s.header}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Breadcrumbs items={[{ label: "Projects", href: routes.projects }, { label: p.name }]} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ProjectBadge status={p.status} suffix={p.status === "uc" ? ` · ${p.progress}%` : ""} />
            <span className="badge badge-outline">{p.uda}</span>
          </div>
          <h1 className="h-page">{p.name}</h1>
          <span className="muted" style={{ fontSize: 15 }}>
            {content?.subline ?? `${p.address} · ${p.type} · ${p.beds}`}
          </span>
        </div>
        <ShortlistShare id={`project:${p.slug}`} name={p.name} path={routes.project(p.slug)} />
      </div>

      <Gallery projectName={p.name} slug={slug} tour={tour} explorer={!!towers} />

      <section aria-label="Key facts" className={s.facts}>
        {[
          { l: "Location", v: p.loc, sub: p.address },
          { l: "Units", v: String(p.units), sub: `${p.available} available` },
          { l: "Floors", v: String(p.floors), sub: p.towers },
          { l: "Completion", v: p.completion, sub: p.status === "uc" ? `${p.progress}% built` : "" },
          { l: "UDA approval", v: p.uda, sub: "CMA registration on completion" },
        ].map((k) => (
          <div key={k.l}>
            <span className={s.factLabel}>{k.l}</span>
            <span className={`${s.factValue} nums`}>{k.v}</span>
            <span className="subtle" style={{ fontSize: 12 }}>
              {k.sub}
            </span>
          </div>
        ))}
        <div>
          <span className={s.factLabel}>Starting price</span>
          <span className={`${s.factValue} nums`}>{p.from ? <Price mn={p.from} /> : p.status === "done" ? "Sold out" : "Register interest"}</span>
          <span className="subtle" style={{ fontSize: 12 }}>
            {types[0] ? `${types[0].type} · ${types[0].label}` : p.beds}
          </span>
        </div>
      </section>

      <SubNav items={sub} />

      <div className={s.layout}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <section id="overview" data-sec="overview" className={s.sec} data-reveal>
            <span className="kicker" style={{ letterSpacing: ".16em" }}>
              Overview
            </span>
            <h2 className="h-sub" style={{ fontSize: "clamp(36px, 3.6vw, 56px)" }}>
              {content?.headline ?? p.blurb}
            </h2>
            {content ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: "20px 40px" }}>
                {content.overview.map((t) => (
                  <p key={t} className="lead" style={{ lineHeight: 1.7 }}>
                    {t}
                  </p>
                ))}
              </div>
            ) : (
              <p className="lead">
                Full details, floor plans and the price list for {p.name} are being finalised. Register your interest and our sales
                team will send them to you first.
              </p>
            )}
            {content && (
              <div className={s.highlights}>
                {content.highlights.map((h) => (
                  <div key={h.l}>
                    <span>{h.v}</span>
                    <span>{h.l}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {towers && (
            <section id="explorer" data-sec="explorer" className={`${s.sec} ${s.secSplit}`} style={{ display: "grid" }} data-reveal>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <span className="kicker" style={{ letterSpacing: ".16em" }}>
                  Building explorer
                </span>
                <h2 className="h-sub">{p.available} homes available today</h2>
                <p className="muted" style={{ fontSize: 15, lineHeight: 1.65 }}>
                  Each bar is a floor of Tower A; each cell a unit, A to F. Open the explorer to see a floor plate, compare units and
                  start a 360° tour.
                </p>
                <StatusLegend />
                <Link className="btn btn-primary" href={routes.explorer(slug)} style={{ alignSelf: "flex-start", marginTop: 8 }}>
                  Open building explorer<span aria-hidden>→</span>
                </Link>
              </div>
              <Link href={routes.explorer(slug, "A")} className={s.tower} aria-label="Tower A availability — open the building explorer">
                <div className={`${s.towerRow} ${s.towerHead}`}>
                  <span />
                  {["A", "B", "C", "D", "E", "F"].map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
                {towers.A.map((f) => (
                  <div key={f.n} className={s.towerRow}>
                    <span>{f.n}</span>
                    {f.units.map((u) => (
                      <span key={u.id} title={`${u.id} · ${UNIT_STATUS[u.status].label}`} style={{ background: UNIT_STATUS[u.status].fill }} />
                    ))}
                  </div>
                ))}
              </Link>
            </section>
          )}

          {typeRows.length > 0 && (
            <section id="plans" data-sec="plans" className={s.sec} data-reveal>
              <span className="kicker" style={{ letterSpacing: ".16em" }}>
                Floor plans &amp; unit types
              </span>
              <h2 className="h-sub">
                {typeRows.length} layouts, {Math.min(...typeRows.map((t) => t.sqft)).toLocaleString("en-US")} to{" "}
                {Math.max(...typeRows.map((t) => t.sqft)).toLocaleString("en-US")} sqft
              </h2>
              <FloorPlans slug={slug} types={typeRows} />
            </section>
          )}

          {content?.amenityGroups && (
            <section id="amenities" data-sec="amenities" className={s.sec} data-reveal>
              <span className="kicker" style={{ letterSpacing: ".16em" }}>
                Amenities
              </span>
              <h2 className="h-sub">{amenityCount} amenities across podium, roof and gardens</h2>
              <div className={s.amenityGroups}>
                {content.amenityGroups.map((g) => (
                  <div key={g.name}>
                    <span className={s.amenityHead}>
                      <IconPath d={AMENITY_ICONS[g.icon]} stroke="var(--color-gold-display)" />
                      {g.name}
                      <span className="subtle" style={{ fontWeight: 400 }}>
                        {g.items.length}
                      </span>
                    </span>
                    <ul className={s.amenityItems}>
                      {g.items.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {content?.specs && (
            <section id="specs" data-sec="specs" className={s.sec} data-reveal>
              <span className="kicker" style={{ letterSpacing: ".16em" }}>
                Specifications
              </span>
              <h2 className="h-sub">Built and finished to last</h2>
              <Accordion
                items={content.specs.map((sp) => ({
                  title: sp.title,
                  body: (
                    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                      {sp.items.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  ),
                }))}
              />
            </section>
          )}

          <section id="location" data-sec="location" className={s.sec} data-reveal>
            <span className="kicker" style={{ letterSpacing: ".16em" }}>
              Location
            </span>
            <h2 className="h-sub">{p.address}</h2>
            <div className={s.secSplit}>
              <div className={s.mapBox}>
                <ProjectMap name={p.name} lat={p.lat} lng={p.lng} nearby={content?.nearby ?? []} />
              </div>
              {content?.nearby ? (
                <div className={s.nearby}>
                  {content.nearby.map((n) => (
                    <div key={n.name}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{n.name}</span>
                      <span className="nums" style={{ fontSize: 14, fontWeight: 600 }}>
                        {n.min} min
                      </span>
                      <span className="subtle" style={{ fontSize: 12 }}>
                        {n.cat}
                      </span>
                      <span className="subtle" style={{ fontSize: 12, textAlign: "right" }}>
                        {n.mode === "walk" ? "on foot" : "by car"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Travel times to schools, hospitals and the expressway will be published with the launch pack.</p>
              )}
            </div>
          </section>

          {content?.payment && (
            <section id="payment" data-sec="payment" className={s.sec} data-reveal>
              <span className="kicker" style={{ letterSpacing: ".16em" }}>
                Payment plan
              </span>
              <h2 className="h-sub">{content.payment.headline}</h2>
              <p className="muted" style={{ fontSize: 15 }}>
                Example for {content.payment.exampleUnit}, at <Price mn={content.payment.exampleMn} />. Instalments fall due when the
                architect certifies each stage.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ minWidth: 560 }}>
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
                          <Price mn={Math.round(content.payment!.exampleMn * r.pct) / 100} />
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid var(--color-rule-strong)" }}>
                      <td colSpan={2} style={{ fontWeight: 600 }}>
                        Total
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>
                        100%
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>
                        <Price mn={content.payment.exampleMn} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Link className="btn btn-secondary" href={routes.calculators} style={{ alignSelf: "flex-start" }}>
                Payment &amp; loan calculator<span aria-hidden>→</span>
              </Link>
            </section>
          )}

          {content?.progress && (
            <section id="progress" data-sec="progress" className={s.sec} data-reveal>
              <span className="kicker" style={{ letterSpacing: ".16em" }}>
                Construction progress
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
                <h2 className="h-sub">{p.progress}% complete</h2>
                <div className={s.progressBars}>
                  {content.progress.towers.map((t) => (
                    <span key={t.name}>
                      <span>
                        {t.name} · {t.pct}%
                      </span>
                      <span className={s.miniBar}>
                        <span style={{ width: `${t.pct}%` }} />
                      </span>
                    </span>
                  ))}
                </div>
              </div>
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
                      <ImageSlot photo={photos[progressPhotos[i % progressPhotos.length]]} alt={`${p.name} site, ${m.month}`} sizes="240px" />
                    </div>
                    <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {m.note}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <BrochureForm project={p.name} pages={content?.brochure?.pages} size={content?.brochure?.size} />

          {content?.faq && (
            <section id="faq" data-sec="faq" className={s.sec} style={{ paddingTop: 0 }} data-reveal>
              <span className="kicker" style={{ letterSpacing: ".16em" }}>
                FAQ
              </span>
              <h2 className="h-sub">Questions buyers ask</h2>
              <Accordion items={content.faq.map((q) => ({ title: q.q, body: <p>{q.a}</p> }))} />
            </section>
          )}
        </div>

        <aside aria-label="Enquire" className={s.aside}>
          <EnquiryCard
            project={p.name}
            slug={slug}
            fromMn={p.from}
            fromNote={types[0] ? `${types[0].type} · ${types[0].label} · ${types[0].sqft.toLocaleString("en-US")} sqft` : p.beds}
            unitTypes={types.map((t) => `${t.type} · ${t.label}`)}
          />
        </aside>
      </div>

      <section className="section" style={{ display: "flex", flexDirection: "column", gap: 32 }} data-reveal>
        <h2 className="h-sub">Similar projects</h2>
        <div className={s.similar}>
          {similar.map((x) => (
            <Link key={x.id} href={routes.project(x.slug)}>
              <span className="zoom" style={{ position: "relative", display: "block", aspectRatio: "4/3" }}>
                <ImageSlot photo={photos[projectPhoto[x.slug] ?? "towerBeach"]} alt={`${x.name}, ${x.loc}`} sizes="(max-width: 760px) 100vw, 33vw" />
              </span>
              <span className="kicker" style={{ letterSpacing: ".14em" }}>
                {x.loc} · {x.type}
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, lineHeight: 1 }}>{x.name}</span>
              <span className="nums" style={{ fontSize: 15, fontWeight: 600 }}>
                {x.from ? <Price mn={x.from} prefix="from " /> : "Sold out"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className={s.mobileBar}>
        <a href={company.hotlineHref}>
          <IconPhone />
          Call
        </a>
        <a href={company.whatsappHref}>
          <IconWhatsApp size={18} />
          WhatsApp
        </a>
        <Link href={routes.bookVisit({ project: slug })}>
          Enquire<span aria-hidden>→</span>
        </Link>
      </div>
    </>
  );
}
