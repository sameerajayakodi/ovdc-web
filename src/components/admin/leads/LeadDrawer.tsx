"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  AlarmClock,
  ArrowRightLeft,
  CalendarPlus,
  KeyRound,
  Copy,
  GitMerge,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Sparkles,
  StickyNote,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { addLeadNote, deleteLead, loadLead, logContact, mergeLeads, updateLead, type LeadPatch } from "@/app/admin/crm-actions";
import { useAdminUi } from "../AdminRoot";
import { dateTime } from "@/lib/admin/format";
import {
  KIND_LABEL,
  STAGES,
  STAGE_NAME,
  VISIT_STATUS_NAME,
  VISIT_TYPES,
  addDays,
  at,
  clock,
  dayLabel,
  fromLocalInput,
  initials,
  toLocalInput,
  waNumber,
  ymdOf,
  type LeadStage,
} from "@/lib/admin/crm";
import type { ActionResult, AdminLead, LeadDetail, LeadEvent } from "@/lib/admin/types";
import { interestOf, nextStep } from "./LeadsConsole";
import s from "./leads.module.css";

interface Props {
  id: number;
  /** The row from the list, shown while the full record loads */
  summary: AdminLead | null;
  initial: LeadDetail | null;
  agents: string[];
  projects: string[];
  now: number;
  onClose: () => void;
  onOpen: (id: number, detail?: LeadDetail) => void;
}

const EVENT: Record<LeadEvent["type"], { icon: LucideIcon; tone: string; title: string }> = {
  created: { icon: Sparkles, tone: "navy", title: "Lead created" },
  note: { icon: StickyNote, tone: "surface", title: "Note" },
  stage: { icon: ArrowRightLeft, tone: "gold", title: "Stage" },
  assign: { icon: UserRound, tone: "neutral", title: "Assigned" },
  call: { icon: Phone, tone: "neutral", title: "Call" },
  whatsapp: { icon: MessageCircle, tone: "ok", title: "WhatsApp" },
  email: { icon: Mail, tone: "neutral", title: "Email" },
  visit: { icon: MapPin, tone: "gold", title: "Site visit" },
  "follow-up": { icon: AlarmClock, tone: "neutral", title: "Follow-up" },
  edit: { icon: Pencil, tone: "surface", title: "Edited" },
  merge: { icon: GitMerge, tone: "warn", title: "Merged" },
};

