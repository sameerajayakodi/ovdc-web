"use client";

import { useCallback, useEffect, useMemo, useOptimistic, useState, useTransition, type DragEvent } from "react";
import { AlarmClock, CalendarClock, Columns3, Copy, Download, Plus, Search, SearchX, Table2, X } from "lucide-react";
import { bulkUpdateLeads, updateLead } from "@/app/admin/crm-actions";
import { useAdminUi } from "../AdminRoot";
import { downloadCsv } from "@/lib/admin/format";
import { DOW, KIND_LABEL, KINDS, SALES_KINDS, SOURCES, STAGES, STAGE_NAME, addDays, at, clock, dayLabel, dowOf, initials, relDay, ymdOf } from "@/lib/admin/crm";
import type { LeadKind, LeadStage } from "@/lib/admin/crm";
import type { AdminLead, LeadDetail } from "@/lib/admin/types";
import { LeadDrawer } from "./LeadDrawer";
import { AddLeadDialog } from "./AddLeadDialog";
import s from "./leads.module.css";

type View = "board" | "table";
type FormFilter = "sales" | "all" | LeadKind;
const VIEW_KEY = "ovdc.admin.leads.view";

interface Props {
  leads: AdminLead[];
  agents: string[];
  projects: string[];
  initialStage?: LeadStage;
  initialDetail: LeadDetail | null;
  initialQuery: string;
  now: number;
}

const DAY = 86_400_000;

/** "Today", "Yesterday", "5d ago" in Colombo calendar days. */
function age(iso: string, now: number) {
  const d = Math.round((at(ymdOf(now)) - at(ymdOf(Date.parse(iso)))) / DAY);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
}

/** Next thing to do for a lead: a booked visit, else the follow-up reminder. */
export function nextStep(l: Pick<AdminLead, "nextVisit" | "followUpAt" | "stage">, now: number) {
  const today = ymdOf(now);
  /** Compact form for board cards: "Today 4:30 PM", "Thu 3:00 PM", "2 Nov" */
  const short = (ms: number) => {
    const day = ymdOf(ms);
    if (day === today) return `Today ${clock(ms)}`;
    if (day === addDays(today, 1)) return `Tomorrow ${clock(ms)}`;
    if (day > today && day < addDays(today, 7)) return `${DOW[dowOf(day)]} ${clock(ms)}`;
    return dayLabel(day).slice(4);
  };
  if (l.nextVisit) {
    const ms = Date.parse(l.nextVisit);
    const day = ymdOf(ms);
    const when = day === today ? `today ${clock(ms)}` : day === addDays(today, 1) ? `tomorrow ${clock(ms)}` : `${dayLabel(day)} ${clock(ms)}`;
    return { text: `Visit ${when}`, short: short(ms), tone: day === today ? "gold" : "muted", visit: true } as const;
  }
  if (l.followUpAt && l.stage !== "won" && l.stage !== "lost") {
    const r = relDay(l.followUpAt, now);
    return { ...r, short: r.tone === "danger" ? r.text : short(Date.parse(l.followUpAt)), visit: false };
  }
  return null;
}

const TONE = { danger: "var(--a-danger-text)", gold: "var(--a-gold-text)", muted: "var(--a-muted)" };

