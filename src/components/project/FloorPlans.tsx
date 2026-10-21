"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { UnitStatus, UnitType } from "@/lib/types";
import { routes } from "@/lib/routes";
import { usePrefs } from "@/components/providers/Preferences";
import { money } from "@/lib/money";
import { FloorPlanSvg } from "./FloorPlanSvg";
import { StatusSwatch } from "@/components/ui/Status";
import { Icon360 } from "@/components/ui/Icons";
import s from "./project.module.css";

export type TypeRow = UnitType & { from: number | null; available: number; total: number; k: UnitStatus };

/** Unit-type table + zoomable floor plan for the selected layout. */
export function FloorPlans({ slug, types, initial = "C" }: { slug: string; types: TypeRow[]; initial?: string }) {
  const { currency, toast } = usePrefs();
  // The type is unique within a project; the short code is only a default.
  const [sel, setSel] = useState((types.find((t) => t.key === initial) ?? types[0])?.type);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const t = types.find((x) => x.type === sel) ?? types[0];
  if (!t) return null;

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Beds</th>
              <th className="num">Interior</th>
              <th className="num">From</th>
              <th>Availability</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {types.map((row) => (
              <tr key={row.type} style={{ background: row.type === sel ? "var(--color-surface)" : undefined }}>
                <td style={{ padding: 0 }}>
                  <button
                    type="button"
                    className={s.typeBtn}
                    aria-pressed={row.type === sel}
                    onClick={() => {
                      setSel(row.type);
                      reset();
                    }}
                  >
                    {row.type}
                  </button>
                </td>
                <td>{row.label}</td>
                <td className="num">{row.sqft.toLocaleString("en-US")} sqft</td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {row.from ? money(row.from, currency) : row.total ? "Sold out" : "—"}
                </td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <StatusSwatch status={row.k} size={22} />
                    {row.total ? `${row.available} of ${row.total} available` : "Release coming soon"}
                  </span>
                </td>
                <td className="num">
                  {row.tourId ? (
                    <Link href={routes.tour(row.tourId, routes.project(slug))} className={s.tableLink}>
                      <Icon360 stroke="var(--color-gold-display)" />
                      View 360°
                    </Link>
                  ) : (
                    <span className="subtle" style={{ fontSize: 12 }}>
                      Tour coming soon
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id="plan" className={s.planGrid}>
        <div
          className={s.planBox}
          style={{ cursor: zoom > 1 ? "grab" : "default" }}
          onPointerDown={(e) => {
            if (zoom <= 1) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
          }}
          onPointerMove={(e) => drag.current && setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <div style={{ position: "absolute", inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: "transform 120ms linear" }}>
            {t.planImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary sizes and converts the drawing
              <img src={t.planImage} alt={`${t.type} · ${t.label} floor plan`} style={{ width: "100%", height: "100%", objectFit: "contain", background: "#fff" }} draggable={false} />
            ) : (
              <FloorPlanSvg rooms={t.rooms} title={`${t.type} · ${t.label}`} />
            )}
          </div>
          <div className={s.zoomBtns}>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(3, z + 0.5))}>
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => {
                const z = Math.max(1, zoom - 0.5);
                setZoom(z);
                if (z <= 1) setPan({ x: 0, y: 0 });
              }}
            >
              −
            </button>
            <button type="button" aria-label="Reset zoom" onClick={reset} style={{ fontSize: 12, fontWeight: 600 }}>
              1:1
            </button>
          </div>
          <span className={s.zoomLabel}>{Math.round(zoom * 100)}%</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 36, lineHeight: 1 }}>
            {t.type} · {t.label}
          </span>
          <span className="muted" style={{ fontSize: 15 }}>
            {[`${t.sqft.toLocaleString("en-US")} sqft interior`, t.balcony ? `${t.balcony} sqft balcony` : "", t.facing ? `${t.facing}-facing` : "", t.view ? `${t.view} view` : ""].filter(Boolean).join(" · ")}
          </span>
          <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--color-divider)" }}>
            {t.rooms.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-divider)", fontSize: 14 }}>
                <span>{r.name}</span>
                <span className="nums muted">{r.dim}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {t.total > 0 && (
              <Link className="btn btn-secondary" href={`${routes.explorer(slug)}?type=${encodeURIComponent(t.type)}`}>
                See units of this type<span aria-hidden>→</span>
              </Link>
            )}
            {t.planPdf ? (
              <a className="btn btn-ghost" href={t.planPdf} target="_blank" rel="noreferrer">
                Download plan PDF
              </a>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => toast("Floor plan PDFs are being finalised — ask sales for a copy")}>
                Download plan PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
