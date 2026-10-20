"use client";

import { useState } from "react";
import { isPhone, submitLead, type LeadKind } from "@/lib/leads";
import { IconCheck } from "@/components/ui/Icons";
import c from "./content.module.css";

type Field = { name: "name" | "mobile" | "email" | "message" | "unit" | "interest" | "url"; label: string; type?: string; required?: boolean; full?: boolean; placeholder?: string };

/** Small lead form used by careers and the customer portal. */
export function SimpleLeadForm({
  kind,
  fields,
  submitLabel,
  doneTitle,
  doneBody,
  context,
}: {
  kind: LeadKind;
  fields: Field[];
  submitLabel: string;
  doneTitle: string;
  doneBody: string;
  context?: { project?: string; interest?: string };
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = Object.fromEntries(fields.map((x) => [x.name, String(f.get(x.name) || "").trim()]));
    const x: Record<string, string> = {};
    for (const fd of fields) {
      if (fd.required && !v[fd.name]) x[fd.name] = `Please enter your ${fd.label.toLowerCase()}`;
      if (fd.name === "mobile" && v.mobile && !isPhone(v.mobile)) x.mobile = "Please enter a valid mobile number";
      if (fd.name === "email" && v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) x.email = "Please check the email address";
    }
    setErr(x);
    if (Object.keys(x).length) return;
    setState("sending");
    const ok = await submitLead({ kind, ...context, ...v });
    setState(ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <div role="status" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <span style={{ display: "grid", placeItems: "center", width: 52, height: 52, borderRadius: "50%", background: "var(--color-gold)" }}>
          <IconCheck size={22} stroke="var(--color-navy)" />
        </span>
        <h3 style={{ fontSize: 32, lineHeight: 1 }}>{doneTitle}</h3>
        <p className="lead">{doneBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={c.formGrid}>
      {fields.map((fd) => (
        <div key={fd.name} className={`field ${fd.full ? c.full : ""}`}>
          <label htmlFor={`sl-${fd.name}`}>{fd.label}</label>
          {fd.type === "textarea" ? (
            <textarea id={`sl-${fd.name}`} name={fd.name} className="input" rows={4} placeholder={fd.placeholder} aria-invalid={!!err[fd.name]} />
          ) : (
            <input
              id={`sl-${fd.name}`}
              name={fd.name}
              type={fd.type ?? "text"}
              className="input"
              placeholder={fd.placeholder}
              autoComplete={fd.name === "name" ? "name" : fd.name === "email" ? "email" : fd.name === "mobile" ? "tel" : undefined}
              aria-invalid={!!err[fd.name]}
            />
          )}
          {err[fd.name] && <span className="field-error">{err[fd.name]}</span>}
        </div>
      ))}
      <div className={c.full}>
        <button className="btn btn-primary btn-lg" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : submitLabel}
          <span aria-hidden>→</span>
        </button>
      </div>
      {state === "error" && (
        <span role="alert" className={`field-error ${c.full}`}>
          Something went wrong. Please try again.
        </span>
      )}
    </form>
  );
}
