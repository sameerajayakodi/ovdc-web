"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useOptimistic, useState, useTransition } from "react";
import { CalendarClock, CalendarPlus, CalendarX2, Check, ChevronLeft, ChevronRight, CircleCheck, Inbox, MessageCircle, Minus, Phone, Plus, UserX } from "lucide-react";
import { setCapacity, updateVisit, type VisitPatch } from "@/app/admin/crm-actions";
import { useAdminUi } from "../AdminRoot";
import {
  DEFAULT_CAPACITY,
  DOW,
  MONTHS,
  STAGE_NAME,
  VISIT_STATUSES,
  VISIT_STATUS_NAME,
  VISIT_TIMES,
  VISIT_TYPES,
  addDays,
  clock,
  colombo,
  dayLabel,
  hhmmOf,
  hourLabel,
  waNumber,
  ymdOf,
  type CalendarView,
} from "@/lib/admin/crm";
import type { AdminVisit } from "@/lib/admin/types";
import { BookVisitDialog, type LeadOption } from "./BookVisitDialog";
import s from "./visits.module.css";

interface Props {
  view: CalendarView;
  d: string;
  today: string;
  start: string;
  days: number;
  visits: AdminVisit[];
  capacity: Record<string, number>;
  agents: string[];
  projects: string[];
  leadOptions: LeadOption[];
  initialVisit: number | null;
  bookLead: number | null;
  initialLocation: string;
  now: number;
}

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const VIEWS: [CalendarView, string][] = [
  ["day", "Day"],
  ["week", "Week"],
  ["month", "Month"],
  ["list", "List"],
];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const dayOf = (v: AdminVisit) => ymdOf(Date.parse(v.startsAt));
const rowOf = (v: AdminVisit) => Math.min(18, Math.max(9, colombo(Date.parse(v.startsAt)).h));
const shortProject = (p: string) => p.replace(/\bResidences\b|\bThe\b|\bUrban\b/g, "").replace(/\s+/g, " ").trim();

function rangeLabel(view: CalendarView, d: string, start: string) {
  const [y, m, day] = d.split("-").map(Number);
  if (view === "day") return `${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][(new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7]} ${day} ${FULL_MONTHS[m - 1]} ${y}`;
  if (view === "month") return `${FULL_MONTHS[m - 1]} ${y}`;
  const end = addDays(start, 6);
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return sm === em ? `${sd}–${ed} ${FULL_MONTHS[sm - 1]} ${sy}` : `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]} ${ey}`;
}

function shift(view: CalendarView, d: string, dir: 1 | -1) {
  if (view === "day") return addDays(d, dir);
  if (view === "month") {
    const [y, m] = d.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1 + dir, 1));
    return t.toISOString().slice(0, 10);
  }
  return addDays(d, 7 * dir);
}

