"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Floor, Unit, UnitStatus, UnitType } from "@/lib/types";
import { UNIT_STATUS } from "@/lib/status";
import { money, perSqft } from "@/lib/money";
import { routes } from "@/lib/routes";
import { usePrefs } from "@/components/providers/Preferences";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatusSwatch, UnitStatusTag } from "@/components/ui/Status";
import { Icon360, IconClose, IconHeart } from "@/components/ui/Icons";
import { FloorPlate } from "./FloorPlate";
import s from "./explorer.module.css";

type Sky = "day" | "sunset" | "night";

/** Sky gradient (stage background), sea colour (drawn from the podium down) and tower materials. */
const SKY: Record<Sky, { sky: string; sea: string; win: string; body: string; label: string }> = {
  day: {
    sky: "linear-gradient(180deg,#7f9fbd 0%,#b9cddd 60%,#e3eaee 100%)",
    sea: "#6d8ea6",
    win: "rgba(15,27,45,.32)",
    body: "#ece7dd",
    label: "Day",
  },
  sunset: {
    sky: "linear-gradient(180deg,#16233b 0%,#3d3b57 32%,#9a5a52 66%,#e2a46c 100%)",
    sea: "#24344e",
    win: "rgba(255,206,140,.62)",
    body: "#d9cdbb",
    label: "Sunset",
  },
  night: {
    sky: "linear-gradient(180deg,#040912 0%,#0b1729 65%,#1a2f4c 100%)",
    sea: "#060e1b",
    win: "rgba(255,196,120,.88)",
    body: "#28324a",
    label: "Night",
  },
};

interface Props {
  slug: string;
  projectName: string;
  towers: Record<string, Floor[]>;
  types: UnitType[];
}

