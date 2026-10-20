"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Project, ProjectStatus } from "@/lib/types";
import { CURRENCIES, money } from "@/lib/money";
import { LOCATIONS, PROJECT_STATUS } from "@/lib/data/projects";
import { routes } from "@/lib/routes";
import { usePrefs } from "@/components/providers/Preferences";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { photos, projectPhoto } from "@/lib/data/media";
import { Icon360, IconClose, IconGrid, IconMap } from "@/components/ui/Icons";
import { LeafletMap } from "@/components/ui/LeafletMap";
import { ProjectCard } from "./ProjectCard";
import styles from "./ProjectsBrowser.module.css";

type Filters = {
  loc: string;
  type: string;
  status: ProjectStatus[];
  beds: string[];
  min: number;
  max: number;
  tour: boolean;
  sort: "featured" | "low" | "high" | "completion";
};

const BLANK: Filters = { loc: "", type: "", status: [], beds: [], min: 0, max: 0, tour: false, sort: "featured" };
const TYPES = ["Apartments", "Townhouses", "Villas", "Land"];
const STEPS = [50, 75, 100, 150, 250];
const PAGE = 6;

function fromParams(sp: URLSearchParams): Filters {
  const f = { ...BLANK };
  const loc = sp.get("loc");
  if (loc && LOCATIONS.includes(loc)) f.loc = loc;
  const type = sp.get("type");
  if (type && TYPES.includes(type)) f.type = type;
  const st = sp.get("status") as ProjectStatus | null;
  if (st && st in PROJECT_STATUS) f.status = [st];
  const beds = sp.get("beds");
  if (beds && ["2", "3", "4"].includes(beds)) f.beds = [beds];
  const max = Number(sp.get("max"));
  if (max > 0) f.max = max;
  if (sp.get("tour") === "1") f.tour = true;
  return f;
}

function bedsOf(p: Project): [number, number] {
  const m = /(\d)(?:–(\d))?/.exec(p.beds);
  return m ? [+m[1], +(m[2] || m[1])] : [0, 9];
}

