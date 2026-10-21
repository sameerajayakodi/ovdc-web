"use server";

import { refresh, updateTag } from "next/cache";
import { and, desc, eq, like } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PaymentPlan } from "@/db/schema";
import { requireAdmin, type Admin } from "@/lib/admin/auth";
import { addDays, isYmd, ymdOf } from "@/lib/admin/crm";
import { AGREEMENT, EXTEND_DAYS, HOLD_DAYS, METHODS, PLANS, buildSchedule, refOf, rs } from "@/lib/admin/sales";
import { projectContent } from "@/lib/data/projectContent";
import { paymentPlan } from "@/lib/data/content";
import { TAGS } from "@/lib/cacheTags";
import type { ActionResult } from "@/lib/admin/types";

function need() {
  if (!db) throw new Error("The database is not configured (DATABASE_URL).");
  return db;
}

const txt = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const validId = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;

function log(admin: Admin, ref: string, action: string, detail: Record<string, unknown> = {}) {
  return need().insert(schema.activity).values({ actor: admin.username, entity: "sale", ref, action, detail });
}

function inventoryChanged(slug: string) {
  updateTag(TAGS.inventory);
  updateTag(TAGS.inventoryOf(slug));
}

/** Next running number for "RS-2026-…" / "RC-2026-…". */
async function nextRef(prefix: "RS" | "RC") {
  const d = need();
  const year = Number(ymdOf(Date.now()).slice(0, 4));
  const head = `${prefix}-${year}-`;
  const [last] =
    prefix === "RS"
      ? await d.select({ v: schema.reservations.ref }).from(schema.reservations).where(like(schema.reservations.ref, `${head}%`)).orderBy(desc(schema.reservations.ref)).limit(1)
      : await d.select({ v: schema.payments.receiptNo }).from(schema.payments).where(like(schema.payments.receiptNo, `${head}%`)).orderBy(desc(schema.payments.receiptNo)).limit(1);
  return refOf(prefix, year, (Number(last?.v?.slice(head.length)) || 0) + 1);
}

const isUnique = (e: unknown) => /duplicate key|unique/i.test(e instanceof Error ? `${e.message} ${(e as { cause?: Error }).cause?.message ?? ""}` : String(e));

async function load(id: number) {
  const [row] = await need()
    .select({ r: schema.reservations, unit: schema.units, customer: schema.customers })
    .from(schema.reservations)
    .innerJoin(schema.units, eq(schema.units.id, schema.reservations.unitId))
    .innerJoin(schema.customers, eq(schema.customers.id, schema.reservations.customerId))
    .where(eq(schema.reservations.id, id))
    .limit(1);
  return row ?? null;
}

const unitRef = (u: { tower: string; code: string }) => `${u.tower}-${u.code}`;

function leadEvent(leadId: number | null, admin: Admin, text: string, stage?: "reserved" | "won") {
  if (!leadId) return [];
  const d = need();
  return [
    d.insert(schema.leadEvents).values({ leadId, actor: admin.username, type: "stage", text }),
    ...(stage ? [d.update(schema.leads).set({ stage, updatedAt: new Date() }).where(eq(schema.leads.id, leadId))] : []),
  ];
}

/* ───────── New reservation ───────── */

export interface NewReservation {
  /** An open lead (a customer record is made from it) or an existing customer */
  leadId?: number;
  customerId?: number;
  unitId: number;
  holdDays: number;
  plan: PaymentPlan;
  priceMn: number;
  fee: number;
  agent: string;
  note: string;
}

