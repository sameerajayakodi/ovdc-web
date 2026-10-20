"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { isPhone, submitLead } from "@/lib/leads";
import { routes } from "@/lib/routes";
import { company } from "@/lib/data/content";
import { photos, projectPhoto } from "@/lib/data/media";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { IconCheck } from "@/components/ui/Icons";
import s from "./visit.module.css";

type P = { slug: string; name: string; loc: string; status: string };

const VISIT_TYPES = [
  { k: "site", label: "Show apartment on site", note: "Walk the show unit and the construction site with an advisor. 60–90 min." },
  { k: "gallery", label: "Sales gallery, Colombo 03", note: "Models, finishes and payment plans at our Marine Drive gallery. 45 min." },
  { k: "video", label: "Live video tour", note: "For buyers abroad: a guided walk-through on WhatsApp video or Zoom. 30 min." },
];
const SLOTS = ["9.30 am", "11.00 am", "12.30 pm", "2.00 pm", "3.30 pm", "5.00 pm"];
const STEPS = ["Project", "Date & time", "Your details", "Confirmed"];

function upcomingDays(n: number) {
  const out: { iso: string; dow: string; d: string; m: string }[] = [];
  const now = new Date();
  for (let i = 1; out.length < n; i++) {
    const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      iso: `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`,
      dow: x.toLocaleDateString("en-GB", { weekday: "short" }),
      d: String(x.getDate()),
      m: x.toLocaleDateString("en-GB", { month: "short" }),
    });
  }
  return out;
}

/** Date grid — mounted only after step 1, so `new Date()` runs in the browser, never during prerender. */
function DatePick({ value, onChange, sunday }: { value: string; onChange: (iso: string) => void; sunday: boolean }) {
  const [days] = useState(() => upcomingDays(14));
  return (
    <div role="radiogroup" aria-label="Date" className={s.days}>
      {days.map((d) => {
        const closed = d.dow === "Sun" && !sunday;
        return (
          <button key={d.iso} type="button" role="radio" aria-checked={value === d.iso} disabled={closed} className={s.day} onClick={() => onChange(d.iso)}>
            <span>{d.dow}</span>
            <strong>{d.d}</strong>
            <span>{closed ? "Closed" : d.m}</span>
          </button>
        );
      })}
    </div>
  );
}

