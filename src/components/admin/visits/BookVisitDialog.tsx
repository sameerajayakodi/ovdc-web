"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CircleAlert } from "lucide-react";
import { createVisit, type NewVisit } from "@/app/admin/crm-actions";
import { useAdminUi } from "../AdminRoot";
import { STAGE_NAME, VISIT_TIMES, VISIT_TYPES, visitLocation, type LeadStage, type VisitType } from "@/lib/admin/crm";

export interface LeadOption {
  id: number;
  name: string;
  mobile: string;
  project: string;
  stage: LeadStage;
}

interface Props {
  initial: { date: string; time: string; leadId?: number };
  leads: LeadOption[];
  agents: string[];
  projects: string[];
  locations: string[];
  today: string;
  onClose: () => void;
  onBooked: (id: number, date: string) => void;
}

export function BookVisitDialog({ initial, leads, agents, projects, locations, today, onClose, onBooked }: Props) {
  const { toast, confirm } = useAdminUi();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<Record<string, string>>({});
  const preset = leads.find((l) => l.id === initial.leadId);
  const [mode, setMode] = useState<"lead" | "new">(preset || leads.length ? "lead" : "new");
  const [leadId, setLeadId] = useState<number | "">(preset?.id ?? "");
  const [find, setFind] = useState("");
  const [project, setProject] = useState(preset?.project && projects.includes(preset.project) ? preset.project : "");
  const [type, setType] = useState<VisitType>("site");
  const [location, setLocation] = useState(() => visitLocation("site", preset?.project ?? ""));
  const [locTouched, setLocTouched] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector('[role="alertdialog"]') && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const options = useMemo(() => {
    const q = find.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const hit = leads.filter((l) => !q || l.name.toLowerCase().includes(q) || (digits.length >= 3 && l.mobile.replace(/\D/g, "").includes(digits)));
    // Keep the chosen lead visible even when the search no longer matches it.
    const chosen = leads.find((l) => l.id === leadId);
    return chosen && !hit.includes(chosen) ? [chosen, ...hit.slice(0, 199)] : hit.slice(0, 200);
  }, [find, leads, leadId]);

  function chooseLead(id: number | "") {
    setLeadId(id);
    const l = leads.find((x) => x.id === id);
    if (l && !project && projects.includes(l.project)) {
      setProject(l.project);
      if (!locTouched) setLocation(visitLocation(type, l.project));
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input: NewVisit = {
      ...(mode === "lead" ? { leadId: Number(leadId) || undefined } : { name: String(f.get("name") ?? ""), mobile: String(f.get("mobile") ?? "") }),
      project,
      type,
      location,
      date: String(f.get("date") ?? ""),
      time: String(f.get("time") ?? ""),
      party: Number(f.get("party") ?? 2),
      agent: String(f.get("agent") ?? ""),
      note: String(f.get("note") ?? ""),
    };
    if (mode === "lead" && !input.leadId) {
      setErr({ lead: "Choose a lead, or switch to “New visitor”." });
      return;
    }
    const send = (force: boolean) =>
      start(async () => {
        try {
          const r = await createVisit(input, force);
          if (!r.ok) {
            if (r.fields?.capacity) {
              if (await confirm({ title: "This slot is full", body: `${r.error} Book it anyway?`, confirmLabel: "Book anyway" })) send(true);
              return;
            }
            setErr(r.fields ?? {});
            return toast(r.error, "err");
          }
          toast(r.message ?? "Visit booked");
          onBooked(r.data!.id, r.data!.date);
        } catch {
          toast("Could not save. Check your connection and try again.", "err");
        }
      });
    send(false);
  }

  const error = (k: string) =>
    err[k] ? (
      <span className="ad-error">
        <CircleAlert size={13} />
        {err[k]}
      </span>
    ) : null;

  return (
    <div className="ad-backdrop" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="bv-title" className="ad-dialog ad-dialog-wide" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="ad-dialog-body" style={{ gap: 12 }}>
          <h4 id="bv-title">Book a site visit</h4>
          <div className="ad-seg" role="group" aria-label="Visitor" style={{ alignSelf: "flex-start" }}>
            <button type="button" aria-pressed={mode === "lead"} onClick={() => setMode("lead")} disabled={!leads.length}>
              Existing lead
            </button>
            <button type="button" aria-pressed={mode === "new"} onClick={() => setMode("new")}>
              New visitor
            </button>
          </div>

          {mode === "lead" ? (
            <div className="ad-field">
              <label htmlFor="bv-find">Lead</label>
              <input ref={firstRef} id="bv-find" className="ad-input" placeholder="Search by name or phone" value={find} onChange={(e) => setFind(e.target.value)} />
              <select
                className="ad-input"
                aria-label="Choose lead"
                size={6}
                style={{ marginTop: 4, height: "auto", backgroundImage: "none", padding: 2, fontSize: 13 }}
                value={leadId}
                onChange={(e) => chooseLead(e.target.value ? Number(e.target.value) : "")}
                aria-invalid={!!err.lead || undefined}
              >
                {options.map((l) => (
                  <option key={l.id} value={l.id} style={{ padding: "5px 8px" }} title={l.project || undefined}>
                    {l.name || "(no name)"} · {l.mobile || "no phone"} · {STAGE_NAME[l.stage]}
                  </option>
                ))}
              </select>
              {!options.length && <span className="ad-help">No open leads match. Switch to “New visitor” to add one.</span>}
              {error("lead")}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div className="ad-field">
                <label htmlFor="bv-name">Visitor name</label>
                <input ref={firstRef} id="bv-name" name="name" className="ad-input" aria-invalid={!!err.name || undefined} />
                {error("name")}
              </div>
              <div className="ad-field">
                <label htmlFor="bv-mob">Mobile</label>
                <input id="bv-mob" name="mobile" type="tel" className="ad-input" placeholder="+94 7X XXX XXXX" aria-invalid={!!err.mobile || undefined} />
                {error("mobile")}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div className="ad-field">
              <label htmlFor="bv-proj">Project</label>
              <select
                id="bv-proj"
                className="ad-input"
                value={project}
                onChange={(e) => {
                  setProject(e.target.value);
                  if (!locTouched) setLocation(visitLocation(type, e.target.value));
                }}
              >
                <option value="">Not sure yet</option>
                {projects.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="ad-field">
              <label htmlFor="bv-type">Visit</label>
              <select
                id="bv-type"
                className="ad-input"
                value={type}
                onChange={(e) => {
                  const t = e.target.value as VisitType;
                  setType(t);
                  if (!locTouched) setLocation(visitLocation(t, project));
                }}
              >
                {VISIT_TYPES.map((t) => (
                  <option key={t.k} value={t.k}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="bv-loc">Where</label>
              <input
                id="bv-loc"
                className="ad-input"
                list="bv-locs"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setLocTouched(true);
                }}
              />
              <datalist id="bv-locs">
                {locations.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div className="ad-field">
              <label htmlFor="bv-date">Date</label>
              <input id="bv-date" name="date" type="date" className="ad-input" min={today} defaultValue={initial.date} aria-invalid={!!err.date || undefined} required />
              {error("date")}
            </div>
            <div className="ad-field">
              <label htmlFor="bv-time">Time</label>
              <select id="bv-time" name="time" className="ad-input" defaultValue={VISIT_TIMES.includes(initial.time) ? initial.time : "10:00"}>
                {VISIT_TIMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              {error("time")}
            </div>
            <div className="ad-field">
              <label htmlFor="bv-party">People</label>
              <input id="bv-party" name="party" type="number" min={1} max={30} defaultValue={2} className="ad-input" aria-invalid={!!err.party || undefined} />
              {error("party")}
            </div>
            <div className="ad-field">
              <label htmlFor="bv-agent">Agent</label>
              <input id="bv-agent" name="agent" className="ad-input" list="bv-agents" placeholder="Unassigned" />
              <datalist id="bv-agents">
                {agents.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="ad-field">
            <label htmlFor="bv-note">Note</label>
            <textarea id="bv-note" name="note" className="ad-input" style={{ minHeight: 60 }} placeholder="Units to show, parking, interpreter…" />
          </div>
        </div>
        <div className="ad-dialog-actions">
          <button type="button" className="ad-btn ad-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="ad-btn ad-btn-primary" disabled={pending}>
            {pending ? "Booking…" : "Book visit"}
          </button>
        </div>
      </form>
    </div>
  );
}
