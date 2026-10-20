"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Filter, LayoutGrid, Rows3, Search, SearchX, X } from "lucide-react";
import { updateUnits, type UnitChange } from "@/app/admin/actions";
import { useAdminUi } from "../AdminRoot";
import { downloadCsv, lkr, mnShort } from "@/lib/admin/format";
import type { AdminUnit, PricePoint } from "@/lib/admin/types";
import type { UnitStatus } from "@/lib/types";
import { UnitPanel, STATUS_META } from "./UnitPanel";
import s from "./units.module.css";

export interface Layout {
  type: string;
  label: string;
  tourId: string | null;
}

interface Props {
  projects: { slug: string; name: string }[];
  slug: string;
  units: AdminUnit[];
  history: Record<number, PricePoint[]>;
  layouts: Layout[];
  initialUnit?: number;
  initialTower?: string;
}

const ORDER: UnitStatus[] = ["A", "R", "S", "B"];

export function UnitsConsole({ projects, slug, units: initialUnits, history: initialHistory, layouts, initialUnit, initialTower }: Props) {
  const router = useRouter();
  const { toast, confirm } = useAdminUi();
  const [units, setUnits] = useState(initialUnits);
  const [history, setHistory] = useState(initialHistory);
  const towers = useMemo(() => [...new Set(units.map((u) => u.tower))].sort(), [units]);
  const [tower, setTower] = useState(
    initialTower ?? (initialUnit ? units.find((u) => u.id === initialUnit)?.tower : undefined) ?? towers[0],
  );
  const [view, setView] = useState<"grid" | "table">("grid");
  const [statusF, setStatusF] = useState<UnitStatus | null>(null);
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [sel, setSel] = useState<number[]>(initialUnit ? [initialUnit] : []);
  const [pending, start] = useTransition();

  const project = projects.find((p) => p.slug === slug)!;
  const inTower = useMemo(() => units.filter((u) => u.tower === tower), [units, tower]);
  const counts = useMemo(() => {
    const c = { A: 0, R: 0, S: 0, B: 0 } as Record<UnitStatus, number>;
    for (const u of inTower) c[u.status]++;
    return c;
  }, [inTower]);

  const query = q.trim().toUpperCase().replace(/^[A-Z]-/, "");
  const matches = (u: AdminUnit) =>
    (!statusF || u.status === statusF) && (typeF === "all" || u.type === typeF) && (!query || u.code.startsWith(query) || String(u.floor) === query);
  const filtered = statusF != null || typeF !== "all" || query !== "";
  const visible = inTower.filter(matches);

  const letters = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of inTower) if (!m.has(u.letter)) m.set(u.letter, u.type);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [inTower]);
  const floors = useMemo(() => {
    const m = new Map<number, Map<string, AdminUnit>>();
    for (const u of inTower) {
      const row = m.get(u.floor) ?? new Map();
      row.set(u.letter, u);
      m.set(u.floor, row);
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [inTower]);

  const selected = units.filter((u) => sel.includes(u.id));
  const selSet = new Set(sel);

  function pick(u: AdminUnit, additive: boolean) {
    if (additive) setSel((cur) => (cur.includes(u.id) ? cur.filter((x) => x !== u.id) : [...cur, u.id]));
    else setSel((cur) => (cur.length === 1 && cur[0] === u.id ? [] : [u.id]));
  }

  function pickFloor(n: number) {
    const ids = inTower.filter((u) => u.floor === n && matches(u)).map((u) => u.id);
    const all = ids.every((id) => selSet.has(id));
    setSel(all ? sel.filter((id) => !ids.includes(id)) : [...new Set([...sel, ...ids])]);
  }

  async function apply(change: Omit<UnitChange, "ids">, ids = sel, ask?: { title: string; body: string; danger?: boolean }) {
    if (ask && !(await confirm({ ...ask, confirmLabel: "Apply" }))) return false;
    return new Promise<boolean>((resolve) =>
      start(async () => {
        try {
          const res = await updateUnits({ ...change, ids });
          if (!res.ok) {
            toast(res.error, "err");
            return resolve(false);
          }
          const fresh = new Map(res.data!.units.map((u) => [u.id, u]));
          setUnits((list) => list.map((u) => fresh.get(u.id) ?? u));
          setHistory((h) => ({ ...h, ...res.data!.history }));
          toast(res.message ?? "Saved");
          resolve(true);
        } catch {
          toast("Could not save. Check your connection and try again.", "err");
          resolve(false);
        }
      }),
    );
  }

  function exportCsv() {
    const rows = units.map((u) => [
      `${u.tower}-${u.code}`,
      u.tower,
      u.floor,
      u.letter,
      u.type,
      u.label,
      u.beds,
      u.baths,
      u.sqft,
      u.balcony,
      u.facing,
      u.view,
      STATUS_META[u.status].label,
      u.priceMn,
      u.note,
      u.updatedAt,
    ]);
    downloadCsv(`${slug}-units-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["unit", "tower", "floor", "position", "type", "layout", "beds", "baths", "sqft", "balcony_sqft", "facing", "view", "status", "price_lkr_mn", "note", "updated_at"],
      ...rows,
    ]);
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div className="ad-page-head">
          <div>
            <h1>Units</h1>
            <div className="ad-sub">
              {project.name} · {units.length} units · changes go live on ovdc.lk immediately
            </div>
          </div>
          <select
            className="ad-input"
            aria-label="Project"
            style={{ width: 240 }}
            value={slug}
            onChange={(e) => router.push(`/admin/units?project=${e.target.value}`)}
          >
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          {towers.length > 1 && (
            <div className="ad-seg" role="group" aria-label="Tower">
              {towers.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={t === tower}
                  onClick={() => {
                    setTower(t);
                    setSel([]);
                  }}
                >
                  Tower {t}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="ad-btn ad-btn-secondary" onClick={exportCsv}>
            <Download size={16} />
            Export CSV
          </button>
        </div>

        <div className={s.legend} role="group" aria-label="Filter by status">
          {ORDER.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={statusF === k}
              onClick={() => setStatusF((f) => (f === k ? null : k))}
              className={s.legendItem}
            >
              <span className={`ad-st ad-st-${k}`} style={{ width: 26, height: 26, fontSize: 12 }}>
                {k}
              </span>
              <span style={{ flex: 1 }}>
                <span className="ad-kicker" style={{ display: "block" }}>
                  {STATUS_META[k].label}
                </span>
                <span className="ad-num" style={{ fontSize: 24 }}>
                  {counts[k]}
                </span>
              </span>
              {statusF === k && <Filter size={14} />}
            </button>
          ))}
        </div>

        <div className={s.toolbar}>
          <div className="ad-seg" role="group" aria-label="View">
            <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
              <LayoutGrid size={14} />
              Floor grid
            </button>
            <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>
              <Rows3 size={14} />
              Table
            </button>
          </div>
          <div className="ad-search" style={{ flex: "0 1 220px" }}>
            <Search size={16} />
            <input className="ad-input" aria-label="Search unit" placeholder="Unit or floor, e.g. 14B" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="ad-input" aria-label="Unit type" style={{ width: 210 }} value={typeF} onChange={(e) => setTypeF(e.target.value)}>
            <option value="all">All unit types</option>
            {layouts.map((l) => (
              <option key={l.type} value={l.type}>
                {l.type} · {l.label}
              </option>
            ))}
          </select>
          {filtered && (
            <button
              type="button"
              className="ad-btn ad-btn-ghost"
              onClick={() => {
                setStatusF(null);
                setQ("");
                setTypeF("all");
              }}
            >
              <X size={14} />
              Clear filters
            </button>
          )}
          <div style={{ flex: 1 }} />
          <span className={`ad-muted ${s.hint}`}>Click a unit · Ctrl/⌘-click to add · click a floor number to select the floor</span>
        </div>
      </div>

      <div className={s.body}>
        <div className={s.left}>
          {view === "grid" ? (
            <div className={s.gridWrap}>
              <div className={s.grid} style={{ gridTemplateColumns: `56px repeat(${letters.length}, minmax(76px, 1fr))` }} role="grid" aria-label={`Tower ${tower} floor grid`}>
                <div />
                {letters.map(([l, t]) => (
                  <div key={l} className={s.colHead}>
                    {l}
                    <span>{t}</span>
                  </div>
                ))}
                {floors.map(([n, row]) => (
                  <div key={n} style={{ display: "contents" }} role="row">
                    <button type="button" className={s.floorBtn} onClick={() => pickFloor(n)} aria-label={`Select floor ${n}`}>
                      {n}
                    </button>
                    {letters.map(([l]) => {
                      const u = row.get(l);
                      if (!u) return <div key={l} />;
                      const on = selSet.has(u.id);
                      const dim = filtered && !matches(u);
                      return (
                        <button
                          key={l}
                          type="button"
                          role="gridcell"
                          className={`${s.cell} ad-st-${u.status}`}
                          data-selected={on || undefined}
                          data-dim={dim || undefined}
                          aria-selected={on}
                          aria-label={`Unit ${u.code}, ${STATUS_META[u.status].label}, ${lkr(u.priceMn)}`}
                          title={`${u.tower}-${u.code} · ${u.type} · ${STATUS_META[u.status].label} · ${lkr(u.priceMn)}`}
                          onClick={(e) => pick(u, e.ctrlKey || e.metaKey || e.shiftKey)}
                        >
                          <span className={s.cellTop}>
                            <span>{u.code}</span>
                            <span>{u.status}</span>
                          </span>
                          <span className={s.cellPrice}>{mnShort(u.priceMn)}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ad-table" style={{ fontSize: 13, minWidth: 820 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        aria-label="Select all shown"
                        checked={visible.length > 0 && visible.every((u) => selSet.has(u.id))}
                        onChange={(e) => setSel(e.target.checked ? visible.map((u) => u.id) : [])}
                        style={{ margin: 0 }}
                      />
                    </th>
                    <th>Unit</th>
                    <th>Floor</th>
                    <th>Type</th>
                    <th className="r">Beds</th>
                    <th className="r">Sqft</th>
                    <th>View</th>
                    <th className="r">Price</th>
                    <th>Status</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => (
                    <tr key={u.id} data-selected={selSet.has(u.id) || undefined} onClick={(e) => pick(u, e.ctrlKey || e.metaKey || e.shiftKey)} style={{ cursor: "pointer" }}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${u.code}`}
                          checked={selSet.has(u.id)}
                          onChange={() => pick(u, true)}
                          style={{ margin: 0 }}
                        />
                      </td>
                      <td style={{ fontWeight: 800 }}>{u.code}</td>
                      <td>{u.floor}</td>
                      <td>{u.type}</td>
                      <td className="r">{u.beds}</td>
                      <td className="r">{u.sqft.toLocaleString("en-US")}</td>
                      <td>{u.view}</td>
                      <td className="r" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        {lkr(u.priceMn)}
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span className={`ad-st ad-st-${u.status}`}>{u.status}</span>
                          {STATUS_META[u.status].label}
                        </span>
                      </td>
                      <td className="ad-muted" style={{ fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!visible.length && (
            <div className="ad-empty" style={{ marginTop: 12 }}>
              <SearchX size={22} />
              <strong>No units match</strong>
              <button
                type="button"
                className="ad-btn ad-btn-secondary"
                onClick={() => {
                  setStatusF(null);
                  setQ("");
                  setTypeF("all");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <UnitPanel
          slug={slug}
          selected={selected}
          history={history}
          layouts={layouts}
          pending={pending}
          onApply={apply}
          onClear={() => setSel([])}
        />
      </div>
    </div>
  );
}
