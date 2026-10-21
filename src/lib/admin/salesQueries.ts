import "server-only";
import { and, asc, desc, eq, gte, inArray, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { isOverdue, type AdminPayment, type AdminReservation, type UnitOption } from "./sales";
import type { AdminCustomer, AdminCustomerRow } from "./customers";

function need() {
  if (!db) throw new Error("The database is not configured (DATABASE_URL).");
  return db;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** Active reservations and sales, plus those closed in the last 90 days. Optionally only one customer's. */
export async function getReservations(customerId?: number): Promise<AdminReservation[]> {
  const d = need();
  const since = new Date(Date.now() - 90 * 86_400_000);
  const rows = await d
    .select({ r: schema.reservations, u: schema.units, projectName: schema.projects.name, c: schema.customers })
    .from(schema.reservations)
    .innerJoin(schema.units, eq(schema.units.id, schema.reservations.unitId))
    .innerJoin(schema.projects, eq(schema.projects.slug, schema.units.projectSlug))
    .innerJoin(schema.customers, eq(schema.customers.id, schema.reservations.customerId))
    .where(
      customerId
        ? eq(schema.reservations.customerId, customerId)
        : or(inArray(schema.reservations.status, ["reserved", "sold"]), gte(schema.reservations.closedAt, since)),
    )
    .orderBy(desc(schema.reservations.createdAt))
    .limit(2000);
  const ids = rows.map((x) => x.r.id);
  const pays = ids.length ? await d.select().from(schema.payments).where(inArray(schema.payments.reservationId, ids)).orderBy(asc(schema.payments.reservationId), asc(schema.payments.sort)) : [];
  const byRes = new Map<number, AdminPayment[]>();
  for (const p of pays) {
    const { reservationId, updatedAt, ...rest } = p;
    void updatedAt;
    byRes.set(reservationId, [...(byRes.get(reservationId) ?? []), rest]);
  }
  return rows.map(({ r, u, projectName, c }) => ({
    id: r.id,
    ref: r.ref,
    status: r.status,
    priceMn: r.priceMn,
    plan: r.plan,
    agreementStep: r.agreementStep,
    holdUntil: iso(r.holdUntil),
    agent: r.agent,
    note: r.note,
    soldAt: iso(r.soldAt),
    closedAt: iso(r.closedAt),
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy,
    unit: { id: u.id, code: u.code, tower: u.tower, floor: u.floor, type: u.type, label: u.label, sqft: u.sqft, view: u.view, facing: u.facing, projectSlug: u.projectSlug, projectName },
    customer: { id: c.id, name: c.name, mobile: c.mobile, email: c.email, leadId: c.leadId },
    payments: byRes.get(r.id) ?? [],
  }));
}

export async function getAvailableUnits(): Promise<UnitOption[]> {
  return need()
    .select({
      id: schema.units.id,
      projectSlug: schema.units.projectSlug,
      projectName: schema.projects.name,
      tower: schema.units.tower,
      code: schema.units.code,
      type: schema.units.type,
      label: schema.units.label,
      priceMn: schema.units.priceMn,
    })
    .from(schema.units)
    .innerJoin(schema.projects, eq(schema.projects.slug, schema.units.projectSlug))
    .where(and(eq(schema.units.status, "A")))
    .orderBy(asc(schema.projects.sort), asc(schema.units.tower), asc(schema.units.floor), asc(schema.units.letter));
}

export async function getCustomerOptions() {
  return need().select({ id: schema.customers.id, name: schema.customers.name, mobile: schema.customers.mobile }).from(schema.customers).orderBy(asc(schema.customers.name)).limit(2000);
}

/** Every customer with the units they hold and whether an instalment is overdue. */
export async function getCustomerList(today: string): Promise<AdminCustomerRow[]> {
  const d = need();
  const [rows, res] = await Promise.all([d.select().from(schema.customers).orderBy(asc(schema.customers.name)).limit(3000), getReservations()]);
  const by = new Map<number, AdminReservation[]>();
  for (const r of res) if (r.status === "reserved" || r.status === "sold") by.set(r.customer.id, [...(by.get(r.customer.id) ?? []), r]);
  return rows.map((c) => {
    const mine = by.get(c.id) ?? [];
    return {
      id: c.id,
      name: c.name,
      nic: c.nic,
      mobile: c.mobile,
      email: c.email,
      units: mine.map((r) => `${r.unit.projectName} · ${r.unit.code}`),
      overdue: mine.some((r) => r.payments.some((p) => isOverdue(p, today))),
      createdAt: c.createdAt.toISOString(),
    };
  });
}

export async function getCustomer(id: number): Promise<AdminCustomer | null> {
  const d = need();
  const [[c], reservations, docs] = await Promise.all([
    d.select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1),
    getReservations(id),
    d.select().from(schema.customerDocuments).where(eq(schema.customerDocuments.customerId, id)).orderBy(desc(schema.customerDocuments.createdAt)),
  ]);
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    nic: c.nic,
    mobile: c.mobile,
    email: c.email,
    address: c.address,
    notes: c.notes,
    leadId: c.leadId,
    createdAt: c.createdAt.toISOString(),
    reservations,
    documents: docs.map((x) => ({ id: x.id, name: x.name, format: x.format, bytes: x.bytes, uploadedBy: x.uploadedBy, createdAt: x.createdAt.toISOString() })),
  };
}