export function BookVisit({ projects }: { projects: P[] }) {
  const sp = useSearchParams();
  const initialProject = projects.find((p) => p.slug === sp.get("project"))?.slug ?? "";
  const unit = sp.get("unit") ?? "";
  const reserve = sp.get("intent") === "reserve";

  const [step, setStep] = useState(0);
  const [project, setProject] = useState(initialProject);
  const [visit, setVisit] = useState(sp.get("visit") === "video" ? "video" : "site");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [details, setDetails] = useState({ name: "", mobile: "", email: "", country: "Sri Lanka" });

  const proj = projects.find((p) => p.slug === project);
  const visitT = VISIT_TYPES.find((v) => v.k === visit)!;
  const dateLabel = useMemo(() => (date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : ""), [date]);

  function next() {
    const e: Record<string, string> = {};
    if (step === 0 && !project) e.project = "Choose a project, or “Not sure yet”";
    if (step === 1 && !date) e.date = "Choose a date";
    if (step === 1 && !slot) e.slot = "Choose a time";
    setErr(e);
    if (!Object.keys(e).length) setStep(step + 1);
  }

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    const d = { name: String(f.get("name") || "").trim(), mobile: String(f.get("mobile") || "").trim(), email: String(f.get("email") || "").trim(), country: String(f.get("country") || "") };
    setDetails(d);
    const e: Record<string, string> = {};
    if (!d.name) e.name = "Please enter your name";
    if (!isPhone(d.mobile)) e.mobile = "Please enter a valid mobile number, with country code if outside Sri Lanka";
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = "Please check the email address";
    if (!f.get("consent")) e.consent = "Please agree so we can contact you about your visit";
    setErr(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setFailed(false);
    const ok = await submitLead({
      kind: reserve ? "reservation" : "site-visit",
      ...d,
      project: proj?.name ?? "Not sure yet",
      unit,
      date,
      slot,
      visitType: visit,
      message: String(f.get("message") || ""),
    });
    setSending(false);
    if (ok) setStep(3);
    else setFailed(true);
  }

  function icsHref() {
    const [y, m, d] = date.split("-").map(Number);
    const [hm, ap] = slot.split(" ");
    const [hh, mm] = hm.split(".").map(Number);
    const h24 = (hh % 12) + (ap === "pm" ? 12 : 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const start = `${y}${pad(m)}${pad(d)}T${pad(h24)}${pad(mm)}00`;
    const end = `${y}${pad(m)}${pad(d)}T${pad(h24 + 1)}${pad(mm)}00`;
    const body = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OVDC//Site visit//EN",
      "BEGIN:VEVENT",
      `DTSTART;TZID=Asia/Colombo:${start}`,
      `DTEND;TZID=Asia/Colombo:${end}`,
      `SUMMARY:OVDC ${visit === "video" ? "video tour" : "site visit"} · ${proj?.name ?? "OVDC"}`,
      `LOCATION:${visit === "video" ? "Video call" : visit === "gallery" ? company.address.join(", ") : `${proj?.name ?? ""}, ${proj?.loc ?? ""}`}`,
      `DESCRIPTION:Questions? Call ${company.hotline} or WhatsApp ${company.whatsapp}.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
  }

  return (
    <div className={s.wrap}>
      <ol className={s.stepper} aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} data-done={i < step ? "" : undefined}>
            <span>{i < step ? "✓" : `0${i + 1}`}</span>
            {label}
          </li>
        ))}
      </ol>

      <div className={s.body}>
        <div className={s.main}>
          {step === 0 && (
            <fieldset className={s.fieldset}>
              <legend className={s.legend}>{reserve ? "Which home would you like to reserve?" : "Which project would you like to see?"}</legend>
              {unit && (
                <p className={s.note}>
                  {reserve ? "Reservation request for" : "Visiting about"} unit <strong>{unit}</strong>. A sales advisor confirms availability and the reservation fee (LKR 500,000) before anything is
                  charged.
                </p>
              )}
              <div className={s.projectGrid}>
                {projects.map((p) => (
                  <button key={p.slug} type="button" className={s.projectOpt} aria-pressed={project === p.slug} onClick={() => setProject(p.slug)}>
                    <span className={s.projectImg}>
                      <ImageSlot photo={photos[projectPhoto[p.slug] ?? "towerBeach"]} alt="" sizes="160px" />
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                      <strong>{p.name}</strong>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {p.loc}
                      </span>
                    </span>
                  </button>
                ))}
                <button type="button" className={s.projectOpt} aria-pressed={project === "unsure"} onClick={() => setProject("unsure")}>
                  <span className={s.projectImg} style={{ display: "grid", placeItems: "center", background: "var(--color-surface)", fontFamily: "var(--font-heading)", fontSize: 32 }}>
                    ?
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                    <strong>Not sure yet</strong>
                    <span className="muted" style={{ fontSize: 13 }}>
                      We’ll suggest homes that fit
                    </span>
                  </span>
                </button>
              </div>
              {err.project && <span className="field-error">{err.project}</span>}
            </fieldset>
          )}

          {step === 1 && (
            <>
              <fieldset className={s.fieldset}>
                <legend className={s.legend}>How would you like to visit?</legend>
                <div className={s.visitTypes}>
                  {VISIT_TYPES.map((v) => (
                    <button key={v.k} type="button" className={s.visitOpt} aria-pressed={visit === v.k} onClick={() => setVisit(v.k)}>
                      <strong>{v.label}</strong>
                      <span>{v.note}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className={s.fieldset}>
                <legend className={s.legend}>Choose a date</legend>
                <DatePick value={date} onChange={setDate} sunday={visit !== "gallery"} />
                {err.date && <span className="field-error">{err.date}</span>}
              </fieldset>
              <fieldset className={s.fieldset}>
                <legend className={s.legend}>Choose a time {visit === "video" && <span className="muted">(Sri Lanka time, GMT+5:30)</span>}</legend>
                <div role="radiogroup" aria-label="Time" className={s.slots}>
                  {SLOTS.map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={slot === t} className={s.slot} onClick={() => setSlot(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                {err.slot && <span className="field-error">{err.slot}</span>}
              </fieldset>
            </>
          )}

          {step === 2 && (
            <form id="visit-form" onSubmit={submit} noValidate className={s.fieldset} style={{ gap: 28 }}>
              <legend className={s.legend}>Your details</legend>
              <div className={s.formGrid}>
                <div className="field">
                  <label htmlFor="bv-name">Full name</label>
                  <input id="bv-name" name="name" className="input" autoComplete="name" defaultValue={details.name} aria-invalid={!!err.name} />
                  {err.name && <span className="field-error">{err.name}</span>}
                </div>
                <div className="field">
                  <label htmlFor="bv-mobile">Mobile / WhatsApp</label>
                  <input id="bv-mobile" name="mobile" type="tel" className="input" autoComplete="tel" placeholder="+94 7X XXX XXXX" defaultValue={details.mobile} aria-invalid={!!err.mobile} />
                  {err.mobile && <span className="field-error">{err.mobile}</span>}
                </div>
                <div className="field">
                  <label htmlFor="bv-email">Email (optional)</label>
                  <input id="bv-email" name="email" type="email" className="input" autoComplete="email" defaultValue={details.email} aria-invalid={!!err.email} />
                  {err.email && <span className="field-error">{err.email}</span>}
                </div>
                <div className="field">
                  <label htmlFor="bv-country">Country of residence</label>
                  <select id="bv-country" name="country" className="input" defaultValue={details.country}>
                    {["Sri Lanka", "Australia", "United Arab Emirates", "United Kingdom", "Qatar", "Canada", "United States", "Other"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="bv-msg">Anything we should prepare? (optional)</label>
                  <textarea id="bv-msg" name="message" className="input" rows={3} placeholder="e.g. payment plan for a 3 Bed, parking, loan options" />
                </div>
              </div>
              <label className={s.consent}>
                <input type="checkbox" name="consent" />
                <span>
                  OVDC may contact me by phone, WhatsApp or email about this visit. See our <Link href={routes.legal}>privacy policy</Link>.
                </span>
              </label>
              {err.consent && <span className="field-error">{err.consent}</span>}
              {failed && (
                <span role="alert" className="field-error">
                  We couldn’t send your request. Please try again or call {company.hotline}.
                </span>
              )}
            </form>
          )}

          {step === 3 && (
            <div role="status" className={s.done}>
              <span className={s.doneIcon}>
                <IconCheck size={28} stroke="var(--color-navy)" />
              </span>
              <h2 style={{ fontSize: "clamp(36px, 4vw, 56px)", lineHeight: 1 }}>{reserve ? "Reservation request received." : "Your visit is requested."}</h2>
              <p className="lead">
                Thank you, {details.name.split(" ")[0]}. A sales advisor will confirm on {details.mobile} within one working day
                {visit === "video" ? " and send the video-call link." : "."}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn btn-primary" href={icsHref()} download="ovdc-visit.ics">
                  Add to calendar<span aria-hidden>↓</span>
                </a>
                <a className="btn btn-secondary" href={company.whatsappHref} target="_blank" rel="noopener">
                  WhatsApp us<span aria-hidden>↗</span>
                </a>
                <Link className="btn btn-ghost" href={proj ? routes.project(proj.slug) : routes.projects}>
                  Back to {proj?.name ?? "projects"}
                </Link>
              </div>
            </div>
          )}

          {step < 3 && (
            <div className={s.nav}>
              {step > 0 ? (
                <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                  <span aria-hidden>←</span>Back
                </button>
              ) : (
                <span />
              )}
              {step < 2 ? (
                <button type="button" className="btn btn-primary btn-lg" onClick={next}>
                  Continue<span aria-hidden>→</span>
                </button>
              ) : (
                <button type="submit" form="visit-form" className="btn btn-primary btn-lg" disabled={sending}>
                  {sending ? "Sending…" : reserve ? "Send reservation request" : "Request this visit"}
                  <span aria-hidden>→</span>
                </button>
              )}
            </div>
          )}
        </div>

        <aside className={s.summary} aria-label="Your visit">
          <span className="kicker" style={{ letterSpacing: ".14em" }}>
            Your visit
          </span>
          <dl className={s.dl}>
            <div>
              <dt>Project</dt>
              <dd>{proj?.name ?? (project === "unsure" ? "Not sure yet" : "—")}</dd>
            </div>
            {unit && (
              <div>
                <dt>Unit</dt>
                <dd>{unit}</dd>
              </div>
            )}
            <div>
              <dt>Visit</dt>
              <dd>{visitT.label}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>{dateLabel ? `${dateLabel}${slot ? `, ${slot}` : ""}` : "—"}</dd>
            </div>
          </dl>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Sales gallery {company.hours}. Prefer to talk? Call{" "}
            <a href={company.hotlineHref} className="nums">
              {company.hotline}
            </a>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