export async function createReservation(input: NewReservation): Promise<ActionResult<{ id: number; ref: string }>> {
  const admin = await requireAdmin();
  const d = need();
  const f: Record<string, string> = {};
  if (!validId(input.leadId) && !validId(input.customerId)) f.who = "Choose the customer.";
  if (!validId(input.unitId)) f.unit = "Choose an available unit.";
  if (!HOLD_DAYS.includes(input.holdDays as (typeof HOLD_DAYS)[number])) f.hold = "Choose a hold period.";
  if (!PLANS.some((p) => p.k === input.plan)) f.plan = "Choose a payment plan.";
  const priceMn = Math.round(Number(input.priceMn) * 10) / 10;
  if (!(priceMn >= 1 && priceMn <= 100000)) f.price = "Enter the agreed price in LKR millions.";
  const fee = Math.round(Number(input.fee));
  if (!(fee >= 0 && fee <= 50_000_000)) f.fee = "Enter the booking fee in rupees.";
  else if (priceMn && fee >= priceMn * 1e6 * 0.3) f.fee = "The booking fee must be less than 30% of the price.";
  if (Object.keys(f).length) return { ok: false, error: Object.values(f)[0], fields: f };

  // Customer: reuse the one made from this lead before, or make one.
  let customer: { id: number; name: string; leadId: number | null } | undefined;
  if (validId(input.customerId)) {
    [customer] = await d.select({ id: schema.customers.id, name: schema.customers.name, leadId: schema.customers.leadId }).from(schema.customers).where(eq(schema.customers.id, input.customerId)).limit(1);
    if (!customer) return { ok: false, error: "This customer no longer exists.", fields: { who: "Choose the customer." } };
  } else {
    const leadId = input.leadId!;
    const [lead] = await d.select().from(schema.leads).where(eq(schema.leads.id, leadId)).limit(1);
    if (!lead) return { ok: false, error: "This lead no longer exists.", fields: { who: "Choose the customer." } };
    if (!lead.name.trim()) return { ok: false, error: "Add the lead's name before reserving a unit.", fields: { who: "The lead has no name." } };
    [customer] = await d.select({ id: schema.customers.id, name: schema.customers.name, leadId: schema.customers.leadId }).from(schema.customers).where(eq(schema.customers.leadId, leadId)).limit(1);
    customer ??= (
      await d
        .insert(schema.customers)
        .values({ name: lead.name.trim(), mobile: lead.mobile, email: lead.email, leadId })
        .returning({ id: schema.customers.id, name: schema.customers.name, leadId: schema.customers.leadId })
    )[0];
  }

  // Hold the unit first: only an Available unit can be reserved, and only once.
  const [unit] = await d
    .update(schema.units)
    .set({ status: "R", updatedAt: new Date() })
    .where(and(eq(schema.units.id, input.unitId), eq(schema.units.status, "A")))
    .returning();
  if (!unit) return { ok: false, error: "This unit is no longer available. Pick another one.", fields: { unit: "No longer available." } };

  const today = ymdOf(Date.now());
  const stages = projectContent[unit.projectSlug]?.payment?.stages ?? paymentPlan;
  const rows = buildSchedule(priceMn, input.plan, stages, today, input.holdDays, fee);
  const holdUntil = new Date(Date.parse(`${addDays(today, input.holdDays)}T17:00:00+05:30`));

  try {
    let res: { id: number; ref: string } | undefined;
    for (let tries = 0; !res && tries < 3; tries++) {
      try {
        [res] = await d
          .insert(schema.reservations)
          .values({ ref: await nextRef("RS"), unitId: unit.id, customerId: customer.id, priceMn, plan: input.plan, agreementStep: 1, holdUntil, agent: txt(input.agent, 80), note: txt(input.note, 1000), createdBy: admin.username })
          .returning({ id: schema.reservations.id, ref: schema.reservations.ref });
      } catch (e) {
        if (!isUnique(e) || tries === 2) throw e;
      }
    }
    const { id, ref } = res!;
    await d.batch([
      log(admin, ref, `reserved ${unitRef(unit)} for ${customer.name}`, { name: customer.name, unit: unitRef(unit), project: unit.projectSlug, priceMn, holdUntil: holdUntil.toISOString() }),
      d.insert(schema.payments).values(rows.map((r, i) => ({ ...r, reservationId: id, sort: i }))),
      ...leadEvent(customer.leadId, admin, `Reserved unit ${unitRef(unit)} · ${ref}`, "reserved"),
    ]);
    inventoryChanged(unit.projectSlug);
    refresh();
    return { ok: true, data: { id, ref }, message: `Unit ${unit.code} reserved for ${customer.name} · hold ends ${holdUntil.toLocaleDateString("en-GB", { timeZone: "Asia/Colombo", day: "numeric", month: "short" })}` };
  } catch (e) {
    // Put the unit back on sale if the reservation could not be written.
    await d.update(schema.units).set({ status: "A", updatedAt: new Date() }).where(and(eq(schema.units.id, unit.id), eq(schema.units.status, "R")));
    throw e;
  }
}

/* ───────── Hold, agreement, sale, release ───────── */

export async function extendHold(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const row = await load(id);
  if (!row) return { ok: false, error: "This reservation no longer exists." };
  if (row.r.status !== "reserved") return { ok: false, error: "Only an active reservation can be extended." };
  const from = Math.max(Date.now(), row.r.holdUntil?.getTime() ?? 0);
  const holdUntil = new Date(from + EXTEND_DAYS * 86_400_000);
  const d = need();
  await d.batch([
    d.update(schema.reservations).set({ holdUntil, updatedAt: new Date() }).where(eq(schema.reservations.id, id)),
    log(admin, row.r.ref, `hold extended ${EXTEND_DAYS} days`, { name: row.customer.name, unit: unitRef(row.unit), holdUntil: holdUntil.toISOString() }),
  ]);
  refresh();
  return { ok: true, message: `Hold extended to ${holdUntil.toLocaleString("en-GB", { timeZone: "Asia/Colombo", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` };
}

