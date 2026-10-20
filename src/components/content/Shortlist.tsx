"use client";

import Link from "next/link";
import { useState } from "react";
import type { Project, Unit } from "@/lib/types";
import { money, perSqft } from "@/lib/money";
import { routes } from "@/lib/routes";
import { UNIT_STATUS } from "@/lib/status";
import { photos, projectPhoto, typePhoto } from "@/lib/data/media";
import { usePrefs } from "@/components/providers/Preferences";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { StatusSwatch } from "@/components/ui/Status";
import { Icon360, IconClose } from "@/components/ui/Icons";
import c from "./content.module.css";

type SUnit = Unit & { projectSlug: string; projectName: string; completion: string; tourId?: string };

export function Shortlist({ projects, units }: { projects: Project[]; units: SUnit[] }) {
  const { shortlist, toggleShortlist, currency } = usePrefs();
  const [compare, setCompare] = useState<string[]>([]);

  const savedProjects = projects.filter((p) => shortlist.includes(`project:${p.slug}`));
  const savedUnits = units.filter((u) => shortlist.includes(`unit:${u.projectSlug}:${u.tower}-${u.id}`));
  const key = (u: SUnit) => `unit:${u.projectSlug}:${u.tower}-${u.id}`;
  const cmp = savedUnits.filter((u) => compare.includes(key(u)));

  if (!savedProjects.length && !savedUnits.length) {
    return (
      <section className={c.section}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14, padding: "clamp(32px, 5vw, 64px)", border: "1px dashed var(--color-divider)" }}>
          <h2 style={{ fontFamily: "var(--font-body)", fontSize: 22, fontWeight: 600 }}>Your shortlist is empty</h2>
          <p className="lead" style={{ maxWidth: "56ch" }}>
            Tap <strong>Save</strong> on any project or unit to keep it here and compare homes side by side. Your shortlist stays in this browser.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href={routes.projects}>
              Browse projects<span aria-hidden>→</span>
            </Link>
            <Link className="btn btn-secondary" href={routes.explorer("ocean-view-residences")}>
              Building explorer
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {savedUnits.length > 0 && (
        <section className={c.section}>
          <div className={c.sectionHead}>
            <div className={c.headText}>
              <span className="kicker">Saved homes</span>
              <h2 className="h-section">{savedUnits.length} {savedUnits.length === 1 ? "unit" : "units"}</h2>
            </div>
            <span className="muted" style={{ fontSize: 14 }}>
              Tick up to three to compare
            </span>
          </div>
          <ul className={c.list}>
            {savedUnits.map((u) => {
              const k = key(u);
              const on = compare.includes(k);
              return (
                <li key={k} style={{ alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", flex: 1, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!on && compare.length >= 3}
                      onChange={() => setCompare(on ? compare.filter((x) => x !== k) : [...compare, k])}
                      style={{ width: 18, height: 18, accentColor: "var(--color-navy)" }}
                    />
                    <span style={{ position: "relative", width: 96, height: 64, flex: "none" }}>
                      <ImageSlot photo={photos[typePhoto[u.type] ?? "living"]} alt="" sizes="96px" />
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <strong>
                        {u.projectName} · {u.tower}-{u.id}
                      </strong>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {u.label} · {u.sqft.toLocaleString("en-US")} sqft · floor {u.floor} · {u.view} view
                      </span>
                    </span>
                  </label>
                  <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StatusSwatch status={u.status} />
                      <span className="nums" style={{ fontWeight: 600 }}>
                        {u.status === "A" || u.status === "R" ? money(u.price, currency) : UNIT_STATUS[u.status].label}
                      </span>
                    </span>
                    <Link href={routes.unit(u.projectSlug, `${u.tower}-${u.id}`)} className="label">
                      View
                    </Link>
                    <button type="button" aria-label={`Remove ${u.tower}-${u.id}`} onClick={() => toggleShortlist(k)} style={{ border: 0, background: "none", cursor: "pointer", display: "grid", placeItems: "center", width: 36, height: 36 }}>
                      <IconClose size={16} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>

          {cmp.length >= 2 && (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ minWidth: 640 }}>
                <caption className="sr-only">Unit comparison</caption>
                <thead>
                  <tr>
                    <th />
                    {cmp.map((u) => (
                      <th key={key(u)} style={{ fontSize: 13, letterSpacing: 0, textTransform: "none" }}>
                        {u.projectName}
                        <br />
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 400 }}>
                          {u.tower}-{u.id}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["Price", (u: SUnit) => (u.status === "A" || u.status === "R" ? money(u.price, currency) : UNIT_STATUS[u.status].label)],
                      ["Price / sqft", (u: SUnit) => perSqft(u.price, u.sqft, currency)],
                      ["Status", (u: SUnit) => UNIT_STATUS[u.status].label],
                      ["Layout", (u: SUnit) => `${u.type} · ${u.label}`],
                      ["Interior", (u: SUnit) => `${u.sqft.toLocaleString("en-US")} sqft`],
                      ["Balcony", (u: SUnit) => `${u.balcony} sqft`],
                      ["Bathrooms", (u: SUnit) => String(u.baths)],
                      ["Floor", (u: SUnit) => String(u.floor)],
                      ["Facing / view", (u: SUnit) => `${u.facing} · ${u.view}`],
                      ["Completion", (u: SUnit) => u.completion],
                      ["Booking (20%)", (u: SUnit) => money(Math.round(u.price * 20) / 100, currency)],
                    ] as [string, (u: SUnit) => string][]
                  ).map(([label, fn]) => (
                    <tr key={label}>
                      <th scope="row" style={{ borderBottom: "1px solid var(--color-divider)" }}>
                        {label}
                      </th>
                      {cmp.map((u) => (
                        <td key={key(u)}>{fn(u)}</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" />
                    {cmp.map((u) => (
                      <td key={key(u)}>
                        <span style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <Link href={routes.unit(u.projectSlug, `${u.tower}-${u.id}`)} className="label">
                            Details →
                          </Link>
                          {u.tourId && (
                            <Link href={routes.tour(u.tourId, routes.shortlist)} className="label" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                              <Icon360 stroke="var(--color-gold-display)" />
                              360°
                            </Link>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {savedProjects.length > 0 && (
        <section className={`${c.section} ${c.surface}`}>
          <div className={c.headText}>
            <span className="kicker" style={{ color: "var(--color-kicker-sand)" }}>
              Saved projects
            </span>
          </div>
          <div className={c.cards}>
            {savedProjects.map((p) => (
              <div key={p.id} className={c.card}>
                <Link href={routes.project(p.slug)} className={`zoom ${c.media}`} style={{ display: "block" }}>
                  <ImageSlot photo={photos[projectPhoto[p.slug] ?? "towerBeach"]} sizes="(max-width: 760px) 100vw, 33vw" />
                </Link>
                <span className="kicker" style={{ color: "var(--color-kicker-sand)" }}>
                  {p.loc} · {p.type}
                </span>
                <h3 className={c.cardTitle}>
                  <Link href={routes.project(p.slug)} style={{ textDecoration: "none" }}>
                    {p.name}
                  </Link>
                </h3>
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="nums" style={{ fontWeight: 600 }}>
                    {p.from ? `from ${money(p.from, currency)}` : "Register interest"}
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => toggleShortlist(`project:${p.slug}`)}>
                    Remove
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
