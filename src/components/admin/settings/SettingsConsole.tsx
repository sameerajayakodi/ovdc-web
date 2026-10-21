"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CircleAlert, Plus, Trash2 } from "lucide-react";
import { saveSettings, type SettingsInput } from "@/app/admin/settings-actions";
import { useAdminUi } from "../AdminRoot";
import { RATE_KEYS, SOCIAL_KEYS } from "@/lib/admin/settings";
import { dateTime } from "@/lib/admin/format";
import { CURRENCY_NAMES } from "@/lib/money";
import type { Office, SiteSettings } from "@/lib/api";
import s from "./settings.module.css";

type Tab = "company" | "contacts" | "offices" | "currency";
const TABS: { k: Tab; label: string; title: string; sub: string }[] = [
  { k: "company", label: "Company", title: "Company", sub: "Legal details shown in the website footer, legal page and receipts" },
  { k: "contacts", label: "Contacts & social", title: "Contacts & social", sub: "The hotline, WhatsApp and email on every page, and the footer's social links" },
  { k: "offices", label: "Offices & galleries", title: "Offices & galleries", sub: "Shown on the contact page with a map pin each" },
  { k: "currency", label: "Exchange rates", title: "Exchange rates", sub: "Foreign prices on the website are converted from LKR at these rates" },
];
const SOCIAL_LABEL: Record<(typeof SOCIAL_KEYS)[number], string> = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", linkedin: "LinkedIn" };
/** Unit 14B, Ocean View Residences — the example price in the rates table. */
const EXAMPLE_MN = 94.2;

function toInput(st: SiteSettings): SettingsInput {
  const c = st.company;
  return {
    company: {
      name: c.name,
      short: c.short,
      reg: c.reg,
      vat: c.vat ?? "",
      address: [c.address[0] ?? "", c.address[1] ?? ""],
      hours: c.hours,
      hotline: c.hotline,
      whatsapp: c.whatsapp,
      email: c.email,
      socials: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, c.socials?.[k] ?? ""])),
    },
    offices: st.offices.map((o) => ({ ...o, lines: [o.lines[0] ?? "", o.lines[1] ?? ""] })),
    fx: { USD: st.fx.USD, AUD: st.fx.AUD, AED: st.fx.AED },
  };
}

