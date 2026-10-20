"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CircleAlert } from "lucide-react";
import { createLead } from "@/app/admin/crm-actions";
import { useAdminUi } from "../AdminRoot";
import { SOURCES } from "@/lib/admin/crm";

interface Props {
  agents: string[];
  projects: string[];
  onClose: () => void;
  onCreated: (id: number) => void;
}

/** Walk-ins, phone calls and referrals that did not come through the website. */
export function AddLeadDialog({ agents, projects, onClose, onCreated }: Props) {
  const { toast } = useAdminUi();
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "");
    start(async () => {
      try {
        const r = await createLead({
          name: g("name"),
          mobile: g("mobile"),
          email: g("email"),
          project: g("project"),
          interest: g("interest"),
          budget: g("budget"),
          source: g("source"),
          agent: g("agent"),
          note: g("note"),
        });
        if (!r.ok) {
          setErr(r.fields ?? {});
          return toast(r.error, "err");
        }
        toast(r.message ?? "Lead added");
        onCreated(r.data!.id);
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  const field = (id: string, label: string, name: string, extra: React.ComponentProps<"input"> = {}) => (
    <div className="ad-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} className="ad-input" aria-invalid={!!err[name] || undefined} aria-describedby={err[name] ? `${id}-err` : undefined} {...extra} />
      {err[name] && (
        <span className="ad-error" id={`${id}-err`}>
          <CircleAlert size={13} />
          {err[name]}
        </span>
      )}
    </div>
  );

  return (
    <div className="ad-backdrop" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="al-title" className="ad-dialog ad-dialog-wide" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="ad-dialog-body">
          <h4 id="al-title">Add lead</h4>
          <p className="ad-muted" style={{ margin: 0, fontSize: 13 }}>
            For walk-ins, calls and referrals. Website enquiries are added automatically.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 8 }}>
            {field("al-name", "Full name", "name", { ref: first, autoComplete: "off" })}
            {field("al-mob", "Mobile", "mobile", { type: "tel", placeholder: "+94 7X XXX XXXX" })}
            {field("al-email", "Email", "email", { type: "email" })}
            <div className="ad-field">
              <label htmlFor="al-src">Source</label>
              <select id="al-src" name="source" className="ad-input" defaultValue="Walk-in">
                {SOURCES.filter((x) => x !== "Website").map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="ad-field">
              <label htmlFor="al-proj">Project</label>
              <select id="al-proj" name="project" className="ad-input" defaultValue="">
                <option value="">Not sure yet</option>
                {projects.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            {field("al-int", "Interest", "interest", { placeholder: "e.g. 3 Bed, sea view" })}
            {field("al-bud", "Budget", "budget", { placeholder: "e.g. LKR 60–70 Mn" })}
            <div className="ad-field">
              <label htmlFor="al-agent">Assigned agent</label>
              <input id="al-agent" name="agent" className="ad-input" list="al-agents" placeholder="Unassigned" />
              <datalist id="al-agents">
                {agents.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="ad-field" style={{ marginTop: 4 }}>
            <label htmlFor="al-note">Note</label>
            <textarea id="al-note" name="note" className="ad-input" style={{ minHeight: 72 }} placeholder="What are they looking for? When can they visit?" />
          </div>
        </div>
        <div className="ad-dialog-actions">
          <button type="button" className="ad-btn ad-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="ad-btn ad-btn-primary" disabled={pending}>
            {pending ? "Adding…" : "Add lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
