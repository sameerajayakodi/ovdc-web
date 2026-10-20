"use client";

import Link from "next/link";
import { useState } from "react";
import { isPhone, submitLead } from "@/lib/leads";
import { Honeypot } from "@/components/ui/Honeypot";
import { routes } from "@/lib/routes";

/** Quick site-visit request on navy (Home). */
export function VisitForm({ projects }: { projects: { slug: string; name: string }[] }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const mobile = String(f.get("mobile") || "").trim();
    const next: Record<string, string> = {};
    if (!name) next.name = "Please enter your name";
    if (!isPhone(mobile)) next.mobile = "Please enter a valid mobile number";
    setErr(next);
    if (Object.keys(next).length) return;
    setState("sending");
    const ok = await submitLead({
      kind: "site-visit",
      name,
      mobile,
      project: String(f.get("project") || ""),
      date: String(f.get("date") || ""),
    }, f);
    setState(ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <div role="status" style={{ display: "flex", flexDirection: "column", gap: 12, alignSelf: "center" }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 40, lineHeight: 1 }}>Request received.</span>
        <p className="lead">A sales advisor will call you within one working day to confirm your visit time.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "28px 32px", alignContent: "start" }}
    >
      <div className="field">
        <label htmlFor="hv-name">Full name</label>
        <input id="hv-name" name="name" className="input" autoComplete="name" placeholder="Your name" aria-invalid={!!err.name} />
        {err.name && <span className="field-error">{err.name}</span>}
      </div>
      <div className="field">
        <label htmlFor="hv-mob">Mobile</label>
        <input id="hv-mob" name="mobile" className="input" type="tel" autoComplete="tel" placeholder="+94 7X XXX XXXX" aria-invalid={!!err.mobile} />
        {err.mobile && <span className="field-error">{err.mobile}</span>}
      </div>
      <div className="field">
        <label htmlFor="hv-proj">Project</label>
        <select id="hv-proj" name="project" className="input" defaultValue={projects[0]?.name}>
          {projects.map((p) => (
            <option key={p.slug}>{p.name}</option>
          ))}
          <option>Not sure yet</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="hv-date">Preferred date</label>
        <input id="hv-date" name="date" className="input" type="date" style={{ colorScheme: "dark" }} />
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-lg" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Book my visit"}
          <span aria-hidden>→</span>
        </button>
        <Link href={routes.bookVisit()} style={{ fontSize: 13, color: "var(--color-on-navy-muted)" }}>
          Choose a time slot instead →
        </Link>
      </div>
      {state === "error" && (
        <span role="alert" className="field-error" style={{ gridColumn: "1 / -1" }}>
          We couldn’t send your request. Please call{" "}
          <a href="tel:+94112345678">+94 11 234 5678</a>.
        </span>
      )}
      <Honeypot />
    </form>
  );
}