function filterProjects(all: Project[], f: Filters) {
  let r = all.filter((p) => {
    if (f.loc && p.loc !== f.loc) return false;
    if (f.type && !p.type.toLowerCase().includes(f.type.toLowerCase().replace(/s$/, ""))) return false;
    if (f.status.length && !f.status.includes(p.status)) return false;
    if (f.beds.length) {
      const [a, b] = bedsOf(p);
      if (!f.beds.some((x) => (+x >= a && +x <= b) || (x === "4" && b >= 4))) return false;
    }
    if (f.min && (p.from == null || p.from < f.min)) return false;
    if (f.max && (p.from == null || p.from > f.max)) return false;
    if (f.tour && !p.tour) return false;
    return true;
  });
  if (f.sort === "low") r = [...r].sort((a, b) => (a.from ?? 1e9) - (b.from ?? 1e9));
  if (f.sort === "high") r = [...r].sort((a, b) => (b.from ?? -1) - (a.from ?? -1));
  if (f.sort === "completion") r = [...r].sort((a, b) => b.progress - a.progress);
  return r;
}

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function ProjectsBrowser({ projects }: { projects: Project[] }) {
  const sp = useSearchParams();
  const { currency, setCurrency } = usePrefs();
  const [f, setF] = useState<Filters>(() => fromParams(sp));
  const [view, setView] = useState<"grid" | "map">(sp.get("view") === "map" ? "map" : "grid");
  const [shown, setShown] = useState(PAGE);
  const [pin, setPin] = useState<string | null>(() =>
    sp.get("view") === "map" ? (filterProjects(projects, fromParams(sp))[0]?.id ?? null) : null,
  );
  const [sheet, setSheet] = useState(false);

  const results = useMemo(() => filterProjects(projects, f), [projects, f]);
  const patch = (p: Partial<Filters>) => {
    setF((x) => ({ ...x, ...p }));
    setShown(PAGE);
  };
  const filterCount =
    +!!f.loc + +!!f.type + f.status.length + f.beds.length + (f.min ? 1 : 0) + (f.max ? 1 : 0) + (f.tour ? 1 : 0);

  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  const priceLbl = (v: number) => money(v, currency).replace(`${currency} `, "");
  const pinProject = pin ? results.find((p) => p.id === pin) : undefined;

  const statusChips = (["uc", "done", "soon"] as ProjectStatus[]).map((k) => (
    <button key={k} type="button" className="chip" aria-pressed={f.status.includes(k)} onClick={() => patch({ status: toggle(f.status, k) })}>
      {PROJECT_STATUS[k]}
    </button>
  ));
  const bedChips = [
    ["2", "2 Bed"],
    ["3", "3 Bed"],
    ["4", "4 Bed +"],
  ].map(([k, label]) => (
    <button key={k} type="button" className="chip" aria-pressed={f.beds.includes(k)} onClick={() => patch({ beds: toggle(f.beds, k) })}>
      {label}
    </button>
  ));
  const tourChip = (
    <button type="button" className="chip" aria-pressed={f.tour} onClick={() => patch({ tour: !f.tour })}>
      <Icon360 stroke="currentColor" />
      Has 360° tour
    </button>
  );
  const selects = (prefix: string) => (
    <>
      <div className="field">
        <label htmlFor={`${prefix}-loc`}>Location</label>
        <select id={`${prefix}-loc`} className="input" value={f.loc} onChange={(e) => patch({ loc: e.target.value })}>
          <option value="">All locations</option>
          {LOCATIONS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-type`}>Property type</label>
        <select id={`${prefix}-type`} className="input" value={f.type} onChange={(e) => patch({ type: e.target.value })}>
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-min`}>Min price ({currency})</label>
        <select id={`${prefix}-min`} className="input" value={f.min} onChange={(e) => patch({ min: +e.target.value })}>
          <option value={0}>No minimum</option>
          {STEPS.map((v) => (
            <option key={v} value={v}>
              {priceLbl(v)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-max`}>Max price ({currency})</label>
        <select id={`${prefix}-max`} className="input" value={f.max} onChange={(e) => patch({ max: +e.target.value })}>
          <option value={0}>No maximum</option>
          {STEPS.map((v) => (
            <option key={v} value={v}>
              {priceLbl(v)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
  const currencySeg = (
    <div role="radiogroup" aria-label="Currency" className="seg">
      {CURRENCIES.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={c === currency} onClick={() => setCurrency(c)} style={{ minWidth: 56 }}>
          {c}
        </button>
      ))}
    </div>
  );
  const sortSelect = (id: string) => (
    <select id={id} className="input" value={f.sort} onChange={(e) => patch({ sort: e.target.value as Filters["sort"] })} style={{ width: "auto", minHeight: 40, fontSize: 14, fontWeight: 500 }}>
      <option value="featured">Featured</option>
      <option value="low">Price: low to high</option>
      <option value="high">Price: high to low</option>
      <option value="completion">Nearest completion</option>
    </select>
  );

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.desktopFilters}>
          <div className={styles.selects}>
            {selects("pf")}
            <div className={styles.curField}>
              <span className="label muted">Show prices in</span>
              {currencySeg}
            </div>
          </div>
          <div className={styles.chips}>
            <div role="group" aria-label="Status" className={styles.chipGroup}>
              {statusChips}
            </div>
            <span className={styles.sep} />
            <div role="group" aria-label="Bedrooms" className={styles.chipGroup}>
              {bedChips}
            </div>
            <span className={styles.sep} />
            {tourChip}
            {filterCount > 0 && (
              <button type="button" className={styles.clear} onClick={() => setF({ ...BLANK, sort: f.sort })}>
                Clear all
              </button>
            )}
          </div>
        </div>
        <div className={styles.mobileFilters}>
          <button type="button" className={styles.filterBtn} onClick={() => setSheet(true)}>
            Filters<span>{filterCount}</span>
          </button>
          <div className="field">
            <label htmlFor="pm-sort" className="sr-only">
              Sort
            </label>
            {sortSelect("pm-sort")}
          </div>
        </div>
      </div>

      <div className={`wrap ${styles.bar}`}>
        <span aria-live="polite" style={{ fontSize: 14 }}>
          <strong className="nums">{results.length}</strong> {results.length === 1 ? "project" : "projects"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className={styles.sortDesk}>
            <label htmlFor="pf-sort" className="muted" style={{ fontSize: 13 }}>
              Sort
            </label>
            {sortSelect("pf-sort")}
          </div>
          <div role="radiogroup" aria-label="View" className="seg">
            <button type="button" role="radio" aria-checked={view === "grid"} onClick={() => setView("grid")} style={{ minHeight: 44 }}>
              <IconGrid />
              Grid
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={view === "map"}
              onClick={() => {
                setView("map");
                setPin((p) => p ?? results[0]?.id ?? null);
              }}
              style={{ minHeight: 44 }}
            >
              <IconMap />
              Map
            </button>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className={`${styles.empty}`}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-display)" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3M8 11h6" />
          </svg>
          <h2 style={{ fontFamily: "var(--font-body)", fontSize: 22, fontWeight: 600 }}>No projects match these filters</h2>
          <p className="lead" style={{ maxWidth: "56ch", fontSize: 15 }}>
            Nothing {f.max ? `under ${money(f.max, currency)}` : "with these filters"} matches in {f.loc || "these locations"}. Ocean
            View Residences in Mount Lavinia starts at {money(68.5, currency)}, or widen your search.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={() => setF(BLANK)}>
              Clear filters<span aria-hidden>×</span>
            </button>
            <Link className="btn btn-ghost" href={routes.contact}>
              Tell us what you’re looking for
            </Link>
          </div>
        </div>
      ) : view === "grid" ? (
        <div className={styles.gridWrap}>
          <div className={styles.grid}>
            {results.slice(0, shown).map((p) => (
              <ProjectCard key={p.id} p={p} detailed headingLevel={2} />
            ))}
          </div>
          {results.length > shown && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
              <span className="muted" style={{ fontSize: 13 }}>
                Showing {Math.min(shown, results.length)} of {results.length}
              </span>
              <button className="btn btn-secondary" onClick={() => setShown((n) => n + PAGE)}>
                Load more<span aria-hidden>↓</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.mapView}>
          <div className={styles.mapList}>
            {results.map((p) => (
              <button key={p.id} type="button" className={styles.mapItem} aria-pressed={pin === p.id} onClick={() => setPin(p.id)}>
                <span style={{ position: "relative", display: "block", aspectRatio: "4/3" }}>
                  <ImageSlot photo={photos[projectPhoto[p.slug] ?? "towerBeach"]} alt="" sizes="120px" />
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="kicker" style={{ letterSpacing: ".12em" }}>
                    {p.loc} · {PROJECT_STATUS[p.status]}
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</span>
                  <span className="nums" style={{ fontSize: 14 }}>
                    {p.from ? money(p.from, currency) : p.status === "done" ? "Sold out" : "Register interest"}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <LeafletMap
              center={[7.0, 80.0]}
              zoom={9}
              ariaLabel="Map of OVDC projects"
              pins={results.map((p) => ({
                id: p.id,
                lat: p.lat,
                lng: p.lng,
                title: p.name,
                active: p.id === pin,
                label: p.from ? money(p.from, currency) : p.status === "done" ? "Sold out" : "Coming soon",
              }))}
              onPinClick={setPin}
            />
            {pinProject && (
              <div className={styles.pinCard}>
                <div style={{ position: "relative" }}>
                  <ImageSlot photo={photos[projectPhoto[pinProject.slug] ?? "towerBeach"]} alt="" sizes="120px" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span className="kicker" style={{ letterSpacing: ".12em" }}>
                      {pinProject.loc}
                    </span>
                    <button type="button" aria-label="Close" className={styles.pinClose} onClick={() => setPin(null)}>
                      <IconClose size={16} />
                    </button>
                  </div>
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{pinProject.name}</span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {pinProject.type} · {pinProject.beds} · {PROJECT_STATUS[pinProject.status]}
                  </span>
                  <span className="nums" style={{ fontSize: 15, fontWeight: 600 }}>
                    {pinProject.from ? `from ${money(pinProject.from, currency)}` : "Register interest"}
                  </span>
                  <Link href={routes.project(pinProject.slug)} className={styles.pinLink}>
                    View project →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {sheet && (
        <div role="dialog" aria-modal="true" aria-label="Filters" className={styles.sheet}>
          <div className={styles.sheetHead}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>Filters</span>
            <button type="button" aria-label="Close filters" className={styles.sheetClose} onClick={() => setSheet(false)}>
              <IconClose />
            </button>
          </div>
          <div className={styles.sheetBody}>
            {selects("ps")}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="label">Status</span>
              <div className={styles.chipGroup}>{statusChips}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="label">Bedrooms</span>
              <div className={styles.chipGroup}>{bedChips}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="label">Show prices in</span>
              {currencySeg}
            </div>
            {tourChip}
          </div>
          <div className={styles.sheetFoot}>
            <button className="btn btn-secondary" onClick={() => setF({ ...BLANK, sort: f.sort })}>
              Clear
            </button>
            <button className="btn btn-primary" onClick={() => setSheet(false)}>
              Show {results.length} results<span aria-hidden>→</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