function responseTime(leads: AdminLead[], now: number) {
  const xs = leads
    .filter((l) => l.respondedAt && l.source === "Website" && Date.parse(l.createdAt) > now - 30 * DAY)
    .map((l) => Date.parse(l.respondedAt!) - Date.parse(l.createdAt))
    .filter((x) => x >= 0);
  if (!xs.length) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length / 60_000;
  return m < 60 ? `${Math.max(1, Math.round(m))} min` : m < 48 * 60 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} days`;
}

export function LeadsConsole({ leads, agents, projects, initialStage, initialDetail, initialQuery, now }: Props) {
  const { toast, confirm } = useAdminUi();
  const [view, setView] = useState<View>(initialStage ? "table" : "board");
  const [q, setQ] = useState(initialQuery);
  const [fProject, setFProject] = useState("all");
  const [fSource, setFSource] = useState("all");
  const [fAgent, setFAgent] = useState("all");
  const [fDays, setFDays] = useState("all");
  const [fForm, setFForm] = useState<FormFilter>("sales");
  const [fStage, setFStage] = useState<LeadStage | "all">(initialStage ?? "all");
  const [sel, setSel] = useState<number[]>([]);
  const [openId, setOpenId] = useState<number | null>(initialDetail?.lead.id ?? null);
  const [seed, setSeed] = useState<LeadDetail | null>(initialDetail);
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<LeadStage | null>(null);
  const [, start] = useTransition();
  const [list, patchList] = useOptimistic(leads, (cur: AdminLead[], p: { ids: number[]; patch: Partial<AdminLead> }) =>
    cur.map((l) => (p.ids.includes(l.id) ? { ...l, ...p.patch } : l)),
  );

  useEffect(() => {
    if (initialStage) return;
    try {
      const v = localStorage.getItem(VIEW_KEY);
      // Restore the view this device used last (not known during SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === "table" || v === "board") setView(v);
    } catch {}
  }, [initialStage]);

  function pickView(v: View) {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  }

  const projectOpts = useMemo(() => [...new Set([...projects, ...leads.map((l) => l.project).filter(Boolean)])], [projects, leads]);
  const sourceOpts = useMemo(() => [...new Set([...SOURCES, ...leads.map((l) => l.source)])], [leads]);
  const agentOpts = useMemo(() => [...new Set([...agents, ...leads.map((l) => l.agent).filter(Boolean)])].sort((a, b) => a.localeCompare(b)), [agents, leads]);

  const ql = q.trim().toLowerCase();
  const qd = ql.replace(/\D/g, "");
  const matches = (l: AdminLead) =>
    (fForm === "all" || (fForm === "sales" ? SALES_KINDS.includes(l.kind) : l.kind === fForm)) &&
    (fProject === "all" || l.project === fProject) &&
    (fSource === "all" || l.source === fSource) &&
    (fAgent === "all" || (fAgent === "" ? !l.agent : l.agent === fAgent)) &&
    (fDays === "all" || Date.parse(l.createdAt) >= now - Number(fDays) * DAY) &&
    (!ql || `${l.name} ${l.email}`.toLowerCase().includes(ql) || (qd.length >= 3 && l.mobile.replace(/\D/g, "").includes(qd)));
  const base = list.filter(matches);
  const visible = fStage === "all" ? base : base.filter((l) => l.stage === fStage);
  const filtered = !!ql || fProject !== "all" || fSource !== "all" || fAgent !== "all" || fDays !== "all" || fForm !== "sales" || fStage !== "all";
  const clear = () => {
    setQ("");
    setFProject("all");
    setFSource("all");
    setFAgent("all");
    setFDays("all");
    setFForm("sales");
    setFStage("all");
  };

  const sales = list.filter((l) => SALES_KINDS.includes(l.kind));
  const weekNew = sales.filter((l) => Date.parse(l.createdAt) >= now - 7 * DAY).length;
  const resp = responseTime(sales, now);
  const dupLeads = visible.filter((l) => l.dupes.length);
  const dupCount = Math.ceil(dupLeads.length / 2);

  const byId = new Map(list.map((l) => [l.id, l]));
  const selected = sel.filter((id) => byId.has(id));
  const allSel = visible.length > 0 && visible.every((l) => sel.includes(l.id));

  const openLead = useCallback((id: number, detail?: LeadDetail) => {
    if (detail) setSeed(detail);
    setOpenId(id);
    window.history.replaceState(null, "", `?lead=${id}`);
  }, []);
  const closeLead = useCallback(() => {
    setOpenId(null);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function moveStage(l: AdminLead, stage: LeadStage) {
    if (stage === l.stage) return;
    if (
      stage === "lost" &&
      !(await confirm({ danger: true, title: `Mark ${l.name || "this lead"} as lost?`, body: "Follow-up reminders are cleared. You can reopen the lead later.", confirmLabel: "Mark as lost" }))
    )
      return;
    start(async () => {
      patchList({ ids: [l.id], patch: { stage } });
      try {
        const res = await updateLead(l.id, { stage });
        toast(res.ok ? (res.message ?? "Saved") : res.error, res.ok ? "ok" : "err");
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  function bulk(patch: { stage?: LeadStage; agent?: string }) {
    const ids = selected;
    if (!ids.length) return;
    start(async () => {
      patchList({ ids, patch });
      try {
        const res = await bulkUpdateLeads(ids, patch);
        toast(res.ok ? (res.message ?? "Saved") : res.error, res.ok ? "ok" : "err");
        if (res.ok) setSel([]);
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  function exportCsv(rows: AdminLead[]) {
    downloadCsv(`ovdc-leads-${ymdOf(Date.now())}.csv`, [
      ["id", "created_at", "name", "mobile", "email", "project", "unit", "interest", "budget", "source", "form", "stage", "agent", "next_visit", "follow_up_at", "lost_reason", "message", "page"],
      ...rows.map((l) => [
        l.id,
        l.createdAt,
        l.name,
        l.mobile,
        l.email,
        l.project,
        l.unit,
        l.interest,
        l.budget,
        l.source,
        KIND_LABEL[l.kind],
        STAGE_NAME[l.stage],
        l.agent,
        l.nextVisit ?? "",
        l.followUpAt ?? "",
        l.lostReason,
        l.message,
        l.page,
      ]),
    ]);
    toast(`Exported ${rows.length} lead${rows.length === 1 ? "" : "s"} to CSV`);
  }

  function onDrop(e: DragEvent, stage: LeadStage) {
    e.preventDefault();
    const id = dragId ?? Number(e.dataTransfer.getData("text/plain"));
    setOverCol(null);
    setDragId(null);
    const l = byId.get(id);
    if (l) moveStage(l, stage);
  }

  const columns = fStage === "all" ? STAGES : STAGES.filter((x) => x.k === fStage);

  return (
    <div className={s.page}>
      <div className="ad-page-head">
        <div>
          <h1>Leads</h1>
          <div className="ad-sub">
            {sales.length} sales lead{sales.length === 1 ? "" : "s"} · {weekNew} new this week{resp ? ` · avg. first response ${resp}` : ""}
          </div>
        </div>
        <div className="ad-seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "board"} onClick={() => pickView("board")}>
            <Columns3 size={14} />
            Pipeline
          </button>
          <button type="button" aria-pressed={view === "table"} onClick={() => pickView("table")}>
            <Table2 size={14} />
            Table
          </button>
        </div>
        <button type="button" className="ad-btn ad-btn-secondary" onClick={() => exportCsv(visible)} disabled={!visible.length}>
          <Download size={16} />
          Export CSV
        </button>
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => setAdding(true)}>
          <Plus size={16} />
          Add lead
        </button>
      </div>

      <div className={s.filters}>
        <div className={`ad-search ${s.searchBox}`}>
          <Search size={16} />
          <input className="ad-input" aria-label="Search leads" placeholder="Name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="ad-input" aria-label="Project" style={{ width: 200 }} value={fProject} onChange={(e) => setFProject(e.target.value)}>
          <option value="all">All projects</option>
          {projectOpts.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select className="ad-input" aria-label="Source" style={{ width: 160 }} value={fSource} onChange={(e) => setFSource(e.target.value)}>
          <option value="all">All sources</option>
          {sourceOpts.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select className="ad-input" aria-label="Agent" style={{ width: 180 }} value={fAgent} onChange={(e) => setFAgent(e.target.value)}>
          <option value="all">All agents</option>
          <option value="">Unassigned</option>
          {agentOpts.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select className="ad-input" aria-label="Date" style={{ width: 150 }} value={fDays} onChange={(e) => setFDays(e.target.value)}>
          <option value="all">Any date</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <select className="ad-input" aria-label="Form" style={{ width: 180 }} value={fForm} onChange={(e) => setFForm(e.target.value as FormFilter)}>
          <option value="sales">Sales enquiries</option>
          <option value="all">All forms</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        {view === "table" && (
          <select className="ad-input" aria-label="Stage" style={{ width: 150 }} value={fStage} onChange={(e) => setFStage(e.target.value as LeadStage | "all")}>
            <option value="all">All stages</option>
            {STAGES.map((x) => (
              <option key={x.k} value={x.k}>
                {x.label}
              </option>
            ))}
          </select>
        )}
        {filtered && (
          <button type="button" className="ad-btn ad-btn-ghost" onClick={clear}>
            <X size={14} />
            Clear
          </button>
        )}
        <div style={{ flex: 1 }} />
        {dupCount > 0 && (
          <button type="button" className="ad-btn ad-btn-ghost" style={{ color: "var(--a-warn-text)" }} onClick={() => openLead(dupLeads[0].id)}>
            <Copy size={15} />
            {dupCount} possible duplicate{dupCount === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {view === "board" ? (
        <div className={s.board} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(${columns.length === 1 ? 320 : 220}px, 1fr))` }}>
          {columns.map((c) => {
            const cards = visible.filter((l) => l.stage === c.k);
            return (
              <section
                key={c.k}
                className={s.col}
                data-stage={c.k}
                data-over={overCol === c.k || undefined}
                aria-label={`${c.label}, ${cards.length} leads`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overCol !== c.k) setOverCol(c.k);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverCol(null);
                }}
                onDrop={(e) => onDrop(e, c.k)}
              >
                <div className={s.colHead}>
                  <strong>{c.label}</strong>
                  <span className="ad-muted">{cards.length}</span>
                </div>
                <div className={s.cards}>
                  {cards.map((l) => {
                    const step = nextStep(l, now);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        draggable
                        className={s.card}
                        data-open={openId === l.id || undefined}
                        data-dragging={dragId === l.id || undefined}
                        aria-label={`Open lead ${l.name || l.email || l.mobile}`}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(l.id));
                          setDragId(l.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverCol(null);
                        }}
                        onClick={() => openLead(l.id)}
                      >
                        <span className={s.cardTop}>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span className={s.cardName}>{l.name || l.email || l.mobile || `Lead #${l.id}`}</span>
                            <span className={s.cardSub}>{interestOf(l)}</span>
                          </span>
                          {l.dupes.length > 0 && (
                            <span title="Possible duplicate" style={{ color: "var(--a-warn-text)", display: "flex" }}>
                              <Copy size={13} />
                            </span>
                          )}
                        </span>
                        <span className={s.cardMeta}>
                          <span className="ad-tag ad-tag-neutral" style={{ padding: "1px 6px" }}>
                            {l.source}
                          </span>
                          {l.kind !== "enquiry" && <span className="ad-muted">{KIND_LABEL[l.kind]}</span>}
                          {l.budget && <span className="ad-muted">{l.budget}</span>}
                        </span>
                        <span className={s.cardFoot}>
                          <span className={s.ini} title={l.agent || "Unassigned"}>
                            {l.agent ? initials(l.agent) : "–"}
                          </span>
                          <span className={s.age}>{age(l.createdAt, now)}</span>
                          {step && (
                            <span className={s.step} style={{ color: TONE[step.tone] }} title={step.text}>
                              {step.visit ? <CalendarClock size={12} /> : <AlarmClock size={12} />}
                              {step.short}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                  {!cards.length && <p className={s.colEmpty}>{overCol === c.k ? "Drop here" : "No leads"}</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : visible.length ? (
        <div className={s.tableWrap}>
          <table className="ad-table" style={{ fontSize: 13, minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSel}
                    onChange={() => setSel(allSel ? [] : visible.map((l) => l.id))}
                    style={{ margin: 0 }}
                  />
                </th>
                <th>Lead</th>
                <th>Phone</th>
                <th>Interest</th>
                <th>Source</th>
                <th>Budget</th>
                <th>Stage</th>
                <th>Agent</th>
                <th>Next step</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => {
                const step = nextStep(l, now);
                const on = sel.includes(l.id);
                return (
                  <tr key={l.id} onClick={() => openLead(l.id)} style={{ cursor: "pointer" }} data-selected={on || undefined}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${l.name}`}
                        checked={on}
                        onChange={() => setSel((cur) => (cur.includes(l.id) ? cur.filter((x) => x !== l.id) : [...cur, l.id]))}
                        style={{ margin: 0 }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, display: "flex", gap: 6, alignItems: "center" }}>
                        {l.name || "—"}
                        {l.dupes.length > 0 && (
                          <span className="ad-tag ad-tag-warn" style={{ padding: "0 5px" }}>
                            Duplicate?
                          </span>
                        )}
                      </div>
                      <div className="ad-muted" style={{ fontSize: 11.5 }}>
                        {l.email}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{l.mobile || "—"}</td>
                    <td>{interestOf(l)}</td>
                    <td>
                      {l.source}
                      {l.kind !== "enquiry" && (
                        <div className="ad-muted" style={{ fontSize: 11.5 }}>
                          {KIND_LABEL[l.kind]}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{l.budget || "—"}</td>
                    <td>
                      <span className="ad-tag ad-stage" data-stage={l.stage}>
                        {STAGE_NAME[l.stage]}
                      </span>
                    </td>
                    <td>{l.agent || <span className="ad-muted">Unassigned</span>}</td>
                    <td style={{ color: step ? TONE[step.tone] : undefined, whiteSpace: "nowrap" }}>{step?.text ?? "—"}</td>
                    <td className="ad-muted" style={{ whiteSpace: "nowrap" }}>
                      {age(l.createdAt, now)}
                      <div style={{ fontSize: 11.5 }}>{clock(Date.parse(l.createdAt))}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {selected.length > 0 && (
            <div className={s.bulk} role="region" aria-label="Bulk actions">
              <strong style={{ fontSize: 13 }}>{selected.length} selected</strong>
              <div style={{ flex: 1 }} />
              <select className="ad-input" aria-label="Move selected to stage" value="" onChange={(e) => e.target.value && bulk({ stage: e.target.value as LeadStage })} style={{ width: 170 }}>
                <option value="">Move to stage…</option>
                {STAGES.map((x) => (
                  <option key={x.k} value={x.k}>
                    {x.label}
                  </option>
                ))}
              </select>
              <select className="ad-input" aria-label="Assign selected" value="" onChange={(e) => e.target.value && bulk({ agent: e.target.value === "-" ? "" : e.target.value })} style={{ width: 200 }}>
                <option value="">Assign to agent…</option>
                {agentOpts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
                <option value="-">Unassigned</option>
              </select>
              <button type="button" className="ad-btn ad-btn-secondary" onClick={() => exportCsv(selected.map((id) => byId.get(id)!))}>
                Export selected
              </button>
              <button type="button" className="ad-btn ad-btn-icon" aria-label="Clear selection" onClick={() => setSel([])} style={{ color: "inherit" }}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="ad-empty">
          <div className="ad-empty-icon">
            <SearchX size={20} />
          </div>
          <h4>{filtered ? "No leads match these filters" : "No leads yet"}</h4>
          <p className="ad-muted" style={{ margin: 0 }}>
            {filtered ? "Try a different search or clear the filters." : "Website enquiries, brochure downloads and visit requests appear here as they arrive."}
          </p>
          {filtered && (
            <button type="button" className="ad-btn ad-btn-secondary" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {openId != null && (
        <LeadDrawer
          key={openId}
          id={openId}
          summary={byId.get(openId) ?? null}
          initial={seed?.lead.id === openId ? seed : null}
          agents={agentOpts}
          projects={projectOpts}
          now={now}
          onClose={closeLead}
          onOpen={openLead}
        />
      )}
      {adding && (
        <AddLeadDialog
          agents={agentOpts}
          projects={projectOpts}
          onClose={() => setAdding(false)}
          onCreated={(id) => {
            setAdding(false);
            openLead(id);
          }}
        />
      )}
    </div>
  );
}

export function interestOf(l: Pick<AdminLead, "project" | "interest" | "unit" | "kind">) {
  const parts = [l.project && l.project !== "Not sure yet" ? l.project : "", l.unit ? `Unit ${l.unit}` : l.interest].filter(Boolean);
  return parts.join(" · ") || KIND_LABEL[l.kind];
}