export function LeadDrawer({ id, summary, initial, agents, projects, now, onClose, onOpen }: Props) {
  const { toast, confirm } = useAdminUi();
  const [detail, setDetail] = useState<LeadDetail | null>(initial);
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // Load the full record, and reload when someone else (a bulk edit, the board) changed it.
  const stale = !detail || (summary != null && summary.updatedAt !== detail.lead.updatedAt);
  useEffect(() => {
    if (!stale) return;
    let live = true;
    loadLead(id)
      .then((r) => {
        if (!live) return;
        if (r.ok) setDetail(r.data!);
        else {
          toast(r.error, "err");
          onClose();
        }
      })
      .catch(() => live && toast("Could not load this lead.", "err"));
    return () => {
      live = false;
    };
  }, [id, stale, summary?.updatedAt, toast, onClose]);

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".ad-backdrop")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function run(task: () => Promise<ActionResult<LeadDetail>>, after?: (d: LeadDetail) => void) {
    start(async () => {
      try {
        const r = await task();
        if (!r.ok) return toast(r.error, "err");
        if (r.data) {
          setDetail(r.data);
          after?.(r.data);
        }
        if (r.message) toast(r.message);
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }
  const patch = (p: LeadPatch) => run(() => updateLead(id, p));

  const lead = detail?.lead ?? summary;
  if (!lead)
    return (
      <Frame onClose={onClose} label="Lead">
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="ad-skel" style={{ height: 44, width: 260 }} />
          <div className="ad-skel" style={{ height: 120 }} />
        </div>
      </Frame>
    );

  const tel = lead.mobile.replace(/[^\d+]/g, "");
  const wa = waNumber(lead.mobile);
  const step = nextStep(lead, now);
  const dupe = detail?.dupes[0];
  const title = lead.name || lead.email || lead.mobile || `Lead #${lead.id}`;

  async function setStage(stage: LeadStage) {
    if (stage === "lost" && !(await confirm({ danger: true, title: `Mark ${title} as lost?`, body: "Follow-up reminders are cleared. You can reopen the lead later.", confirmLabel: "Mark as lost" })))
      return;
    patch({ stage });
  }

  async function merge() {
    if (!dupe) return;
    const keepOther = Date.parse(dupe.createdAt) < Date.parse(lead!.createdAt);
    const ok = await confirm({
      title: `Merge ${dupe.name || `#${dupe.id}`} and ${title}?`,
      body: `The older record (${keepOther ? dupe.name || `#${dupe.id}` : title}) is kept. Timelines, notes and visits from both are combined, and empty details are filled in from the other record.`,
      confirmLabel: "Merge leads",
    });
    if (ok) run(() => mergeLeads(id, dupe.id), (d) => d.lead.id !== id && onOpen(d.lead.id, d));
  }

  async function remove() {
    const ok = await confirm({
      danger: true,
      title: `Delete ${title}?`,
      body: "Use this for spam and test entries. The lead, its notes and its visits are removed for good. Leads you lost to a competitor should be marked “Lost” instead.",
      confirmLabel: "Delete lead",
    });
    if (!ok) return;
    start(async () => {
      const r = await deleteLead(id);
      toast(r.ok ? (r.message ?? "Deleted") : r.error, r.ok ? "ok" : "err");
      if (r.ok) onClose();
    });
  }

  const followPresets: [string, number][] = [
    ["Tomorrow 10:00", at(addDays(ymdOf(now), 1), "10:00")],
    ["In 3 days", at(addDays(ymdOf(now), 3), "10:00")],
    ["Next week", at(addDays(ymdOf(now), 7), "10:00")],
  ];

  return (
    <Frame onClose={onClose} label={`Lead ${title}`} busy={pending}>
      <div className={s.dHead}>
        <div className={s.avatar}>{initials(title)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>{title}</div>
          <div className="ad-muted" style={{ fontSize: 12.5 }}>
            {[lead.mobile, lead.email].filter(Boolean).join(" · ")}
          </div>
          <div className="ad-muted" style={{ fontSize: 12.5 }}>
            {interestOf(lead)} · {lead.source} · created {dayLabel(ymdOf(Date.parse(lead.createdAt)))}, {clock(Date.parse(lead.createdAt))}
          </div>
        </div>
        <span className="ad-tag ad-stage" data-stage={lead.stage}>
          {STAGE_NAME[lead.stage]}
        </span>
        <button ref={closeBtn} type="button" className="ad-btn ad-btn-icon" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className={s.dBody}>
        {dupe && (
          <div className={s.dupe}>
            <Copy size={16} />
            <div style={{ flex: 1 }}>
              <strong>Possible duplicate:</strong> {dupe.name || `Lead #${dupe.id}`} ({dupe.source}, {dayLabel(ymdOf(Date.parse(dupe.createdAt)))}) has the same phone number or email.
              {detail!.dupes.length > 1 && ` ${detail!.dupes.length - 1} more match.`}
            </div>
            <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => onOpen(dupe.id)}>
              Open
            </button>
            <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={merge} disabled={pending}>
              Merge
            </button>
          </div>
        )}

        <div className={s.dActions}>
          {tel ? (
            <a className="ad-btn ad-btn-primary" href={`tel:${tel}`} onClick={() => run(() => logContact(id, "call"))}>
              <Phone size={16} />
              Call
            </a>
          ) : (
            <button type="button" className="ad-btn ad-btn-primary" disabled>
              <Phone size={16} />
              Call
            </button>
          )}
          {wa.length >= 9 ? (
            <a
              className="ad-btn ad-btn-secondary"
              href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello ${lead.name.split(" ")[0] || ""}, this is OVDC about your enquiry${lead.project ? ` for ${lead.project}` : ""}.`)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => run(() => logContact(id, "whatsapp"))}
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
          ) : null}
          {lead.email ? (
            <a className="ad-btn ad-btn-secondary" href={`mailto:${lead.email}?subject=${encodeURIComponent(`Your enquiry${lead.project ? ` · ${lead.project}` : ""}`)}`} onClick={() => run(() => logContact(id, "email"))}>
              <Mail size={16} />
              Email
            </a>
          ) : null}
          <Link className="ad-btn ad-btn-secondary" href={`/admin/visits?book=${id}`}>
            <CalendarPlus size={16} />
            Book visit
          </Link>
          {lead.stage !== "won" && lead.stage !== "lost" && lead.name.trim() && (
            <Link className="ad-btn ad-btn-secondary" href={`/admin/sales?lead=${id}`}>
              <KeyRound size={16} />
              Reserve unit
            </Link>
          )}
        </div>

        <div className={s.dGrid}>
          <div className="ad-field">
            <label htmlFor="ld-stage">Stage</label>
            <select id="ld-stage" className="ad-input" value={lead.stage} onChange={(e) => setStage(e.target.value as LeadStage)} disabled={pending}>
              {STAGES.map((x) => (
                <option key={x.k} value={x.k}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
          <div className="ad-field">
            <label htmlFor="ld-agent">Assigned agent</label>
            <input
              key={`a${lead.agent}`}
              id="ld-agent"
              className="ad-input"
              list="ld-agents"
              placeholder="Unassigned"
              defaultValue={lead.agent}
              onBlur={(e) => e.target.value.trim() !== lead.agent && patch({ agent: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
            <datalist id="ld-agents">
              {agents.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
          <div className="ad-field">
            <label htmlFor="ld-fu">
              Follow-up reminder
              {lead.followUpAt && (
                <button type="button" className={s.linkBtn} onClick={() => patch({ followUpAt: null })}>
                  Clear
                </button>
              )}
            </label>
            <input
              key={`f${lead.followUpAt}`}
              id="ld-fu"
              className="ad-input"
              type="datetime-local"
              defaultValue={toLocalInput(lead.followUpAt)}
              onBlur={(e) => {
                const ms = fromLocalInput(e.target.value);
                if (Number.isFinite(ms) && ms !== (lead.followUpAt ? Date.parse(lead.followUpAt) : null)) patch({ followUpAt: new Date(ms).toISOString() });
              }}
            />
            <div className={s.presets}>
              {followPresets.map(([label, ms]) => (
                <button key={label} type="button" className={s.preset} onClick={() => patch({ followUpAt: new Date(ms).toISOString() })} disabled={pending}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="ad-field">
            <label htmlFor="ld-bud">Budget</label>
            <input
              key={`b${lead.budget}`}
              id="ld-bud"
              className="ad-input"
              placeholder="e.g. LKR 60–70 Mn"
              defaultValue={lead.budget}
              onBlur={(e) => e.target.value.trim() !== lead.budget && patch({ budget: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </div>
          {lead.stage === "lost" && (
            <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="ld-lost">Why was it lost?</label>
              <input
                key={`l${lead.lostReason}`}
                id="ld-lost"
                className="ad-input"
                placeholder="e.g. Budget below range, bought elsewhere"
                defaultValue={lead.lostReason}
                onBlur={(e) => e.target.value.trim() !== lead.lostReason && patch({ lostReason: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
            </div>
          )}
          {step && (
            <div className={s.stepNote} style={{ gridColumn: "1 / -1" }} data-tone={step.tone}>
              {step.visit ? <CalendarPlus size={14} /> : <AlarmClock size={14} />}
              Next: {step.text}
            </div>
          )}
        </div>

        <section className={s.dSection}>
          <div className={s.dSectionHead}>
            <strong>Enquiry</strong>
            <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setEditing((v) => !v)}>
              <Pencil size={13} />
              {editing ? "Cancel" : "Edit details"}
            </button>
          </div>
          {editing ? (
            <form
              className={s.editGrid}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const g = (k: string) => String(f.get(k) ?? "");
                run(() => updateLead(id, { name: g("name"), mobile: g("mobile"), email: g("email"), project: g("project"), interest: g("interest") }), () => setEditing(false));
              }}
            >
              <Field id="le-name" label="Name" name="name" value={lead.name} />
              <Field id="le-mob" label="Mobile" name="mobile" value={lead.mobile} type="tel" />
              <Field id="le-email" label="Email" name="email" value={lead.email} type="email" />
              <div className="ad-field">
                <label htmlFor="le-proj">Project</label>
                <input id="le-proj" name="project" className="ad-input" list="le-projects" defaultValue={lead.project} />
                <datalist id="le-projects">
                  {projects.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <Field id="le-int" label="Interest" name="interest" value={lead.interest} placeholder="e.g. 3 Bed, sea view" />
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="ad-btn ad-btn-primary" disabled={pending}>
                  Save details
                </button>
              </div>
            </form>
          ) : (
            <dl className={s.facts}>
              <Fact k="Form">{KIND_LABEL[lead.kind]}</Fact>
              {lead.project && <Fact k="Project">{lead.project}</Fact>}
              {lead.unit && <Fact k="Unit">{lead.unit}</Fact>}
              {lead.interest && <Fact k="Interest">{lead.interest}</Fact>}
              {(lead.visitDate || lead.visitSlot) && (
                <Fact k="Requested visit">
                  {[lead.visitDate ? dayLabel(lead.visitDate) : "", lead.visitSlot, VISIT_TYPES.find((t) => t.k === lead.visitType)?.label ?? lead.visitType].filter(Boolean).join(" · ")}
                </Fact>
              )}
              {lead.url && (
                <Fact k="Link">
                  <a href={/^https?:\/\//.test(lead.url) ? lead.url : `https://${lead.url}`} target="_blank" rel="noreferrer noopener">
                    {lead.url}
                  </a>
                </Fact>
              )}
              {lead.page && <Fact k="Sent from">{lead.page === "admin" ? "Admin console" : lead.page}</Fact>}
              {lead.respondedAt && <Fact k="First response">{dateTime(lead.respondedAt)}</Fact>}
              {lead.message && (
                <div className={s.message}>
                  <span className="ad-kicker">Message</span>
                  <p>{lead.message}</p>
                </div>
              )}
            </dl>
          )}
        </section>

        {detail && detail.visits.length > 0 && (
          <section className={s.dSection}>
            <div className={s.dSectionHead}>
              <strong>Site visits</strong>
              <span className="ad-muted" style={{ fontSize: 12 }}>
                {detail.visits.length}
              </span>
            </div>
            {detail.visits.map((v) => {
              const ms = Date.parse(v.startsAt);
              return (
                <Link key={v.id} href={`/admin/visits?d=${ymdOf(ms)}&visit=${v.id}`} className={s.visitRow}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>
                      {dayLabel(ymdOf(ms))} · {clock(ms)}
                    </strong>
                    <span className="ad-muted" style={{ display: "block", fontSize: 12 }}>
                      {v.location}
                      {v.agent ? ` · ${v.agent}` : ""}
                    </span>
                  </span>
                  <span className="ad-tag ad-vs" data-visit={v.status}>
                    {VISIT_STATUS_NAME[v.status]}
                  </span>
                </Link>
              );
            })}
          </section>
        )}

        <section className={s.dSection} style={{ borderBottom: 0 }}>
          <div className={s.dSectionHead}>
            <strong>Activity</strong>
          </div>
          <form
            className={s.noteForm}
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              run(() => addLeadNote(id, note), () => setNote(""));
            }}
          >
            <input className="ad-input" aria-label="Add a note" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
            <button className="ad-btn ad-btn-secondary" disabled={pending || !note.trim()}>
              Add note
            </button>
          </form>
          {detail ? (
            <ol className={s.timeline}>
              {detail.events.map((ev) => {
                const m = EVENT[ev.type] ?? EVENT.note;
                const Icon = m.icon;
                return (
                  <li key={ev.id}>
                    <span className={s.tlIcon} data-tone={m.tone}>
                      <Icon size={13} />
                    </span>
                    <div style={{ fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                      <strong>{m.title}</strong> {ev.text}
                    </div>
                    <div className="ad-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                      <time dateTime={ev.at}>{dateTime(ev.at)}</time> · {ev.actor}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="ad-skel" style={{ height: 80 }} />
          )}
        </section>
      </div>

      <div className={s.dFoot}>
        <span className="ad-muted" style={{ fontSize: 12 }}>
          Lead #{lead.id} · updated {dateTime(lead.updatedAt)}
        </span>
        <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" style={{ color: "var(--a-danger-text)" }} onClick={remove} disabled={pending}>
          <Trash2 size={14} />
          Delete lead
        </button>
      </div>
    </Frame>
  );
}

function Frame({ children, onClose, label, busy }: { children: ReactNode; onClose: () => void; label: string; busy?: boolean }) {
  return (
    <>
      <div className="ad-drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="ad-drawer" role="dialog" aria-modal="true" aria-label={label} aria-busy={busy || undefined}>
        {children}
        {busy && (
          <span className={s.busy} aria-hidden="true">
            <LoaderCircle size={16} className="ad-spin" />
          </span>
        )}
      </aside>
    </>
  );
}

function Fact({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className={s.fact}>
      <dt className="ad-muted">{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Field({ id, label, name, value, type = "text", placeholder }: { id: string; label: string; name: string; value: string; type?: string; placeholder?: string }) {
  return (
    <div className="ad-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} className="ad-input" defaultValue={value} placeholder={placeholder} />
    </div>
  );
}
