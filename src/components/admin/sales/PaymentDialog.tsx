"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CircleAlert, Receipt } from "lucide-react";
import { recordPayment } from "@/app/admin/sales-actions";
import { METHODS, rs, type AdminPayment, type AdminReservation } from "@/lib/admin/sales";
import { useAdminUi } from "../AdminRoot";

export function PaymentDialog({ payment: p, r, today, onClose }: { payment: AdminPayment; r: AdminReservation; today: string; onClose: () => void }) {
  const { toast } = useAdminUi();
  const [amount, setAmount] = useState(p.amount.toLocaleString("en-GB"));
  const [paidAt, setPaidAt] = useState(today);
  const [method, setMethod] = useState<string>(r.plan === "fx" ? "Inward remittance (USD)" : METHODS[0]);
  const [reference, setReference] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const first = useRef<HTMLInputElement>(null);
  const n = Number(amount.replace(/[^\d.]/g, ""));

  useEffect(() => {
    first.current?.select();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        const res = await recordPayment(p.id, { amount: n, paidAt, method, reference });
        if (!res.ok) {
          setErr(res.fields ?? {});
          return toast(res.error, "err");
        }
        toast(res.message ?? "Payment recorded");
        onClose();
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  const errOf = (k: string) =>
    err[k] ? (
      <span className="ad-error" id={`py-${k}-err`}>
        <CircleAlert size={13} />
        {err[k]}
      </span>
    ) : null;

  return (
    <div className="ad-backdrop" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="py-title" className="ad-dialog ad-dialog-wide" style={{ width: "min(540px, 100%)" }} onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="ad-dialog-body">
          <h4 id="py-title">Record payment</h4>
          <p className="ad-muted" style={{ margin: 0, fontSize: 13 }}>
            {r.customer.name} · Unit {r.unit.code} · {p.milestone} · due {rs(p.amount)}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 8 }}>
            <div className="ad-field">
              <label htmlFor="py-amt">Amount received (LKR)</label>
              <input id="py-amt" ref={first} className="ad-input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => n > 0 && setAmount(Math.round(n).toLocaleString("en-GB"))} aria-invalid={!!err.amount || undefined} />
              {n > 0 && Math.round(n) !== p.amount && !err.amount && (
                <span className="ad-help" style={{ color: "var(--a-warn-text)" }}>
                  {Math.round(n) < p.amount ? "Short" : "Over"} by {rs(Math.abs(Math.round(n) - p.amount))}
                </span>
              )}
              {errOf("amount")}
            </div>
            <div className="ad-field">
              <label htmlFor="py-date">Date received</label>
              <input id="py-date" type="date" className="ad-input" max={today} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} aria-invalid={!!err.paidAt || undefined} />
              {errOf("paidAt")}
            </div>
            <div className="ad-field">
              <label htmlFor="py-m">Method</label>
              <select id="py-m" className="ad-input" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              {errOf("method")}
            </div>
            <div className="ad-field">
              <label htmlFor="py-ref">Reference</label>
              <input id="py-ref" className="ad-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. HNB FT 26101934" aria-invalid={!!err.reference || undefined} />
              {errOf("reference")}
            </div>
          </div>
          <p className="ad-muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            A receipt number is issued. Open it from the schedule to print or save it as a PDF.
          </p>
        </div>
        <div className="ad-dialog-actions">
          <button type="button" className="ad-btn ad-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="ad-btn ad-btn-primary" disabled={pending}>
            <Receipt size={15} />
            {pending ? "Saving…" : "Save and create receipt"}
          </button>
        </div>
      </form>
    </div>
  );
}
