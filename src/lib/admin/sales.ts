/** Reservations & sales: constants and the payment schedule, shared by the server actions and the console. */

import type { PaymentPlan, ReservationStatus } from "@/db/schema";
import type { PaymentStage } from "@/lib/types";
import { addDays } from "./crm";

export const BOOKING_FEE = 500_000;
export const HOLD_DAYS = [7, 14, 30] as const;
export const EXTEND_DAYS = 7;
/** The sale agreement (and any milestones already reached) is due this many days after reserving. */
export const AGREEMENT_DAYS = 14;

export const PLANS: { k: PaymentPlan; label: string; hint: string }[] = [
  { k: "construction", label: "Construction-linked plan", hint: "Instalments fall due as each stage is certified" },
  { k: "30-70", label: "30 / 70 plan", hint: "30% with the agreement, 70% on handover · price +3%" },
  { k: "fx", label: "Foreign currency plan", hint: "Construction-linked, paid by inward remittance" },
];
export const PLAN_LABEL = Object.fromEntries(PLANS.map((p) => [p.k, p.label])) as Record<PaymentPlan, string>;
export const PLAN_UPLIFT: Record<PaymentPlan, number> = { construction: 0, "30-70": 3, fx: 0 };

export const STATUS_LABEL: Record<ReservationStatus, string> = { reserved: "Reserved", sold: "Sold", released: "Released", cancelled: "Cancelled" };

/** agreementStep is how many of these are done (0–5). */
export const AGREEMENT = ["Reservation form", "Draft agreement", "Sent to customer", "Signed", "Registered"] as const;

export const METHODS = ["Bank transfer", "Cheque", "Card (payment gateway)", "Cash deposit", "Inward remittance (USD)"] as const;

export interface ScheduleRow {
  milestone: string;
  condition: string;
  pct: number;
  amount: number;
  dueDate: string;
}

const rupees = (mn: number) => Math.round(mn * 1e6);

/**
 * Milestone rows for a new reservation. The first stage of the plan (booking and agreement)
 * is split into the booking fee, due now, and the rest, due with the agreement.
 */
export function buildSchedule(priceMn: number, plan: PaymentPlan, stages: PaymentStage[], today: string, holdDays: number, fee = BOOKING_FEE): ScheduleRow[] {
  const total = rupees(priceMn);
  const agreementDue = addDays(today, AGREEMENT_DAYS);
  const rows: ScheduleRow[] = [{ milestone: "Booking fee", condition: "On reservation · holds the unit", pct: 0, amount: fee, dueDate: addDays(today, Math.min(3, holdDays)) }];
  if (plan === "30-70") {
    rows.push({ milestone: "Agreement signing", condition: `30% · within ${AGREEMENT_DAYS} days, less the booking fee`, pct: 30, amount: Math.round(total * 0.3) - fee, dueDate: agreementDue });
    rows.push({ milestone: "Handover", condition: "70% · on handover of the keys", pct: 70, amount: 0, dueDate: "" });
  } else {
    stages.forEach((s, i) => {
      const reached = i === 0 || /complete/i.test(s.when);
      rows.push({
        milestone: i === 0 ? "Agreement signing" : s.stage,
        condition: i === 0 ? `${s.pct}% · within ${AGREEMENT_DAYS} days, less the booking fee` : reached ? `${s.pct}% · stage already certified` : `${s.pct}% · ${s.when}`,
        pct: s.pct,
        amount: i === 0 ? Math.round((total * s.pct) / 100) - fee : 0,
        dueDate: reached ? agreementDue : "",
      });
    });
  }
  // Every other row takes its share; the last row absorbs rounding so the total is exact.
  const fixed = rows.reduce((n, r) => n + r.amount, 0);
  const open = rows.filter((r) => r.amount === 0 && r.pct > 0);
  const share = open.reduce((n, r) => n + r.pct, 0);
  let left = total - fixed;
  open.forEach((r, i) => {
    r.amount = i === open.length - 1 ? left : Math.round(((total - fixed) * r.pct) / share);
    left -= r.amount;
  });
  if (plan === "fx") rows.forEach((r) => (r.condition += " · USD at the day's rate"));
  return rows;
}

export const rs = (n: number) => `LKR ${Math.round(n).toLocaleString("en-GB")}`;
/** 8,140,000 → "LKR 8.1 Mn" */
export const rsMn = (n: number) => `LKR ${(n / 1e6).toFixed(1)} Mn`;

/** "RS-2026-0042" from the year and a running number. */
export const refOf = (prefix: "RS" | "RC", year: number, n: number) => `${prefix}-${year}-${String(n).padStart(4, "0")}`;

/* ───────── Shapes sent to the console ───────── */

export interface AdminPayment {
  id: number;
  sort: number;
  milestone: string;
  condition: string;
  pct: number;
  amount: number;
  dueDate: string;
  paidAt: string;
  paidAmount: number;
  method: string;
  reference: string;
  receiptNo: string | null;
  recordedBy: string;
}

export interface AdminReservation {
  id: number;
  ref: string;
  status: ReservationStatus;
  priceMn: number;
  plan: PaymentPlan;
  agreementStep: number;
  holdUntil: string | null;
  agent: string;
  note: string;
  soldAt: string | null;
  closedAt: string | null;
  createdAt: string;
  createdBy: string;
  unit: { id: number; code: string; tower: string; floor: number; type: string; label: string; sqft: number; view: string; facing: string; projectSlug: string; projectName: string };
  customer: { id: number; name: string; mobile: string; email: string; leadId: number | null };
  payments: AdminPayment[];
}

export interface UnitOption {
  id: number;
  projectSlug: string;
  projectName: string;
  tower: string;
  code: string;
  type: string;
  label: string;
  priceMn: number;
}

export const isOverdue = (p: AdminPayment, today: string) => !p.receiptNo && !!p.dueDate && p.dueDate < today;
export const paidTotal = (r: AdminReservation) => r.payments.reduce((n, p) => n + (p.receiptNo ? p.paidAmount : 0), 0);