export function VisitsConsole(props: Props) {
  const { view, d, today, start, days, visits, capacity, agents, projects, leadOptions, initialVisit, bookLead, initialLocation, now } = props;
  const router = useRouter();
  const { toast, confirm } = useAdminUi();
  const [loc, setLoc] = useState(initialLocation);
  const [cur, setCur] = useState<number | null>(initialVisit);
  const [booking, setBooking] = useState<{ date: string; time: string; leadId?: number } | null>(
    bookLead ? { date: d >= today ? d : today, time: "10:00", leadId: bookLead } : null,
  );
  const [pending, start_] = useTransition();
  const [list, patchList] = useOptimistic(visits, (cur: AdminVisit[], p: { id: number; patch: Partial<AdminVisit> }) => cur.map((v) => (v.id === p.id ? { ...v, ...p.patch } : v)));
  const [caps, patchCaps] = useOptimistic(capacity, (c: Record<string, number>, p: { loc: string; n: number }) => ({ ...c, [p.loc]: p.n }));

  const locations = useMemo(() => [...new Set([...Object.keys(capacity), ...visits.map((v) => v.location)])], [capacity, visits]);
  const shown = useMemo(() => list.filter((v) => loc === "all" || v.location === loc), [list, loc]);
  const curVisit = list.find((v) => v.id === cur) ?? null;

  const href = useCallback(
    (o: { view?: CalendarView; d?: string }) => {
      const q = new URLSearchParams({ view: o.view ?? view, d: o.d ?? d });
      if (loc !== "all") q.set("loc", loc);
      return `/admin/visits?${q}`;
    },
    [view, d, loc],
  );

  function syncUrl(next: { visit?: number | null; loc?: string }) {
    const q = new URLSearchParams(window.location.search);
    q.delete("book");
    if (next.visit !== undefined) {
      if (next.visit) q.set("visit", String(next.visit));
      else q.delete("visit");
    }
    if (next.loc !== undefined) {
      if (next.loc === "all") q.delete("loc");
      else q.set("loc", next.loc);
    }
    window.history.replaceState(null, "", `?${q}`);
  }
  const pick = (id: number) => {
    setCur(id);
    syncUrl({ visit: id });
  };

  const capOf = (l: string) => caps[l] ?? DEFAULT_CAPACITY;
  /** The busiest location in a set of visits, against its hourly capacity. */
  function load(items: AdminVisit[]) {
    const by = new Map<string, number>();
    for (const v of items) if (v.status !== "cancelled") by.set(v.location, (by.get(v.location) ?? 0) + 1);
    let worst: { l: string; n: number; cap: number } | null = null;
    for (const [l, n] of by) {
      const cap = capOf(l);
      if (!worst || n / cap > worst.n / worst.cap) worst = { l, n, cap };
    }
    return worst;
  }

  function addAt(day: string, h: number, items: AdminVisit[]) {
    if (day < today) return;
    const w = load(items);
    if (w && w.n >= w.cap && (loc === "all" || loc === w.l)) return toast(`${w.l} is full at ${hourLabel(h)}. Pick another time or raise its capacity.`, "err");
    setBooking({ date: day, time: `${String(h).padStart(2, "0")}:00` });
  }

  // Subtitle numbers
  const todays = shown.filter((v) => dayOf(v) === today && v.status !== "cancelled");
  const waiting = shown.filter((v) => v.status === "pending" && Date.parse(v.startsAt) >= now);
  const active = shown.filter((v) => v.status !== "cancelled");
  const sub =
    view === "day"
      ? `${active.length} visit${active.length === 1 ? "" : "s"} · ${rangeLabel(view, d, start)}`
      : view === "month"
        ? `${active.filter((v) => dayOf(v).slice(0, 7) === d.slice(0, 7)).length} visits · ${rangeLabel(view, d, start)}`
        : `${active.length} visit${active.length === 1 ? "" : "s"} · ${rangeLabel(view, d, start)}${todays.length || today >= start && today < addDays(start, 7) ? ` · ${todays.length} today` : ""}${waiting.length ? `, ${waiting.length} waiting for confirmation` : ""}`;

  const chip = (v: AdminVisit, wide = false) => (
    <button
      key={v.id}
      type="button"
      className={`${s.chip} ad-vs`}
      data-visit={v.status}
      data-on={cur === v.id || undefined}
      onClick={(e) => {
        e.stopPropagation();
        pick(v.id);
      }}
      aria-label={`${clock(Date.parse(v.startsAt))} ${v.name}, ${VISIT_STATUS_NAME[v.status]}`}
    >
      <strong>
        {clock(Date.parse(v.startsAt))} {v.name}
      </strong>
      <span>{wide ? v.location : [shortProject(v.project) || v.location, v.agent.split(" ")[0]].filter(Boolean).join(" · ")}</span>
    </button>
  );

  /* ───────── views ───────── */

  function week() {
    const cols = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return (
      <div className={s.gridWrap}>
        <div className={s.grid} style={{ gridTemplateColumns: "56px repeat(7, minmax(110px, 1fr))", minWidth: 860 }}>
          <div />
          {cols.map((day, i) => {
            const n = shown.filter((v) => dayOf(v) === day && v.status !== "cancelled").length;
            return (
              <Link key={day} href={href({ view: "day", d: day })} className={s.dayHead} data-today={day === today || undefined}>
                <span className={s.dow}>{DOW[i]}</span>
                <span className={s.dnum}>{Number(day.slice(8))}</span>
                <span className="ad-muted" style={{ fontSize: 11 }}>
                  {n} visit{n === 1 ? "" : "s"}
                </span>
              </Link>
            );
          })}
          {HOURS.map((h) => (
            <Row key={h} h={h}>
              {cols.map((day) => {
                const items = shown.filter((v) => dayOf(v) === day && rowOf(v) === h);
                const w = load(items);
                const full = !!w && w.n >= w.cap;
                return (
                  <div
                    key={day}
                    className={s.cell}
                    data-full={full || undefined}
                    data-past={day < today || undefined}
                    onClick={() => addAt(day, h, items)}
                    title={day < today ? undefined : full ? `${w!.l} is full` : `Book a visit on ${dayLabel(day)} at ${hourLabel(h)}`}
                  >
                    {items.map((v) => chip(v))}
                    {w && (
                      <span className={s.cap} title={`${w.l}: ${w.n} of ${w.cap} per hour`}>
                        {w.n}/{w.cap}
                      </span>
                    )}
                  </div>
                );
              })}
            </Row>
          ))}
        </div>
      </div>
    );
  }

  function dayView() {
    const items = shown.filter((v) => dayOf(v) === d);
    const names = [...new Set(items.map((v) => v.agent || ""))].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
    const cols = names.length ? names : ["__none"];
    return (
      <div className={s.gridWrap}>
        <div className={s.grid} style={{ gridTemplateColumns: `56px repeat(${cols.length}, minmax(160px, 1fr))`, minWidth: 56 + cols.length * 160 }}>
          <div />
          {cols.map((a) => (
            <div key={a} className={s.dayHead} style={{ cursor: "default" }}>
              <strong style={{ fontSize: 13 }}>{a === "__none" ? "No visits" : a || "Unassigned"}</strong>
              <span className="ad-muted" style={{ fontSize: 11.5 }}>
                {a === "__none" ? "Click a slot to book" : `${items.filter((v) => (v.agent || "") === a).length} visits`}
              </span>
            </div>
          ))}
          {HOURS.map((h) => (
            <Row key={h} h={h}>
              {cols.map((a) => {
                const cell = items.filter((v) => (v.agent || "") === a && rowOf(v) === h);
                return (
                  <div key={a} className={s.cell} data-past={d < today || undefined} onClick={() => addAt(d, h, items.filter((v) => rowOf(v) === h))}>
                    {cell.map((v) => chip(v, true))}
                  </div>
                );
              })}
            </Row>
          ))}
        </div>
      </div>
    );
  }

  function monthView() {
    const month = d.slice(0, 7);
    return (
      <div className={s.month}>
        {DOW.map((x) => (
          <div key={x} className={s.monthDow}>
            {x}
          </div>
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = addDays(start, i);
          const items = shown.filter((v) => dayOf(v) === day && v.status !== "cancelled");
          return (
            <Link key={day} href={href({ view: "day", d: day })} className={s.monthCell} data-out={day.slice(0, 7) !== month || undefined} data-today={day === today || undefined}>
              <span className={s.monthNum}>{Number(day.slice(8))}</span>
              {items.length > 0 && (
                <>
                  <span style={{ fontSize: 11.5, fontWeight: 700 }}>
                    {items.length} visit{items.length === 1 ? "" : "s"}
                  </span>
                  <span className={s.dots}>
                    {items.slice(0, 8).map((v) => (
                      <span key={v.id} data-visit={v.status} title={`${clock(Date.parse(v.startsAt))} ${v.name}`} />
                    ))}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  function listView() {
    const rows = [...shown].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    if (!rows.length)
      return (
        <div className="ad-empty">
          <div className="ad-empty-icon">
            <CalendarX2 size={20} />
          </div>
          <h4>No visits this week</h4>
          <p className="ad-muted" style={{ margin: 0 }}>
            Website bookings appear here automatically. Use “Book visit” for calls and walk-ins.
          </p>
        </div>
      );
    return (
      <div style={{ overflowX: "auto" }}>
        <table className="ad-table" style={{ fontSize: 13, minWidth: 760 }}>
          <thead>
            <tr>
              <th>When</th>
              <th>Visitor</th>
              <th>Project · where</th>
              <th>Agent</th>
              <th>Status</th>
              <th className="r">Party</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} onClick={() => pick(v.id)} style={{ cursor: "pointer" }} data-selected={cur === v.id || undefined}>
                <td style={{ whiteSpace: "nowrap" }}>
                  <strong>{dayLabel(dayOf(v))}</strong> {clock(Date.parse(v.startsAt))}
                </td>
                <td>
                  {v.name}
                  <div className="ad-muted" style={{ fontSize: 11.5 }}>
                    {v.mobile}
                  </div>
                </td>
                <td>
                  {v.project || "—"}
                  <div className="ad-muted" style={{ fontSize: 11.5 }}>
                    {v.location}
                  </div>
                </td>
                <td>{v.agent || <span className="ad-muted">Unassigned</span>}</td>
                <td>
                  <span className="ad-tag ad-vs" data-visit={v.status}>
                    {VISIT_STATUS_NAME[v.status]}
                  </span>
                </td>
                <td className="r">{v.party}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ───────── actions ───────── */

  function act(v: AdminVisit, patch: VisitPatch, optimistic: Partial<AdminVisit>, force = false) {
    start_(async () => {
      patchList({ id: v.id, patch: optimistic });
      try {
        const r = await updateVisit(v.id, patch, force);
        if (!r.ok) {
          if (r.fields?.capacity && (await confirm({ title: "This slot is full", body: `${r.error} Book it anyway?`, confirmLabel: "Book anyway" }))) return act(v, patch, optimistic, true);
          return toast(r.error, "err");
        }
        if (r.message) toast(r.message);
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  function changeCap(l: string, n: number) {
    if (n < 1 || n > 50) return;
    start_(async () => {
      patchCaps({ loc: l, n });
      const r = await setCapacity(l, n);
      if (!r.ok) toast(r.error, "err");
    });
  }

  return (
    <div className={s.page}>
      <div className="ad-page-head">
        <div>
          <h1>Site visits</h1>
          <div className="ad-sub">{sub}</div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <Link className="ad-btn ad-btn-icon ad-btn-secondary" aria-label="Previous" href={href({ d: shift(view, d, -1) })}>
            <ChevronLeft size={16} />
          </Link>
          <Link className="ad-btn ad-btn-secondary" href={href({ d: today })}>
            Today
          </Link>
          <Link className="ad-btn ad-btn-icon ad-btn-secondary" aria-label="Next" href={href({ d: shift(view, d, 1) })}>
            <ChevronRight size={16} />
          </Link>
        </div>
        <nav className="ad-seg" aria-label="Calendar view">
          {VIEWS.map(([k, label]) => (
            <Link key={k} href={href({ view: k })} aria-current={view === k ? "true" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <select
          className="ad-input"
          aria-label="Location"
          style={{ width: 230 }}
          value={loc}
          onChange={(e) => {
            setLoc(e.target.value);
            syncUrl({ loc: e.target.value });
          }}
        >
          <option value="all">All locations</option>
          {locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => setBooking({ date: d >= today ? d : today, time: "10:00" })}>
          <CalendarPlus size={16} />
          Book visit
        </button>
      </div>

      <div className={s.legend}>
        {VISIT_STATUSES.map((x) => (
          <span key={x.k}>
            <span className={`${s.swatch} ad-vs`} data-visit={x.k} />
            {x.label}
          </span>
        ))}
        <span>
          <span className={s.swatch} data-full />
          Slot full
        </span>
      </div>

      <div className={s.body}>
        <div className={s.main}>{view === "week" ? week() : view === "day" ? dayView() : view === "month" ? monthView() : listView()}</div>

        <aside className={s.side} aria-label="Visit details">
          {curVisit ? (
            <VisitPanel key={curVisit.id} v={curVisit} agents={agents} pending={pending} act={act} now={now} />
          ) : (
            <div className={s.panelEmpty}>
              <CalendarClock size={20} />
              <p style={{ margin: 0 }}>Select a visit to confirm, reschedule or record the outcome.</p>
              {waiting.length > 0 && (
                <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => pick(waiting[0].id)}>
                  Next to confirm: {waiting[0].name}
                </button>
              )}
            </div>
          )}
          <div className={s.caps}>
            <div className="ad-kicker" style={{ marginBottom: 6 }}>
              Visits per hour, by location
            </div>
            {locations.map((l) => (
              <div key={l} className={s.capRow} role="group" aria-label={l}>
                <span style={{ flex: 1, minWidth: 0 }}>{l}</span>
                <button type="button" className="ad-btn ad-btn-icon" style={{ width: 28, height: 28 }} onClick={() => changeCap(l, capOf(l) - 1)} aria-label={`Decrease capacity for ${l}`} disabled={capOf(l) <= 1}>
                  <Minus size={13} />
                </button>
                <strong style={{ width: 18, textAlign: "center" }}>{capOf(l)}</strong>
                <button type="button" className="ad-btn ad-btn-icon" style={{ width: 28, height: 28 }} onClick={() => changeCap(l, capOf(l) + 1)} aria-label={`Increase capacity for ${l}`}>
                  <Plus size={13} />
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {booking && (
        <BookVisitDialog
          initial={booking}
          leads={leadOptions}
          agents={agents}
          projects={projects}
          locations={locations}
          today={today}
          onClose={() => {
            setBooking(null);
            syncUrl({});
          }}
          onBooked={(id, date) => {
            setBooking(null);
            setCur(id);
            // Show the calendar page that contains the new visit.
            router.push(`${href({ d: date })}&visit=${id}`, { scroll: false });
          }}
        />
      )}
    </div>
  );
}

function Row({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <>
      <div className={s.hour}>{hourLabel(h)}</div>
      {children}
    </>
  );
}

function VisitPanel({
  v,
  agents,
  pending,
  act,
  now,
}: {
  v: AdminVisit;
  agents: string[];
  pending: boolean;
  act: (v: AdminVisit, patch: VisitPatch, optimistic: Partial<AdminVisit>) => void;
  now: number;
}) {
  const { confirm } = useAdminUi();
  const [moving, setMoving] = useState(false);
  const ms = Date.parse(v.startsAt);
  const day = ymdOf(ms);
  const time = hhmmOf(ms);
  const tel = v.mobile.replace(/[^\d+]/g, "");
  const wa = waNumber(v.mobile);
  const first = v.name.split(" ")[0] || "";
  const waText = `Hello ${first}, this is OVDC confirming your ${v.type === "video" ? "video tour" : "site visit"} on ${dayLabel(day)} at ${clock(ms)}${v.type === "video" ? "" : ` at the ${v.location}`}. Reply YES to confirm, or let us know a better time.`;
  const past = ms < now;
  const closed = v.status === "completed" || v.status === "no-show" || v.status === "cancelled";
  const times = VISIT_TIMES.includes(time) ? VISIT_TIMES : [...VISIT_TIMES, time].sort();

  const facts: [string, React.ReactNode][] = [
    ["Project", v.project || "Not sure yet"],
    ["Where", v.location],
    ["Visit", VISIT_TYPES.find((t) => t.k === v.type)?.label ?? v.type],
    ["Party", `${v.party} ${v.party === 1 ? "person" : "people"}`],
    ["Booked", v.bookedBy === "website" ? "ovdc.lk booking form" : `In the console · ${v.bookedBy}`],
    [
      "Lead",
      <Link key="l" href={`/admin/leads?lead=${v.leadId}`} className="ad-gold" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        <Inbox size={13} />
        {STAGE_NAME[v.stage]}
      </Link>,
    ],
  ];

  return (
    <>
      <div className={s.panelHead}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span className="ad-kicker">
            {dayLabel(day)} · {clock(ms)}
          </span>
          <span className="ad-tag ad-vs" data-visit={v.status}>
            {VISIT_STATUS_NAME[v.status]}
          </span>
        </div>
        <div style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{v.name}</div>
        <div className="ad-muted" style={{ fontSize: 12.5 }}>
          {[v.mobile, v.email].filter(Boolean).join(" · ")}
        </div>
      </div>
      <dl className={s.facts}>
        {facts.map(([k, val]) => (
          <div key={k}>
            <dt className="ad-muted">{k}</dt>
            <dd>{val}</dd>
          </div>
        ))}
      </dl>
      <div className={s.panelBlock}>
        <div className="ad-field">
          <label htmlFor="vs-ag">Agent</label>
          <input
            key={`a${v.agent}`}
            id="vs-ag"
            className="ad-input"
            list="vs-agents"
            placeholder="Unassigned"
            defaultValue={v.agent}
            onBlur={(e) => e.target.value.trim() !== v.agent && act(v, { agent: e.target.value }, { agent: e.target.value.trim() })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <datalist id="vs-agents">
            {agents.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div className="ad-field" style={{ marginTop: 10 }}>
          <label htmlFor="vs-note">Note for the team</label>
          <textarea
            key={`n${v.note}`}
            id="vs-note"
            className="ad-input"
            style={{ minHeight: 60 }}
            defaultValue={v.note}
            placeholder="Parking, units to show, interpreter…"
            onBlur={(e) => e.target.value.trim() !== v.note && act(v, { note: e.target.value }, { note: e.target.value.trim() })}
          />
        </div>
      </div>
      <div className={s.panelBlock} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tel && (
          <a className="ad-btn ad-btn-secondary ad-btn-sm" href={`tel:${tel}`}>
            <Phone size={14} />
            Call
          </a>
        )}
        {wa.length >= 9 && (
          <a className="ad-btn ad-btn-secondary ad-btn-sm" href={`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={14} />
            WhatsApp confirmation
          </a>
        )}
      </div>

      {moving ? (
        <form
          className={s.panelBlock}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const date = String(f.get("date"));
            const t = String(f.get("time"));
            setMoving(false);
            act(v, { date, time: t }, { startsAt: new Date(Date.parse(`${date}T${t}:00+05:30`)).toISOString(), status: "rescheduled" });
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 8 }}>
            <div className="ad-field">
              <label htmlFor="vs-date">New date</label>
              <input id="vs-date" name="date" type="date" className="ad-input" defaultValue={day} required />
            </div>
            <div className="ad-field">
              <label htmlFor="vs-time">Time</label>
              <select id="vs-time" name="time" className="ad-input" defaultValue={time}>
                {times.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button className="ad-btn ad-btn-primary ad-btn-sm" disabled={pending}>
              Move visit
            </button>
            <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setMoving(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className={s.actions}>
          <button type="button" className="ad-btn ad-btn-primary" onClick={() => act(v, { status: "confirmed" }, { status: "confirmed" })} disabled={pending || v.status === "confirmed" || closed}>
            <Check size={15} />
            Confirm
          </button>
          <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setMoving(true)} disabled={pending || v.status === "completed"}>
            <CalendarClock size={15} />
            Reschedule
          </button>
          <button type="button" className="ad-btn ad-btn-secondary" onClick={() => act(v, { status: "completed" }, { status: "completed" })} disabled={pending || v.status === "completed" || v.status === "cancelled"}>
            <CircleCheck size={15} />
            Completed
          </button>
          <button
            type="button"
            className="ad-btn ad-btn-secondary"
            style={{ color: "var(--a-danger-text)" }}
            disabled={pending || v.status === "no-show" || v.status === "cancelled" || !past}
            title={past ? undefined : "Available once the visit time has passed"}
            onClick={async () => {
              if (await confirm({ danger: true, title: `Mark ${v.name} as a no-show?`, body: "A call-back reminder is set on the lead for tomorrow, 10:00 AM.", confirmLabel: "Mark no-show" }))
                act(v, { status: "no-show" }, { status: "no-show" });
            }}
          >
            <UserX size={15} />
            No-show
          </button>
          {v.status !== "cancelled" ? (
            <button
              type="button"
              className="ad-btn ad-btn-ghost ad-btn-sm"
              style={{ gridColumn: "1 / -1", color: "var(--a-danger-text)", justifySelf: "start" }}
              disabled={pending || v.status === "completed"}
              onClick={async () => {
                if (await confirm({ danger: true, title: `Cancel the visit with ${v.name}?`, body: "The slot is freed up. The lead stays as it is.", confirmLabel: "Cancel visit" }))
                  act(v, { status: "cancelled" }, { status: "cancelled" });
              }}
            >
              <CalendarX2 size={14} />
              Cancel visit
            </button>
          ) : (
            <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" style={{ gridColumn: "1 / -1", justifySelf: "start" }} onClick={() => act(v, { status: "pending" }, { status: "pending" })} disabled={pending}>
              Restore visit
            </button>
          )}
        </div>
      )}
    </>
  );
}