export async function setAgreementStep(id: number, step: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!Number.isInteger(step) || step < 0 || step > AGREEMENT.length) return { ok: false, error: "Unknown agreement step." };
  const row = await load(id);
  if (!row) return { ok: false, error: "This reservation no longer exists." };
  if (row.r.status === "released" || row.r.status === "cancelled") return { ok: false, error: "This reservation is closed." };
  const d = need();
  const label = step === 0 ? "reset" : AGREEMENT[step - 1].toLowerCase();
  await d.batch([
    d.update(schema.reservations).set({ agreementStep: step, updatedAt: new Date() }).where(eq(schema.reservations.id, id)),
    log(admin, row.r.ref, `agreement · ${label}`, { name: row.customer.name, unit: unitRef(row.unit), step }),
  ]);
  refresh();
  return { ok: true, message: `Agreement marked as ${label}` };
}

/** Turns a reservation into a sale: the unit shows as Sold on the website. */
export async function markSold(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const row = await load(id);
  if (!row) return { ok: false, error: "This reservation no longer exists." };
  if (row.r.status !== "reserved") return { ok: false, error: "Only an active reservation can become a sale." };
  if (row.r.agreementStep < 4) return { ok: false, error: "The customer must sign the agreement first." };
  const [fee] = await d.select({ paidAt: schema.payments.paidAt }).from(schema.payments).where(eq(schema.payments.reservationId, id)).orderBy(schema.payments.sort).limit(1);
  if (fee && !fee.paidAt) return { ok: false, error: "Record the booking fee before marking the unit sold." };
  const now = new Date();
  await d.batch([
    d.update(schema.reservations).set({ status: "sold", soldAt: now, holdUntil: null, updatedAt: now }).where(eq(schema.reservations.id, id)),
    d.update(schema.units).set({ status: "S", updatedAt: now }).where(eq(schema.units.id, row.unit.id)),
    log(admin, row.r.ref, `sold ${unitRef(row.unit)} to ${row.customer.name}`, { name: row.customer.name, unit: unitRef(row.unit), project: row.unit.projectSlug, priceMn: row.r.priceMn }),
    ...leadEvent(row.customer.leadId, admin, `Bought unit ${unitRef(row.unit)} · ${row.r.ref}`, "won"),
  ]);
  inventoryChanged(row.unit.projectSlug);
  refresh();
  return { ok: true, message: `Unit ${row.unit.code} sold · shows as Sold on the website` };
}

/** Cancels a reservation (or a sale) and puts the unit back on sale. */
export async function releaseReservation(id: number, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const row = await load(id);
  if (!row) return { ok: false, error: "This reservation no longer exists." };
  if (row.r.status === "released" || row.r.status === "cancelled") return { ok: false, error: "This reservation is already closed." };
  const now = new Date();
  const status = row.r.status === "sold" ? "cancelled" : "released";
  const why = txt(reason, 300);
  await d.batch([
    d.update(schema.reservations).set({ status, closedAt: now, holdUntil: null, note: why ? `${row.r.note ? row.r.note + "\n" : ""}${status === "cancelled" ? "Cancelled" : "Released"}: ${why}` : row.r.note, updatedAt: now }).where(eq(schema.reservations.id, id)),
    // Only touch the unit if it still carries this reservation's status.
    d.update(schema.units).set({ status: "A", updatedAt: now }).where(and(eq(schema.units.id, row.unit.id), eq(schema.units.status, row.r.status === "sold" ? "S" : "R"))),
    log(admin, row.r.ref, `${status} ${unitRef(row.unit)}`, { name: row.customer.name, unit: unitRef(row.unit), project: row.unit.projectSlug, ...(why ? { reason: why } : {}) }),
    ...leadEvent(row.customer.leadId, admin, `${status === "cancelled" ? "Sale cancelled" : "Reservation released"} · unit ${unitRef(row.unit)}${why ? ` · ${why}` : ""}`),
  ]);
  inventoryChanged(row.unit.projectSlug);
  refresh();
  return { ok: true, message: `Unit ${row.unit.code} released · shows as Available on the website` };
}

/* ───────── Payments ───────── */

