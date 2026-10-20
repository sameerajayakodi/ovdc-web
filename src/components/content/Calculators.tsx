"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { PaymentStage } from "@/lib/types";
import { lkrFull, money } from "@/lib/money";
import { usePrefs } from "@/components/providers/Preferences";
import s from "./calc.module.css";

function Num({ id, label, value, onChange, min, max, step, suffix }: { id: string; label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix: string }) {
  return (
    <div className={s.num}>
      <label htmlFor={id} className="label muted">
        {label}
      </label>
      <div className={s.numRow}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="input nums"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        />
        <span className="muted">{suffix}</span>
      </div>
      <input type="range" aria-hidden tabIndex={-1} className={s.range} value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Calculators({ stages }: { stages: PaymentStage[] }) {
  const sp = useSearchParams();
  const { currency } = usePrefs();
  const initial = Number(sp.get("price")) || 94.2;

  const [price, setPrice] = useState(initial);
  const [booking, setBooking] = useState(20);
  const [ltv, setLtv] = useState(70);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(20);

  // Payment plan: booking % first, the rest spread across the remaining stages in their original proportions.
  const rest = stages.slice(1);
  const restTotal = rest.reduce((n, r) => n + r.pct, 0);
  const plan = [{ ...stages[0], pct: booking }, ...rest.map((r) => ({ ...r, pct: (r.pct / restTotal) * (100 - booking) }))];

  const principal = (price * 1e6 * ltv) / 100;
  const r = rate / 100 / 12;
  const n = years * 12;
  const emi = r ? (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : principal / n;
  const totalPaid = emi * n;
  const interest = totalPaid - principal;
  const own = price * 1e6 - principal;
  const conv = (lkr: number) => (currency === "LKR" ? "" : ` · ${money(lkr / 1e6, currency)}`);

  return (
    <div className={s.wrap}>
      <section className={s.card} aria-labelledby="pp-h">
        <div className={s.cardHead}>
          <span className="kicker">Payment plan</span>
          <h2 id="pp-h" className="h-sub">
            What you pay, stage by stage
          </h2>
        </div>
        <div className={s.inputs}>
          <Num id="pp-price" label="Unit price" value={price} onChange={setPrice} min={20} max={400} step={0.5} suffix="LKR Mn" />
          <Num id="pp-book" label="On booking" value={booking} onChange={setBooking} min={10} max={50} step={5} suffix="%" />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th>Stage</th>
                <th>When</th>
                <th className="num">%</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((row) => (
                <tr key={row.stage}>
                  <td style={{ fontWeight: 500 }}>{row.stage}</td>
                  <td className="muted">{row.when}</td>
                  <td className="num">{row.pct.toFixed(row.pct % 1 ? 1 : 0)}%</td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {money(Math.round(price * row.pct) / 100, currency)}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--color-rule-strong)" }}>
                <td colSpan={2} style={{ fontWeight: 600 }}>
                  Total
                </td>
                <td className="num" style={{ fontWeight: 600 }}>
                  100%
                </td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {money(price, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.card} aria-labelledby="loan-h">
        <div className={s.cardHead}>
          <span className="kicker">Housing loan</span>
          <h2 id="loan-h" className="h-sub">
            Estimate your monthly instalment
          </h2>
        </div>
        <div className={s.inputs}>
          <Num id="ln-price" label="Unit price" value={price} onChange={setPrice} min={20} max={400} step={0.5} suffix="LKR Mn" />
          <Num id="ln-ltv" label="Loan to value" value={ltv} onChange={setLtv} min={10} max={80} step={5} suffix="%" />
          <Num id="ln-rate" label="Interest rate (p.a.)" value={rate} onChange={setRate} min={5} max={20} step={0.25} suffix="%" />
          <Num id="ln-years" label="Tenure" value={years} onChange={setYears} min={5} max={30} step={1} suffix="years" />
        </div>
        <div className={s.result} aria-live="polite">
          <span className="kicker kicker-on-navy">Monthly instalment</span>
          <span className={s.big}>{lkrFull(emi)}</span>
          <span style={{ color: "var(--color-on-navy-muted)", fontSize: 13 }}>
            per month for {years} years{conv(emi)}
          </span>
          <div className={s.split} role="img" aria-label={`Principal ${Math.round((principal / totalPaid) * 100)}%, interest ${Math.round((interest / totalPaid) * 100)}%`}>
            <span style={{ flex: principal }} />
            <span style={{ flex: Math.max(interest, 0) }} />
          </div>
          <dl className={s.dl}>
            <div>
              <dt>Loan amount</dt>
              <dd>{lkrFull(principal)}</dd>
            </div>
            <div>
              <dt>Your contribution</dt>
              <dd>{lkrFull(own)}</dd>
            </div>
            <div>
              <dt>Total interest</dt>
              <dd>{lkrFull(interest)}</dd>
            </div>
            <div>
              <dt>Total repaid</dt>
              <dd>{lkrFull(totalPaid)}</dd>
            </div>
          </dl>
        </div>
        <p className="subtle" style={{ fontSize: 12, lineHeight: 1.6 }}>
          An estimate only, at a fixed rate. Your bank sets the rate, the loan-to-value and fees after assessing your application; for
          under-construction homes, funds are released against stage certificates.
        </p>
      </section>
    </div>
  );
}
