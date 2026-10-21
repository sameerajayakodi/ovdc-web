"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CircleAlert } from "lucide-react";
import { createReservation } from "@/app/admin/sales-actions";
import type { PaymentPlan } from "@/db/schema";
import { lkr } from "@/lib/admin/format";
import { BOOKING_FEE, HOLD_DAYS, PLANS, PLAN_UPLIFT, rs, type UnitOption } from "@/lib/admin/sales";
import { useAdminUi } from "../AdminRoot";

export interface LeadOption {
  id: number;
  name: string;
  mobile: string;
  project: string;
  stage: string;
}

interface Props {
  units: UnitOption[];
  leads: LeadOption[];
  customers: { id: number; name: string; mobile: string }[];
  agents: string[];
  initialLead: number | null;
  onClose: () => void;
  onCreated: (id: number) => void;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function NewReservationDialog({ units, leads, customers, agents, initialLead, onClose, onCreated }: Props) {
  const { toast } = useAdminUi();
  const projects = useMemo(() => [...new Map(units.map((u) => [u.projectSlug, u.projectName])).entries()], [units]);
  const startLead = leads.find((l) => l.id === initialLead);
  const [who, setWho] = useState(startLead ? `lead:${startLead.id}` : "");
  const [project, setProject] = useState(() => projects.find(([, n]) => n === startLead?.project)?.[0] ?? projects[0]?.[0] ?? "");
  const [unitId, setUnitId] = useState("");
  const [hold, setHold] = useState(14);
  const [plan, setPlan] = useState<PaymentPlan>("construction");
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState(BOOKING_FEE.toLocaleString("en-GB"));
  const [agent, setAgent] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const first = useRef<HTMLSelectElement>(null);
  const options = units.filter((u) => u.projectSlug === project);
  const unit = units.find((u) => String(u.id) === unitId);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Changing the form drops the errors from the last attempt.
  const touch = () => Object.keys(err).length > 0 && setErr({});

  const listPrice = (u: UnitOption | undefined, p: PaymentPlan) => (u ? String(round1(u.priceMn * (1 + PLAN_UPLIFT[p] / 100))) : "");
  const pickUnit = (id: string) => {
    setUnitId(id);
    setPrice(listPrice(units.find((u) => String(u.id) === id), plan));
  };
  const pickPlan = (p: PaymentPlan) => {
    setPlan(p);
    setPrice(listPrice(unit, p));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const [kind, id] = who.split(":");
    start(async () => {
      try {
        const r = await createReservation({
          ...(kind === "lead" ? { leadId: Number(id) } : kind === "cust" ? { customerId: Number(id) } : {}),
          unitId: Number(unitId),
          holdDays: hold,
          plan,
          priceMn: Number(price),
          fee: Number(fee.replace(/[^\d]/g, "")),
          agent,
          note,
        });
        if (!r.ok) {
          setErr(r.fields ?? {});
          return toast(r.error, "err");
        }
        toast(r.message ?? "Unit reserved");
        onCreated(r.data!.id);
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  const errOf = (k: string) =>
    err[k] ? (
      <span className="ad-error">
        <CircleAlert size={13} />
        {err[k]}
      </span>
    ) : null;

  return (
    <div className="ad-backdrop" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="nr-title" className="ad-dialog ad-dialog-wide" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="ad-dialog-body">
          <h4 id="nr-title">Reserve a unit</h4>
          <p className="ad-muted" style={{ margin: 0, fontSize: 13 }}>
            The unit shows as Reserved on ovdc.lk until the hold ends or it is released.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 8 }}>
            <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="nr-c">Customer</label>
              <select id="nr-c" ref={first} className="ad-input" value={who} onChange={(e) => (touch(), setWho(e.target.value))} aria-invalid={!!err.who || undefined}>
                <option value="">Choose a lead or customer</option>
                {leads.length > 0 && (
                  <optgroup label="Open leads">
                    {leads.map((l) => (
                      <option key={l.id} value={`lead:${l.id}`}>
                        {l.name} · {l.mobile || "no mobile"}
                        {l.project ? ` · ${l.project}` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {customers.length > 0 && (
                  <optgroup label="Existing customers">
                    {customers.map((x) => (
                      <option key={x.id} value={`cust:${x.id}`}>
                        {x.name} · {x.mobile || "no mobile"}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {errOf("who")}
            </div>
            <div className="ad-field">
              <label htmlFor="nr-p">Project</label>
              <select id="nr-p" className="ad-input" value={project} onChange={(e) => (touch(), setProject(e.target.value), pickUnit(""))}>
                {projects.map(([slug, name]) => (
                  <option key={slug} value={slug}>
                    {name}
                  </option>
                ))}
                {!projects.length && <option value="">No units available</option>}
              </select>
            </div>
            <div className="ad-field">
              <label htmlFor="nr-u">Available unit · {options.length}</label>
              <select id="nr-u" className="ad-input" value={unitId} onChange={(e) => (touch(), pickUnit(e.target.value))} aria-invalid={!!err.unit || undefined}>
                <option value="">Choose a unit</option>
                {options.map((u) => (
                  <option key={u.id} value={u.id}>
                    Tower {u.tower} · {u.code} · {u.type} · {u.label} · {lkr(u.priceMn)}
                  </option>
                ))}
              </select>
              {errOf("unit")}
            </div>
            <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="nr-pl">Payment plan</label>
              <select id="nr-pl" className="ad-input" value={plan} onChange={(e) => (touch(), pickPlan(e.target.value as PaymentPlan))}>
                {PLANS.map((p) => (
                  <option key={p.k} value={p.k}>
                    {p.label}
                  </option>
                ))}
              </select>
              <span className="ad-help">{PLANS.find((p) => p.k === plan)?.hint}</span>
            </div>
            <div className="ad-field">
              <label htmlFor="nr-price">Agreed price (LKR Mn)</label>
              <input id="nr-price" className="ad-input" inputMode="decimal" value={price} onChange={(e) => (touch(), setPrice(e.target.value))} placeholder="Choose a unit" aria-invalid={!!err.price || undefined} />
              {unit && Number(price) > 0 && Number(price) !== round1(unit.priceMn * (1 + PLAN_UPLIFT[plan] / 100)) && <span className="ad-help">List price {lkr(round1(unit.priceMn * (1 + PLAN_UPLIFT[plan] / 100)))}</span>}
              {errOf("price")}
            </div>
            <div className="ad-field">
              <label htmlFor="nr-f">Booking fee (LKR)</label>
              <input id="nr-f" className="ad-input" inputMode="numeric" value={fee} onChange={(e) => (touch(), setFee(e.target.value))} onBlur={() => Number(fee.replace(/[^\d]/g, "")) >= 0 && setFee(Number(fee.replace(/[^\d]/g, "")).toLocaleString("en-GB"))} aria-invalid={!!err.fee || undefined} />
              {errOf("fee")}
            </div>
            <div className="ad-field">
              <label htmlFor="nr-h">Hold period</label>
              <select id="nr-h" className="ad-input" value={hold} onChange={(e) => setHold(Number(e.target.value))}>
                {HOLD_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </div>
            <div className="ad-field">
              <label htmlFor="nr-a">Sales agent</label>
              <input id="nr-a" className="ad-input" list="nr-agents" value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="Unassigned" />
              <datalist id="nr-agents">
                {agents.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
            <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="nr-n">Note</label>
              <textarea id="nr-n" className="ad-input" style={{ minHeight: 60 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything agreed with the customer (parking, discount, bank loan)" />
            </div>
          </div>
          {unit && Number(price) > 0 && (
            <p className="ad-muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
              Booking fee {rs(Number(fee.replace(/[^\d]/g, "")) || 0)} now, then the {PLANS.find((p) => p.k === plan)?.label.toLowerCase()} on {lkr(Number(price))}.
            </p>
          )}
        </div>
        <div className="ad-dialog-actions">
          <button type="button" className="ad-btn ad-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="ad-btn ad-btn-primary" disabled={pending || !projects.length}>
            {pending ? "Reserving…" : "Reserve unit"}
          </button>
        </div>
      </form>
    </div>
  );
}