async function loadPayment(paymentId: number) {
  if (!validId(paymentId)) return null;
  const [p] = await need().select().from(schema.payments).where(eq(schema.payments.id, paymentId)).limit(1);
  if (!p) return null;
  const row = await load(p.reservationId);
  return row ? { p, ...row } : null;
}

export interface PaymentInput {
  amount: number;
  paidAt: string;
  method: string;
  reference: string;
}

export async function recordPayment(paymentId: number, input: PaymentInput): Promise<ActionResult<{ receiptNo: string }>> {
  const admin = await requireAdmin();
  const d = need();
  const x = await loadPayment(paymentId);
  if (!x) return { ok: false, error: "This instalment no longer exists." };
  if (x.r.status === "released" || x.r.status === "cancelled") return { ok: false, error: "This reservation is closed." };
  if (x.p.receiptNo) return { ok: false, error: `Already paid · receipt ${x.p.receiptNo}` };
  const f: Record<string, string> = {};
  const amount = Math.round(Number(input.amount));
  if (!(amount > 0 && amount <= 10_000_000_000)) f.amount = "Enter the amount received in rupees.";
  if (!isYmd(input.paidAt) || input.paidAt > ymdOf(Date.now())) f.paidAt = "Choose the date the money was received.";
  const method = (METHODS as readonly string[]).includes(input.method) ? input.method : "";
  if (!method) f.method = "Choose how it was paid.";
  const reference = txt(input.reference, 80);
  if (!reference) f.reference = "Add the bank or cheque reference.";
  if (Object.keys(f).length) return { ok: false, error: Object.values(f)[0], fields: f };

  for (let tries = 0; ; tries++) {
    const receiptNo = await nextRef("RC");
    try {
      const [done] = await d
        .update(schema.payments)
        .set({ paidAt: input.paidAt, paidAmount: amount, method, reference, receiptNo, recordedBy: admin.username, updatedAt: new Date() })
        .where(and(eq(schema.payments.id, paymentId), eq(schema.payments.paidAt, "")))
        .returning({ id: schema.payments.id });
      if (!done) return { ok: false, error: "Someone else recorded this payment. Reload the page." };
      await log(admin, x.r.ref, `payment received · ${x.p.milestone}`, { name: x.customer.name, unit: unitRef(x.unit), receiptNo, amount, method, reference });
      refresh();
      const short = amount !== x.p.amount ? ` · ${amount < x.p.amount ? "short by" : "over by"} ${rs(Math.abs(amount - x.p.amount))}` : "";
      return { ok: true, data: { receiptNo }, message: `Payment recorded · receipt ${receiptNo}${short}` };
    } catch (e) {
      if (!isUnique(e) || tries === 2) throw e;
    }
  }
}

/** Undoes a payment entered by mistake. The receipt number is not reused. */
export async function voidPayment(paymentId: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const x = await loadPayment(paymentId);
  if (!x) return { ok: false, error: "This instalment no longer exists." };
  if (!x.p.receiptNo) return { ok: false, error: "This instalment has not been paid." };
  await d.batch([
    d.update(schema.payments).set({ paidAt: "", paidAmount: 0, method: "", reference: "", receiptNo: null, recordedBy: "", updatedAt: new Date() }).where(eq(schema.payments.id, paymentId)),
    log(admin, x.r.ref, `receipt voided · ${x.p.receiptNo}`, { name: x.customer.name, unit: unitRef(x.unit), receiptNo: x.p.receiptNo, amount: x.p.paidAmount }),
  ]);
  refresh();
  return { ok: true, message: `Receipt ${x.p.receiptNo} voided` };
}

/** Sets when a construction milestone falls due, once the engineer certifies it. */
export async function setDueDate(paymentId: number, dueDate: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  if (dueDate !== "" && !isYmd(dueDate)) return { ok: false, error: "Choose a valid date." };
  const x = await loadPayment(paymentId);
  if (!x) return { ok: false, error: "This instalment no longer exists." };
  if (x.p.receiptNo) return { ok: false, error: "This instalment is already paid." };
  await d.batch([
    d.update(schema.payments).set({ dueDate, updatedAt: new Date() }).where(eq(schema.payments.id, paymentId)),
    log(admin, x.r.ref, dueDate ? `due date set · ${x.p.milestone}` : `due date cleared · ${x.p.milestone}`, { name: x.customer.name, unit: unitRef(x.unit), dueDate }),
  ]);
  refresh();
  return { ok: true, message: dueDate ? `${x.p.milestone} due ${new Date(`${dueDate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "Due date cleared" };
}

