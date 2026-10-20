"use client";

import { useState } from "react";
import { ExternalLink, LoaderCircle, MousePointerClick, Rotate3d, X } from "lucide-react";
import type { UnitChange } from "@/app/admin/actions";
import { dateShort, lkr, perSqftLkr } from "@/lib/admin/format";
import type { AdminUnit, PricePoint } from "@/lib/admin/types";
import type { UnitStatus } from "@/lib/types";
import type { Layout } from "./UnitsConsole";
import s from "./units.module.css";

export const STATUS_META: Record<UnitStatus, { label: string; help: string }> = {
  A: { label: "Available", help: "Shown as available and bookable on the website." },
  R: { label: "Reserved", help: "Held for a buyer; shown as reserved." },
  S: { label: "Sold", help: "Shown as sold." },
  B: { label: "Not released", help: "Hidden from sale; shown hatched." },
};
const ORDER: UnitStatus[] = ["A", "R", "S", "B"];

type Apply = (change: Omit<UnitChange, "ids">, ids?: number[], ask?: { title: string; body: string; danger?: boolean }) => Promise<boolean>;

interface Props {
  slug: string;
  selected: AdminUnit[];
  history: Record<number, PricePoint[]>;
  layouts: Layout[];
  pending: boolean;
  onApply: Apply;
  onClear: () => void;
}

export function UnitPanel(props: Props) {
  const { selected } = props;
  return (
    <aside className={s.panel} aria-label="Unit details">
      {selected.length === 0 && (
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <MousePointerClick size={20} />
          <strong style={{ fontSize: 14 }}>Select units to edit</strong>
          <p className="ad-muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Pick one unit for its details, price and history, or several (Ctrl/⌘-click, or a floor number) to change status or price together.
            Every change updates the availability on ovdc.lk straight away and is recorded in the activity log.
          </p>
        </div>
      )}
      {selected.length === 1 && <Single key={selected[0].id} unit={selected[0]} {...props} />}
      {selected.length > 1 && <Bulk key={selected.length} {...props} />}
    </aside>
  );
}

function StatusButtons({ current, disabled, onPick }: { current?: UnitStatus; disabled: boolean; onPick: (k: UnitStatus) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {ORDER.map((k) => (
        <button
          key={k}
          type="button"
          className="ad-btn ad-btn-secondary"
          style={{ justifyContent: "flex-start", fontSize: 13, background: current === k ? "var(--a-bg)" : undefined, borderColor: current === k ? "var(--a-text)" : undefined }}
          aria-pressed={current === k}
          disabled={disabled || current === k}
          title={STATUS_META[k].help}
          onClick={() => onPick(k)}
        >
          <span className={`ad-st ad-st-${k}`}>{k}</span>
          {STATUS_META[k].label}
        </button>
      ))}
    </div>
  );
}