export function BuildingExplorer({ slug, projectName, towers, types }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const { currency, shortlist, toggleShortlist, toast } = usePrefs();
  const towerKeys = Object.keys(towers);

  const [tower, setTower] = useState(() => (sp.get("tower") && towers[sp.get("tower")!] ? sp.get("tower")! : towerKeys[0]));
  const floors = towers[tower];
  const [floorN, setFloorN] = useState<number>(() => {
    const f = Number(sp.get("floor"));
    return floors.some((x) => x.n === f) ? f : (floors.find((x) => x.available > 0)?.n ?? floors[0].n);
  });
  const [hoverFloor, setHoverFloor] = useState<number | null>(null);
  const [beds, setBeds] = useState<number>(0);
  const [view, setView] = useState<"" | "Sea" | "City">("");
  const [typeF, setTypeF] = useState(sp.get("type") ?? "");
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [hoverUnit, setHoverUnit] = useState<Unit | null>(null);
  const [sky, setSky] = useState<Sky>("sunset");
  const [sheet, setSheet] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const floor = floors.find((f) => f.n === floorN) ?? floors[0];
  const unit = unitId ? (floor.units.find((u) => u.id === unitId) ?? null) : null;

  const matches = (u: Unit) =>
    (!beds || u.beds === beds || (beds === 4 && u.beds >= 4)) && (!view || u.view === view) && (!typeF || u.type === typeF) && (!onlyAvail || u.status === "A");
  const floorMatches = (f: Floor) => f.units.filter((u) => matches(u) && u.status === "A").length;
  const filtersOn = !!(beds || view || typeF || onlyAvail);
  const clearFilters = () => {
    setBeds(0);
    setView("");
    setTypeF("");
    setOnlyAvail(false);
  };

  // keep the URL shareable
  useEffect(() => {
    const q = new URLSearchParams({ tower, floor: String(floorN) });
    if (typeF) q.set("type", typeF);
    router.replace(`${routes.explorer(slug)}?${q}`, { scroll: false });
  }, [tower, floorN, typeF, router, slug]);

  // Keep the selected floor visible in the floor list (scrolls the list only, never the page).
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !row) return;
    const top = row.offsetTop; // .floorList is the offset parent
    if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: top - list.clientHeight / 2 + row.offsetHeight / 2, behavior: "smooth" });
    }
  }, [floorN, tower]);

  const counts = useMemo(() => {
    const all = floors.flatMap((f) => f.units);
    const by = (k: UnitStatus) => all.filter((u) => u.status === k).length;
    return { A: by("A"), R: by("R"), S: by("S"), B: by("B"), total: all.length };
  }, [floors]);
  const matchCount = filtersOn ? floors.reduce((n, f) => n + floorMatches(f), 0) : counts.A;

  const tourFor = (u: Unit) => types.find((t) => t.type === u.type)?.tourId;
  const pickFloor = (n: number) => {
    setFloorN(n);
    setUnitId(null);
    setSheet(true);
  };
  const switchTower = (t: string) => {
    setTower(t);
    const fl = towers[t];
    setFloorN(fl.find((x) => x.available > 0)?.n ?? fl[0].n);
    setUnitId(null);
  };

  // ── tower elevation geometry (viewBox units) ──
  const top = floors[0].n;
  const bottom = floors[floors.length - 1].n;
  const bandH = 15;
  const towerW = 230;
  const roofH = 46;
  const podiumH = 54;
  const x0 = 85;
  const base = roofH + floors.length * bandH + podiumH; // horizon line
  const svgH = base + 12;
  const focus = hoverFloor != null ? floors.find((f) => f.n === hoverFloor)! : floor;
  const theme = SKY[sky];

  const unitRefOf = (u: Unit) => `${u.tower}-${u.id}`;
  const shortId = (u: Unit) => `unit:${slug}:${unitRefOf(u)}`;

  return (
    <div className={s.root} data-theme="dark">
      {/* ── header ── */}
      <header className={s.head}>
        <div className={s.headText}>
          <Breadcrumbs
            tone="dark"
            items={[
              { label: "Projects", href: routes.projects },
              { label: projectName, href: routes.project(slug) },
              { label: "Building explorer" },
            ]}
          />
          <div className={s.titleRow}>
            <h1 className={s.title}>Choose your floor</h1>
            <span className={s.live}>
              <span className={s.liveDot} aria-hidden />
              Live availability
            </span>
          </div>
        </div>

        <div className={s.headRight}>
          <dl className={s.counts} aria-label={`Tower ${tower} availability`}>
            {(["A", "R", "S"] as UnitStatus[]).map((k) => (
              <div key={k}>
                <dt>
                  <StatusSwatch status={k} size={14} />
                  {UNIT_STATUS[k].label}
                </dt>
                <dd className="nums">{counts[k]}</dd>
              </div>
            ))}
          </dl>
          {towerKeys.length > 1 && (
            <div role="radiogroup" aria-label="Tower" className={`seg ${s.segDark}`}>
              {towerKeys.map((t) => (
                <button key={t} role="radio" aria-checked={t === tower} onClick={() => switchTower(t)}>
                  Tower {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── workspace: filters + floors | elevation | floor plate ── */}
      <div className={s.grid}>
        <aside className={s.rail} aria-label="Filters and floors">
          <div className={s.filters}>
            <div className={s.filterRow}>
              <span className={s.filterLabel}>Bedrooms</span>
              <div role="group" aria-label="Bedrooms" className={s.pills}>
                {[0, 2, 3, 4].map((b) => (
                  <button key={b} type="button" aria-pressed={beds === b} onClick={() => setBeds(b)}>
                    {b ? (b === 4 ? "4+" : b) : "Any"}
                  </button>
                ))}
              </div>
            </div>
            <div className={s.filterRow}>
              <span className={s.filterLabel}>View</span>
              <div role="group" aria-label="View" className={s.pills}>
                {(["", "Sea", "City"] as const).map((v) => (
                  <button key={v || "any"} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                    {v ? `${v} view` : "Any view"}
                  </button>
                ))}
              </div>
            </div>
            <label className={s.filterRow}>
              <span className={s.filterLabel}>Layout</span>
              <select className={`input ${s.select}`} value={typeF} onChange={(e) => setTypeF(e.target.value)}>
                <option value="">All unit types</option>
                {types.map((t) => (
                  <option key={t.key} value={t.type}>
                    {t.type} · {t.label}
                  </option>
                ))}
              </select>
            </label>
            <div className={s.filterFoot}>
              <label className={s.toggle}>
                <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
                <span aria-hidden className={s.switch} />
                Available only
              </label>
              {filtersOn ? (
                <button type="button" className={s.clear} onClick={clearFilters}>
                  Clear
                </button>
              ) : null}
            </div>
            <p className={s.matchLine} aria-live="polite">
              <strong className="nums">{matchCount}</strong> {filtersOn ? "matching homes available" : "homes available"} in Tower {tower}
            </p>
          </div>

          <div className={s.floorHead}>
            <span>Floor</span>
            <span>Units A–F</span>
            <span>Available</span>
          </div>
          <div ref={listRef} className={s.floorList} role="listbox" aria-label={`Floors of Tower ${tower}`}>
            {floors.map((f) => {
              const m = floorMatches(f);
              const released = !f.units.every((u) => u.status === "B");
              return (
                <button
                  key={f.n}
                  role="option"
                  aria-selected={f.n === floorN}
                  className={s.floorRow}
                  data-dim={filtersOn && m === 0 ? "" : undefined}
                  onClick={() => pickFloor(f.n)}
                  onMouseEnter={() => setHoverFloor(f.n)}
                  onMouseLeave={() => setHoverFloor(null)}
                >
                  <span className={`${s.floorN} nums`}>{String(f.n).padStart(2, "0")}</span>
                  <span className={s.floorCells}>
                    {f.units.map((u) => (
                      <span key={u.id} style={{ background: UNIT_STATUS[u.status].fill, opacity: filtersOn && !matches(u) ? 0.22 : 1 }} />
                    ))}
                  </span>
                  <span className={s.floorMeta}>{!released ? "Soon" : f.available ? <strong className="nums">{filtersOn ? m : f.available}</strong> : "—"}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* elevation */}
        <div className={s.stage} style={{ background: theme.sky }}>
          <svg viewBox={`0 0 400 ${svgH}`} className={s.tower} role="img" aria-label={`Tower ${tower} elevation. Select a floor.`} preserveAspectRatio="xMidYMax meet">
            {/* sea runs from the podium to beyond the frame on every side */}
            <rect x={-4000} y={base} width={8400} height={4000} fill={theme.sea} />
            <rect x={-4000} y={base} width={8400} height={2} fill="rgba(255,255,255,.18)" />
            {/* distant skyline for scale */}
            <g fill="rgba(6,13,24,.38)">
              <rect x={-220} y={base - 46} width={60} height={46} />
              <rect x={-150} y={base - 74} width={44} height={74} />
              <rect x={-96} y={base - 38} width={70} height={38} />
              <rect x={-20} y={base - 58} width={46} height={58} />
              <rect x={372} y={base - 52} width={52} height={52} />
              <rect x={432} y={base - 84} width={40} height={84} />
              <rect x={480} y={base - 40} width={74} height={40} />
              <rect x={562} y={base - 66} width={48} height={66} />
            </g>
            {/* roof crown */}
            <path d={`M${x0 + 20} ${roofH} L${x0 + 40} 8 L${x0 + towerW - 40} 8 L${x0 + towerW - 20} ${roofH} Z`} fill={theme.body} opacity=".88" />
            <rect x={x0 + 70} y="0" width="90" height="10" fill={theme.body} opacity=".6" />
            {floors.map((f, i) => {
              const y = roofH + i * bandH;
              const isSel = f.n === floorN;
              const isHov = f.n === hoverFloor;
              const dimmed = filtersOn && floorMatches(f) === 0;
              return (
                <g
                  key={f.n}
                  role="button"
                  tabIndex={0}
                  aria-label={`Floor ${f.n}: ${f.available} of ${f.units.length} available`}
                  aria-pressed={isSel}
                  className={s.band}
                  onClick={() => pickFloor(f.n)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pickFloor(f.n);
                    }
                  }}
                  onMouseEnter={() => setHoverFloor(f.n)}
                  onMouseLeave={() => setHoverFloor(null)}
                  onFocus={() => setHoverFloor(f.n)}
                  onBlur={() => setHoverFloor(null)}
                >
                  <rect x={x0} y={y} width={towerW} height={bandH} fill={theme.body} />
                  {f.units.map((u, k) => (
                    <rect
                      key={u.id}
                      x={x0 + 8 + k * ((towerW - 16) / 6)}
                      y={y + 3}
                      width={(towerW - 16) / 6 - 3}
                      height={bandH - 6}
                      fill={u.status === "A" ? theme.win : "rgba(15,27,45,.55)"}
                      opacity={dimmed ? 0.35 : 1}
                    />
                  ))}
                  <rect
                    x={x0 - 1}
                    y={y}
                    width={towerW + 2}
                    height={bandH}
                    fill={isSel ? "rgba(196,160,90,.55)" : isHov ? "rgba(196,160,90,.35)" : "transparent"}
                    stroke={isSel || isHov ? "#c4a05a" : "none"}
                    strokeWidth="2"
                  />
                  {(isSel || isHov) && (
                    <>
                      <line x1={x0 + towerW + 4} x2={x0 + towerW + 18} y1={y + bandH / 2} y2={y + bandH / 2} stroke="#c4a05a" strokeWidth="1.5" />
                      <text x={x0 + towerW + 22} y={y + bandH - 3} fill="#efe9dd" fontSize="11" fontWeight="600" fontFamily="var(--font-body)">
                        {f.n}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
            {/* podium */}
            <rect x={x0 - 40} y={base - podiumH} width={towerW + 80} height={podiumH} fill={theme.body} opacity=".94" />
            <rect x={x0 - 30} y={base - podiumH + 8} width={towerW + 60} height="7" fill="#5fa6b8" opacity=".75" />
            <text x={x0 + towerW / 2} y={base - 18} textAnchor="middle" fill="rgba(15,27,45,.5)" fontSize="7" letterSpacing="1.6" fontFamily="var(--font-body)">
              PODIUM · POOL · LOBBY
            </text>
          </svg>

          <div className={s.focusCard} data-show={hoverFloor != null && hoverFloor !== floorN ? "" : undefined} aria-hidden>
            <span className="kicker kicker-on-navy" style={{ letterSpacing: ".14em" }}>
              Tower {tower} · Floor {focus.n}
            </span>
            <span className={s.focusBig}>
              {focus.units.every((u) => u.status === "B") ? "Not yet released" : focus.available ? `${focus.available} of ${focus.units.length} available` : "Sold out"}
            </span>
            {Number.isFinite(focus.from) && <span className={s.focusSub}>from {money(focus.from, currency)}</span>}
          </div>

          <div role="radiogroup" aria-label="Lighting" className={s.skySeg}>
            {(Object.keys(SKY) as Sky[]).map((k) => (
              <button key={k} role="radio" aria-checked={k === sky} onClick={() => setSky(k)}>
                {SKY[k].label}
              </button>
            ))}
          </div>

          <div className={s.stageLegend} aria-hidden>
            {(["A", "R", "S", "B"] as UnitStatus[]).map((k) => (
              <span key={k}>
                <StatusSwatch status={k} size={14} />
                {UNIT_STATUS[k].label}
              </span>
            ))}
          </div>
          <span className={s.compass}>← W · Indian Ocean</span>
          <span className={s.hint}>Click a floor to see its homes</span>
        </div>

        {/* floor plate */}
        <section className={`${s.plate} ${sheet ? s.plateOpen : ""}`} aria-label={`Floor ${floor.n} plan`}>
          <div className={s.plateHead}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span className="kicker kicker-on-navy" style={{ letterSpacing: ".14em" }}>
                Tower {tower} · Floor {floor.n}
              </span>
              <span className={s.plateTitle}>
                {floor.available ? `${floor.available} of ${floor.units.length} available` : floor.units.every((u) => u.status === "B") ? "Not yet released" : "Sold out"}
              </span>
              {Number.isFinite(floor.from) && <span className="muted" style={{ fontSize: 13 }}>from {money(floor.from, currency)}</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className={s.iconBtn} aria-label="Floor above" disabled={floor.n === top} onClick={() => pickFloor(Math.min(top, floor.n + 1))}>
                ↑
              </button>
              <button type="button" className={s.iconBtn} aria-label="Floor below" disabled={floor.n === bottom} onClick={() => pickFloor(Math.max(bottom, floor.n - 1))}>
                ↓
              </button>
              <button type="button" className={`${s.iconBtn} ${s.sheetClose}`} aria-label="Close floor plan" onClick={() => setSheet(false)}>
                <IconClose size={18} />
              </button>
            </div>
          </div>

          <div className={s.plateSvg}>
            <FloorPlate units={floor.units} selected={unit?.id} dim={(u) => filtersOn && !matches(u)} onSelect={(u) => setUnitId(u.id)} onHover={setHoverUnit} />
            {hoverUnit && !unit && (
              <div className={s.unitTip}>
                <strong>
                  {hoverUnit.id} · {hoverUnit.label}
                </strong>
                <span>
                  {hoverUnit.sqft.toLocaleString("en-US")} sqft · {hoverUnit.facing}-facing · {UNIT_STATUS[hoverUnit.status].label}
                </span>
                {(hoverUnit.status === "A" || hoverUnit.status === "R") && <span className="nums">{money(hoverUnit.price, currency)}</span>}
              </div>
            )}
          </div>

          {unit ? (
            <div className={s.unitPanel}>
              <button type="button" className={s.backBtn} onClick={() => setUnitId(null)}>
                ← All homes on floor {floor.n}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span className="kicker kicker-on-navy" style={{ letterSpacing: ".14em" }}>
                  Unit {unit.id} · {unit.type}
                </span>
                <UnitStatusTag status={unit.status} />
              </div>
              <span className={s.unitTitle}>
                {unit.label}, {unit.view.toLowerCase()} view
              </span>
              <div className={s.specs}>
                <div>
                  <span>Interior</span>
                  <span>{unit.sqft.toLocaleString("en-US")} sqft</span>
                </div>
                <div>
                  <span>Balcony</span>
                  <span>{unit.balcony} sqft</span>
                </div>
                <div>
                  <span>Baths</span>
                  <span>{unit.baths}</span>
                </div>
                <div>
                  <span>Facing</span>
                  <span>{unit.facing}</span>
                </div>
              </div>
              {unit.status === "A" || unit.status === "R" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className="nums" style={{ fontFamily: "var(--font-heading)", fontSize: 36, lineHeight: 1 }}>
                    {money(unit.price, currency)}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {perSqft(unit.price, unit.sqft, currency)}
                    {unit.status === "R" && " · reserved — join the waiting list"}
                  </span>
                </div>
              ) : (
                <span className="muted" style={{ fontSize: 14 }}>
                  {unit.status === "S" ? "This home is sold. Similar layouts on other floors are listed on the unit page." : "Releases with the next price list. Register to hear first."}
                </span>
              )}
              <div className={s.unitCtas}>
                <Link className="btn btn-primary btn-block" href={routes.unit(slug, unitRefOf(unit))}>
                  View unit details<span aria-hidden>→</span>
                </Link>
                {tourFor(unit) && (
                  <Link className="btn btn-secondary on-dark btn-block" href={routes.tour(tourFor(unit)!, routes.explorer(slug, tower, floor.n))}>
                    Open 360° tour
                    <Icon360 size={16} />
                  </Link>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Link className="btn btn-ghost" style={{ color: "var(--color-on-navy)" }} href={routes.bookVisit({ project: slug, unit: unitRefOf(unit) })}>
                    {unit.status === "A" ? "Reserve / enquire" : "Register interest"}
                  </Link>
                  <button
                    type="button"
                    className={s.saveBtn}
                    aria-pressed={shortlist.includes(shortId(unit))}
                    onClick={() => toast(toggleShortlist(shortId(unit)) ? `Unit ${unit.id} saved to your shortlist` : "Removed from shortlist")}
                  >
                    <IconHeart filled={shortlist.includes(shortId(unit))} />
                    {shortlist.includes(shortId(unit)) ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={s.unitList}>
              {floor.units.map((u) => (
                <button key={u.id} type="button" className={s.unitRow} data-dim={filtersOn && !matches(u) ? "" : undefined} onClick={() => setUnitId(u.id)}>
                  <StatusSwatch status={u.status} size={22} />
                  <span style={{ flex: 1, textAlign: "left" }}>
                    <strong>{u.id}</strong> · {u.label}
                    <span className="muted" style={{ display: "block", fontSize: 12 }}>
                      {u.sqft.toLocaleString("en-US")} sqft · {u.view} view
                    </span>
                  </span>
                  <span className="nums" style={{ fontSize: 14 }}>
                    {u.status === "A" || u.status === "R" ? money(u.price, currency) : <span className="muted">{UNIT_STATUS[u.status].label}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
