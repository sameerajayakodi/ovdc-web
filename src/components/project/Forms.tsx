"use client";

import Link from "next/link";
import { useState } from "react";
import { isPhone, submitLead } from "@/lib/leads";
import { routes } from "@/lib/routes";
import { company } from "@/lib/data/content";
import { IconCheck, IconWhatsApp } from "@/components/ui/Icons";
import { Price, PriceLkr } from "@/components/ui/Price";
import s from "./project.module.css";

type State = "idle" | "sending" | "done" | "error";

function useLeadForm() {
  const [state, setState] = useState<State>("idle");
  const [err, setErr] = useState<Record<string, string>>({});
  return { state, setState, err, setErr };
}

function validate(f: FormData, needEmail = false) {
  const e: Record<string, string> = {};
  if (!String(f.get("name") || "").trim()) e.name = "Please enter your name";
  if (!isPhone(String(f.get("mobile") || ""))) e.mobile = "Please enter a valid mobile number";
  if (needEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.get("email") || ""))) e.email = "Please enter a valid email";
  return e;
}

/** Sticky “Prices from” enquiry card on project pages (desktop). */
export function EnquiryCard({
  project,
  slug,
  fromMn,
  fromNote,
  unitTypes,
}: {
  project: string;
  slug: string;
  fromMn: number | null;
  fromNote: string;
  unitTypes: string[];
}) {
  const { state, setState, err, setErr } = useLeadForm();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = validate(f);
    setErr(v);
    if (Object.keys(v).length) return;
    setState("sending");
    const ok = await submitLead({
      kind: "enquiry",
      project,
      name: String(f.get("name")),
      mobile: String(f.get("mobile")),
      interest: String(f.get("interest") || ""),
    });
    setState(ok ? "done" : "error");
  }

  return (
    <div className={s.enquiry}>
      <div className={s.enquiryHead}>
        <span className="kicker" style={{ letterSpacing: ".14em" }}>
          {fromMn ? "Prices from" : "Launching soon"}
        </span>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 44, lineHeight: 1 }} className="nums">
          {fromMn ? <Price mn={fromMn} /> : "Register interest"}
        </span>
        <span className="subtle" style={{ fontSize: 13 }}>
          <PriceLkr mn={fromMn} /> {fromNote}
        </span>
      </div>
      <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18, padding: "20px 24px 24px" }}>
        {state === "done" && (
          <div role="status" style={{ display: "flex", gap: 10, padding: 12, background: "var(--status-available-tint)", fontSize: 14 }}>
            <span style={{ color: "var(--status-available)", fontWeight: 600 }}>✓</span>
            Thanks. A sales advisor will call you within one working day.
          </div>
        )}
        <div className="field">
          <label htmlFor="pe-n">Full name</label>
          <input id="pe-n" name="name" className="input" autoComplete="name" aria-invalid={!!err.name} />
          {err.name && <span className="field-error">{err.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="pe-m">Mobile</label>
          <input id="pe-m" name="mobile" className="input" type="tel" autoComplete="tel" placeholder="+94 7X XXX XXXX" aria-invalid={!!err.mobile} />
          {err.mobile && <span className="field-error">{err.mobile}</span>}
        </div>
        {unitTypes.length > 0 && (
          <div className="field">
            <label htmlFor="pe-t">Interested in</label>
            <select id="pe-t" name="interest" className="input" defaultValue="Any unit type">
              <option>Any unit type</option>
              {unitTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={state === "sending" || state === "done"}>
          {state === "sending" ? "Sending…" : state === "done" ? "Enquiry sent" : "Send enquiry"}
          <span aria-hidden>→</span>
        </button>
        {state === "error" && (
          <span role="alert" className="field-error">
            Couldn’t send — please call {company.hotline}.
          </span>
        )}
        <Link className="btn btn-secondary btn-block" href={routes.bookVisit({ project: slug })}>
          Book a site visit<span aria-hidden>→</span>
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingTop: 12, borderTop: "1px solid var(--color-divider)", fontSize: 13 }}>
          <a href={company.whatsappHref} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, textDecoration: "none" }}>
            <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "50%", background: "var(--status-available)" }}>
              <IconWhatsApp size={14} stroke="var(--color-white)" />
            </span>
            WhatsApp
          </a>
          <a href={company.hotlineHref} className="nums" style={{ display: "flex", alignItems: "center", minHeight: 44, textDecoration: "none" }}>
            {company.hotline}
          </a>
        </div>
        <span className="subtle" style={{ fontSize: 12 }}>
          Sales gallery open today, 9.00 am – 6.00 pm
        </span>
      </form>
    </div>
  );
}

/** Lead-gated brochure download (navy block). */
export function BrochureForm({ project, pages = 40, size = "18 MB" }: { project: string; pages?: number; size?: string }) {
  const { state, setState, err, setErr } = useLeadForm();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = validate(f, true);
    setErr(v);
    if (Object.keys(v).length) return;
    setState("sending");
    const ok = await submitLead({
      kind: "brochure",
      project,
      name: String(f.get("name")),
      mobile: String(f.get("mobile")),
      email: String(f.get("email")),
    });
    setState(ok ? "done" : "error");
  }

  return (
    <section data-sec="brochure" className={`on-navy ${s.brochure}`} data-reveal>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="kicker" style={{ letterSpacing: ".16em" }}>
          Brochure
        </span>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 36, lineHeight: 1.05 }}>{project} brochure</span>
        <span className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
          {pages} pages: floor plans for every type, specifications, payment plan and price list. PDF, {size}.
        </span>
      </div>
      {state === "done" ? (
        <div role="status" style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 600 }}>
            <IconCheck size={20} />
            Request received
          </span>
          <span className="muted" style={{ fontSize: 14 }}>
            We’re sending the brochure to your email and WhatsApp now.
          </span>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="field">
            <label htmlFor="pb-n">Full name</label>
            <input id="pb-n" name="name" className="input" autoComplete="name" aria-invalid={!!err.name} />
            {err.name && <span className="field-error">{err.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="pb-m">Mobile</label>
            <input id="pb-m" name="mobile" type="tel" className="input" autoComplete="tel" placeholder="+94 7X XXX XXXX" aria-invalid={!!err.mobile} />
            {err.mobile && <span className="field-error">{err.mobile}</span>}
          </div>
          <div className="field">
            <label htmlFor="pb-e">Email</label>
            <input id="pb-e" name="email" type="email" className="input" autoComplete="email" aria-invalid={!!err.email} />
            {err.email && <span className="field-error">{err.email}</span>}
          </div>
          <button className="btn btn-primary" type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Get the brochure"}
            <span aria-hidden>↓</span>
          </button>
          {state === "error" && (
            <span role="alert" className="field-error">
              Couldn’t send — please try again.
            </span>
          )}
        </form>
      )}
    </section>
  );
}