function Single({ unit: u, slug, history, layouts, pending, onApply, onClear }: Props & { unit: AdminUnit }) {
  const [price, setPrice] = useState(String(u.priceMn));
  const [note, setNote] = useState(u.note);
  const layout = layouts.find((l) => l.type === u.type);
  const hist = history[u.id] ?? [];
  const ref = `${u.tower}-${u.code}`;
  const priceNum = Number(price);
  const priceDirty = price.trim() !== "" && priceNum !== u.priceMn;
  const priceValid = Number.isFinite(priceNum) && priceNum >= 1 && priceNum <= 100000;

  const setStatus = (k: UnitStatus) =>
    onApply(
      { status: k },
      [u.id],
      k === "S" || u.status === "S"
        ? { title: `Mark ${ref} as ${STATUS_META[k].label.toLowerCase()}?`, body: `It is currently ${STATUS_META[u.status].label.toLowerCase()}. The website updates immediately.`, danger: u.status === "S" }
        : undefined,
    );

  return (
    <>
      <div className={s.panelHead}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ad-kicker">
            Tower {u.tower} · Floor {u.floor}
          </div>
          <div className="ad-num" style={{ fontSize: 26, lineHeight: 1.15 }}>
            Unit {u.code}
          </div>
          <div className="ad-muted" style={{ fontSize: 12.5 }}>
            {u.type} · {u.label} · {u.sqft.toLocaleString("en-US")} sqft
          </div>
        </div>
        <span className={`ad-st-${u.status}`} style={{ fontSize: 12, fontWeight: 700, padding: "4px 8px", whiteSpace: "nowrap" }}>
          {u.status} · {STATUS_META[u.status].label}
        </span>
        <button type="button" className="ad-btn ad-btn-icon" onClick={onClear} aria-label="Close panel">
          <X size={16} />
        </button>
      </div>

      <div className={s.block}>
        <div className="ad-muted" style={{ fontSize: 12 }}>
          List price
        </div>
        <div className="ad-num" style={{ fontSize: 24, margin: "2px 0" }}>
          {lkr(u.priceMn)}
        </div>
        <div className="ad-muted" style={{ fontSize: 12 }}>
          {perSqftLkr(u.priceMn, u.sqft)} per sqft
        </div>
        <form
          style={{ display: "flex", gap: 6, marginTop: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (priceDirty && priceValid) onApply({ price: { mode: "set", value: priceNum } }, [u.id]);
          }}
        >
          <label className="ad-sr" htmlFor="unit-price">
            New price in LKR millions
          </label>
          <input
            id="unit-price"
            className="ad-input"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-invalid={price.trim() !== "" && !priceValid ? true : undefined}
            style={{ flex: 1 }}
          />
          <span className="ad-muted" style={{ alignSelf: "center", fontSize: 12.5 }}>
            Mn
          </span>
          <button className="ad-btn ad-btn-navy" disabled={!priceDirty || !priceValid || pending}>
            Update
          </button>
        </form>
      </div>

      <div style={{ padding: "4px 16px" }}>
        {[
          ["Bedrooms", u.label],
          ["Bathrooms", String(u.baths)],
          ["Interior", `${u.sqft.toLocaleString("en-US")} sqft`],
          ["Balcony", `${u.balcony} sqft`],
          ["Facing", u.facing],
          ["View", u.view],
        ].map(([k, v]) => (
          <div key={k} className={s.fact}>
            <span className="ad-muted">{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>

      <div className={s.block}>
        <div className="ad-kicker" style={{ marginBottom: 8 }}>
          Price history
        </div>
        {hist.length ? (
          hist.map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0", gap: 8 }}>
              <span className="ad-muted">
                {dateShort(h.changedAt)} · {h.changedBy === "seed" ? "launch price" : h.changedBy}
              </span>
              <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                {h.previousMn != null && <span className="ad-muted" style={{ textDecoration: "line-through", fontWeight: 400, marginRight: 6 }}>{h.previousMn}</span>}
                {lkr(h.priceMn)}
              </span>
            </div>
          ))
        ) : (
          <div className="ad-muted" style={{ fontSize: 12.5 }}>
            No price changes yet.
          </div>
        )}
      </div>

      <div className={s.block} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="ad-muted" style={{ fontSize: 12 }}>
          Set status
        </div>
        <StatusButtons current={u.status} disabled={pending} onPick={setStatus} />
      </div>

      <div className={s.block}>
        <label className="ad-label" htmlFor="unit-note">
          <span>Internal note</span>
          <span>{note.length} / 500</span>
        </label>
        <textarea
          id="unit-note"
          className="ad-input"
          maxLength={500}
          style={{ minHeight: 64 }}
          placeholder="e.g. Held for Mr. Perera until 30 Oct"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" disabled={note === u.note || pending} onClick={() => onApply({ note }, [u.id])}>
            Save note
          </button>
        </div>
      </div>

      <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <a className="ad-btn ad-btn-ghost" style={{ justifyContent: "flex-start" }} href={`/projects/${slug}/units/${ref}`} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          View on website
        </a>
        {layout?.tourId && (
          <a className="ad-btn ad-btn-ghost" style={{ justifyContent: "flex-start" }} href={`/tours/${layout.tourId}`} target="_blank" rel="noreferrer">
            <Rotate3d size={15} />
            {u.type} 360° tour
          </a>
        )}
        {pending && (
          <span className="ad-muted" style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <LoaderCircle size={14} className="ad-spin" /> Saving…
          </span>
        )}
      </div>
    </>
  );
}

function Bulk({ selected, pending, onApply, onClear }: Props) {
  const [mode, setMode] = useState<"pct" | "add" | "set">("pct");
  const [val, setVal] = useState("");
  const n = Number(val);
  const valid = val.trim() !== "" && Number.isFinite(n) && (mode === "set" ? n >= 1 : n !== 0);
  const prices = selected.map((u) => u.priceMn);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const calc = (p: number) => Math.round((mode === "set" ? n : mode === "pct" ? p * (1 + n / 100) : p + n) * 10) / 10;
  const counts = ORDER.map((k) => [k, selected.filter((u) => u.status === k).length] as const).filter(([, c]) => c);
  const refs = selected.map((u) => `${u.tower}-${u.code}`);

  return (
    <>
      <div className={s.panelHead}>
        <div style={{ flex: 1 }}>
          <div className="ad-kicker">Bulk edit</div>
          <div className="ad-num" style={{ fontSize: 26, lineHeight: 1.15 }}>
            {selected.length} units
          </div>
          <div className="ad-muted" style={{ fontSize: 12, display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            {counts.map(([k, c]) => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span className={`ad-st ad-st-${k}`} style={{ width: 10, height: 10 }} />
                {c} {STATUS_META[k].label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="ad-btn ad-btn-icon" onClick={onClear} aria-label="Clear selection">
          <X size={16} />
        </button>
      </div>
      <div className={s.block}>
        <div className="ad-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          {refs.slice(0, 18).join(", ")}
          {refs.length > 18 ? ` and ${refs.length - 18} more` : ""}
        </div>
      </div>
      <div className={s.block} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="ad-muted" style={{ fontSize: 12 }}>
          Change status to
        </div>
        <StatusButtons
          disabled={pending}
          onPick={(k) =>
            onApply({ status: k }, undefined, {
              title: `Mark ${selected.length} units as ${STATUS_META[k].label.toLowerCase()}?`,
              body: `${refs.slice(0, 8).join(", ")}${refs.length > 8 ? "…" : ""}. The website updates immediately.`,
              danger: selected.some((u) => u.status === "S") && k !== "S",
            })
          }
        />
      </div>
      <form
        style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          const ok = await onApply({ price: { mode, value: n } }, undefined, {
            title: `Change the price of ${selected.length} units?`,
            body: `${lkr(lo)}–${lkr(hi)} becomes ${lkr(calc(lo))}–${lkr(calc(hi))}. Each change is kept in the unit's price history.`,
          });
          if (ok) setVal("");
        }}
      >
        <div className="ad-muted" style={{ fontSize: 12 }}>
          Change price
        </div>
        <div className="ad-seg" role="group" aria-label="Price change mode">
          {(
            [
              ["pct", "By %"],
              ["add", "By LKR Mn"],
              ["set", "Set to"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="ad-input"
            aria-label="Price change value"
            inputMode="decimal"
            placeholder={mode === "pct" ? "e.g. 3 or -2.5" : mode === "add" ? "e.g. 1.5" : "e.g. 72.5"}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            style={{ flex: 1 }}
          />
          <span className="ad-muted" style={{ alignSelf: "center", fontSize: 13, minWidth: 28 }}>
            {mode === "pct" ? "%" : "Mn"}
          </span>
        </div>
        <div className="ad-muted" style={{ fontSize: 12 }}>
          {valid ? `${lkr(lo)}–${lkr(hi)} → ${lkr(calc(lo))}–${lkr(calc(hi))}` : `Current range ${lkr(lo)}–${lkr(hi)}`}
        </div>
        <button className="ad-btn ad-btn-primary ad-btn-split" disabled={!valid || pending}>
          Apply price change
          {pending ? <LoaderCircle size={15} className="ad-spin" /> : null}
        </button>
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClear} style={{ alignSelf: "flex-start" }}>
          Clear selection
        </button>
      </form>
    </>
  );
}