export function SettingsConsole({ settings, savedAt, initialTab }: { settings: SiteSettings; savedAt: string | null; initialTab: Tab }) {
  const { toast } = useAdminUi();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [base, setBase] = useState(() => toInput(settings));
  const [v, setV] = useState(base);
  const [err, setErr] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(savedAt);
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify(v) !== JSON.stringify(base), [v, base]);
  const cur = TABS.find((t) => t.k === tab)!;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const pick = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  };
  const co = <K extends keyof SettingsInput["company"]>(k: K, val: SettingsInput["company"][K]) => setV((x) => ({ ...x, company: { ...x.company, [k]: val } }));
  const office = (i: number, patch: Partial<Office>) => setV((x) => ({ ...x, offices: x.offices.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));

  function save() {
    start(async () => {
      try {
        const r = await saveSettings(v);
        if (!r.ok) {
          setErr(r.fields ?? {});
          const k = Object.keys(r.fields ?? {})[0] ?? "";
          // Jump to the tab that holds the first problem.
          setTab(k.startsWith("office") ? "offices" : k.startsWith("fx_") ? "currency" : ["hotline", "whatsapp", "email"].includes(k) || k.startsWith("social_") ? "contacts" : "company");
          return toast(r.error, "err");
        }
        setErr({});
        setBase(v);
        setSaved(new Date().toISOString());
        toast(r.message ?? "Saved");
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  const text = (id: string, label: string, value: string, onChange: (x: string) => void, opts: { err?: string; placeholder?: string; type?: string; wide?: boolean; readOnly?: boolean } = {}) => (
    <div className="ad-field" style={opts.wide ? { gridColumn: "1 / -1" } : undefined}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="ad-input" type={opts.type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={opts.placeholder} aria-invalid={!!opts.err || undefined} readOnly={opts.readOnly} />
      {opts.err && (
        <span className="ad-error">
          <CircleAlert size={13} />
          {opts.err}
        </span>
      )}
    </div>
  );

  return (
    <div className={s.wrap}>
      <nav className={s.tabs} aria-label="Settings sections">
        {TABS.map((t) => (
          <button key={t.k} type="button" aria-current={tab === t.k || undefined} onClick={() => pick(t.k)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className={s.main}>
        <div>
          <h1>{cur.title}</h1>
          <div className="ad-sub">{cur.sub}</div>
        </div>

        {tab === "company" && (
          <section className={`ad-section ${s.grid}`}>
            {text("st-n", "Legal name", v.company.name, (x) => co("name", x), { err: err.name })}
            {text("st-short", "Short name", v.company.short, (x) => co("short", x), { err: err.short })}
            {text("st-br", "Business registration no.", v.company.reg, (x) => co("reg", x))}
            {text("st-vat", "VAT no.", v.company.vat, (x) => co("vat", x), { placeholder: "Optional" })}
            {text("st-ad1", "Registered address", v.company.address[0], (x) => co("address", [x, v.company.address[1]]), { err: err.address, wide: true })}
            {text("st-ad2", "Address, second line", v.company.address[1], (x) => co("address", [v.company.address[0], x]), { wide: true, placeholder: "Colombo 03, Sri Lanka" })}
            {text("st-hrs", "Sales gallery hours", v.company.hours, (x) => co("hours", x), { wide: true })}
            {text("st-dom", "Website domain", "ovdc.lk", () => {}, { readOnly: true })}
          </section>
        )}

        {tab === "contacts" && (
          <section className={`ad-section ${s.grid}`}>
            {text("st-hot", "Sales hotline", v.company.hotline, (x) => co("hotline", x), { err: err.hotline, type: "tel" })}
            {text("st-wa", "WhatsApp Business number", v.company.whatsapp, (x) => co("whatsapp", x), { err: err.whatsapp, type: "tel" })}
            {text("st-em", "Sales email", v.company.email, (x) => co("email", x), { err: err.email, type: "email" })}
            <div style={{ gridColumn: "1 / -1" }} className="ad-kicker">
              Social links · shown in the footer when set
            </div>
            {SOCIAL_KEYS.map((k) =>
              text(`st-so-${k}`, SOCIAL_LABEL[k], v.company.socials[k] ?? "", (x) => co("socials", { ...v.company.socials, [k]: x }), { err: err[`social_${k}`], placeholder: `https://www.${k}.com/…`, type: "url" }),
            )}
          </section>
        )}

        {tab === "offices" && (
          <div className={s.offices}>
            {v.offices.map((o, i) => (
              <section key={i} className="ad-section" aria-label={`Office ${i + 1}`}>
                <div className="ad-section-head">
                  <h5>{o.city || `Office ${i + 1}`}</h5>
                  <button type="button" className="ad-btn ad-btn-icon" aria-label={`Move ${o.city || "office"} up`} disabled={i === 0} onClick={() => setV((x) => ({ ...x, offices: swap(x.offices, i, i - 1) }))}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className="ad-btn ad-btn-icon" aria-label={`Move ${o.city || "office"} down`} disabled={i === v.offices.length - 1} onClick={() => setV((x) => ({ ...x, offices: swap(x.offices, i, i + 1) }))}>
                    <ArrowDown size={15} />
                  </button>
                  <button type="button" className="ad-btn ad-btn-icon" aria-label={`Remove ${o.city || "office"}`} disabled={v.offices.length === 1} onClick={() => setV((x) => ({ ...x, offices: x.offices.filter((_, j) => j !== i) }))}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className={s.grid}>
                  {text(`of-c${i}`, "City", o.city, (x) => office(i, { city: x }))}
                  {text(`of-l${i}`, "Label", o.label, (x) => office(i, { label: x }), { placeholder: "Head office & sales gallery" })}
                  {text(`of-a${i}`, "Address", o.lines[0], (x) => office(i, { lines: [x, o.lines[1]] }), { wide: true })}
                  {text(`of-b${i}`, "Address, second line", o.lines[1], (x) => office(i, { lines: [o.lines[0], x] }), { wide: true })}
                  {text(`of-p${i}`, "Phone", o.phone, (x) => office(i, { phone: x }), { type: "tel" })}
                  {text(`of-e${i}`, "Email", o.email, (x) => office(i, { email: x }), { type: "email" })}
                  {text(`of-h${i}`, "Hours", o.hours, (x) => office(i, { hours: x }), { wide: true })}
                  {text(`of-la${i}`, "Latitude", String(o.lat), (x) => office(i, { lat: Number(x) }), { type: "number" })}
                  {text(`of-ln${i}`, "Longitude", String(o.lng), (x) => office(i, { lng: Number(x) }), { type: "number" })}
                  {err[`office${i}`] && (
                    <span className="ad-error" style={{ gridColumn: "1 / -1" }}>
                      <CircleAlert size={13} />
                      {err[`office${i}`]}
                    </span>
                  )}
                  <a className="ad-btn ad-btn-ghost ad-btn-sm" style={{ justifySelf: "start", paddingLeft: 0 }} href={`https://www.openstreetmap.org/?mlat=${o.lat}&mlon=${o.lng}#map=17/${o.lat}/${o.lng}`} target="_blank" rel="noreferrer">
                    Check the pin on a map
                  </a>
                </div>
              </section>
            ))}
            <button
              type="button"
              className="ad-btn ad-btn-secondary"
              style={{ alignSelf: "flex-start" }}
              onClick={() => setV((x) => ({ ...x, offices: [...x.offices, { city: "", label: "", lines: ["", ""], phone: "", email: "", hours: "", lat: 6.9271, lng: 79.8612 }] }))}
            >
              <Plus size={16} />
              Add office
            </button>
          </div>
        )}

        {tab === "currency" && (
          <section className="ad-section">
            <div className="ad-section-head">
              <h5>Exchange rates · base LKR</h5>
              <span className="ad-muted" style={{ fontSize: 12 }}>
                Set by hand · check against the Central Bank mid-rate
              </span>
            </div>
            <div style={{ overflowX: "auto", padding: "4px 8px 8px" }}>
              <table className="ad-table" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>Currency</th>
                    <th className="r">1 unit = LKR</th>
                    <th className="r">Unit 14B shown as</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_KEYS.map((k) => (
                    <tr key={k}>
                      <td>
                        <strong>{k}</strong> · {CURRENCY_NAMES[k]}
                        {err[`fx_${k}`] && <div className="ad-error">{err[`fx_${k}`]}</div>}
                      </td>
                      <td className="r">
                        <input
                          className="ad-input"
                          style={{ width: 120, textAlign: "right" }}
                          inputMode="decimal"
                          aria-label={`${k} rate`}
                          value={String(v.fx[k])}
                          onChange={(e) => setV((x) => ({ ...x, fx: { ...x.fx, [k]: Number(e.target.value.replace(",", ".")) || 0 } }))}
                          aria-invalid={!!err[`fx_${k}`] || undefined}
                        />
                      </td>
                      <td className="r" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {v.fx[k] > 0 ? `${k} ${(Math.round((EXAMPLE_MN * 1e6) / v.fx[k] / 1000) * 1000).toLocaleString("en-US")}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ad-muted" style={{ margin: 0, padding: "0 16px 16px", fontSize: 12.5 }}>
              Foreign prices are indicative. Sale agreements and receipts are issued in LKR.
            </p>
          </section>
        )}

        <div className={s.bar} data-dirty={dirty || undefined}>
          <span className={s.state}>
            <span className={s.dot} />
            {dirty ? "Unsaved changes" : saved ? `All changes saved · ${dateTime(saved)}` : "Using the built-in defaults"}
          </span>
          <div style={{ flex: 1 }} />
          <button type="button" className="ad-btn ad-btn-secondary" onClick={() => (setV(base), setErr({}))} disabled={!dirty || pending}>
            Discard
          </button>
          <button type="button" className="ad-btn ad-btn-primary" onClick={save} disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function swap<T>(list: T[], a: number, b: number) {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
