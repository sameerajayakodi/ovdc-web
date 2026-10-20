"use client";

import Link from "next/link";
import { useState } from "react";
import { isPhone, submitLead } from "@/lib/leads";
import { Honeypot } from "@/components/ui/Honeypot";
import { routes } from "@/lib/routes";
import { IconCheck } from "@/components/ui/Icons";
import c from "./content.module.css";

const TOPICS = ["Buying a home", "Payment plans & loans", "Buying from abroad", "Existing homeowner", "Careers", "Media & partnerships", "Something else"];

export function ContactForm({ projects }: { projects: string[] }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<Record<string, string>>({});
  const [name, setName] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = {
      name: String(f.get("name") || "").trim(),
      mobile: String(f.get("mobile") || "").trim(),
      email: String(f.get("email") || "").trim(),
      message: String(f.get("message") || "").trim(),
    };
    const x: Record<string, string> = {};
    if (!v.name) x.name = "Please enter your name";
    if (!isPhone(v.mobile) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) x.mobile = "Please give a mobile number or an email so we can reply";
    if (v.message.length < 5) x.message = "Please tell us a little about your enquiry";
    setErr(x);
    if (Object.keys(x).length) return;
    setName(v.name);
    setState("sending");
    const ok = await submitLead({ kind: "contact", ...v, interest: String(f.get("topic")), project: String(f.get("project") || "") }, f);
    setState(ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <div role="status" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "24px 0" }}>
        <span style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: "50%", background: "var(--color-gold)" }}>
          <IconCheck size={24} stroke="var(--color-navy)" />
        </span>
        <h2 style={{ fontSize: 40, lineHeight: 1 }}>Thank you, {name.split(" ")[0]}.</h2>
        <p className="lead">We reply to every message within one working day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={c.formGrid}>
      <div className="field">
        <label htmlFor="ct-name">Full name</label>
        <input id="ct-name" name="name" className="input" autoComplete="name" aria-invalid={!!err.name} />
        {err.name && <span className="field-error">{err.name}</span>}
      </div>
      <div className="field">
        <label htmlFor="ct-topic">Topic</label>
        <select id="ct-topic" name="topic" className="input" defaultValue={TOPICS[0]}>
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="ct-mobile">Mobile / WhatsApp</label>
        <input id="ct-mobile" name="mobile" type="tel" className="input" autoComplete="tel" placeholder="+94 7X XXX XXXX" aria-invalid={!!err.mobile} />
        {err.mobile && <span className="field-error">{err.mobile}</span>}
      </div>
      <div className="field">
        <label htmlFor="ct-email">Email</label>
        <input id="ct-email" name="email" type="email" className="input" autoComplete="email" />
      </div>
      <div className={`field ${c.full}`}>
        <label htmlFor="ct-project">Project (optional)</label>
        <select id="ct-project" name="project" className="input" defaultValue="">
          <option value="">Any / not sure</option>
          {projects.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className={`field ${c.full}`}>
        <label htmlFor="ct-msg">Message</label>
        <textarea id="ct-msg" name="message" className="input" rows={4} aria-invalid={!!err.message} />
        {err.message && <span className="field-error">{err.message}</span>}
      </div>
      <div className={c.full} style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-lg" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send message"}
          <span aria-hidden>→</span>
        </button>
        <span className="subtle" style={{ fontSize: 12 }}>
          By sending, you agree to our <Link href={routes.legal}>privacy policy</Link>.
        </span>
      </div>
      {state === "error" && (
        <span role="alert" className={`field-error ${c.full}`}>
          We couldn’t send your message. Please try again, or call us.
        </span>
      )}
      <Honeypot />
    </form>
  );
}
