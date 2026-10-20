import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, ne, notInArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { LeadRow, VisitRow } from "@/db/schema";
import { DEFAULT_CAPACITY, GALLERY, SALES_KINDS, VIDEO, at, ymdOf, addDays } from "./crm";
import type { AdminLead, AdminVisit, LeadDetail, LeadEvent } from "./types";

/** Leads & site visits reads. Never cached; every page calls requireAdmin() first. */

function need() {
  if (!db) throw new Error("DATABASE_URL is not configured");
  return db;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toAdminLead(r: LeadRow, extra: { nextVisit?: string | null; dupes?: number[] } = {}): AdminLead {
  return {
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    kind: r.kind,
    source: r.source,
    stage: r.stage,
    name: r.name,
    mobile: r.mobile,
    phoneKey: r.phoneKey,
    email: r.email,
    project: r.project,
    unit: r.unit,
    interest: r.interest,
    budget: r.budget,
    message: r.message,
    url: r.url,
    page: r.page,
    visitDate: r.visitDate,
    visitSlot: r.visitSlot,
    visitType: r.visitType,
    agent: r.agent,
    followUpAt: iso(r.followUpAt),
    respondedAt: iso(r.respondedAt),
    lostReason: r.lostReason,
    nextVisit: extra.nextVisit ?? null,
    dupes: extra.dupes ?? [],
  };
}

const visitCols = {
  visit: schema.visits,
  name: schema.leads.name,
  mobile: schema.leads.mobile,
  email: schema.leads.email,
  stage: schema.leads.stage,
};

function toAdminVisit(r: { visit: VisitRow; name: string; mobile: string; email: string; stage: AdminVisit["stage"] }): AdminVisit {
  const v = r.visit;
  return {
    id: v.id,
    leadId: v.leadId,
    startsAt: v.startsAt.toISOString(),
    durationMin: v.durationMin,
    type: v.type,
    location: v.location,
    project: v.project,
    party: v.party,
    agent: v.agent,
    status: v.status,
    note: v.note,
    bookedBy: v.bookedBy,
    createdAt: v.createdAt.toISOString(),
    name: r.name,
    mobile: r.mobile,
    email: r.email,
    stage: r.stage,
  };
}

/** Groups leads that share a phone number or email. */
function duplicateMap(rows: Pick<LeadRow, "id" | "phoneKey" | "email">[]) {
  const by = new Map<string, number[]>();
  for (const r of rows) {
    if (r.phoneKey) (by.get(`p:${r.phoneKey}`) ?? by.set(`p:${r.phoneKey}`, []).get(`p:${r.phoneKey}`)!).push(r.id);
    if (r.email) (by.get(`e:${r.email}`) ?? by.set(`e:${r.email}`, []).get(`e:${r.email}`)!).push(r.id);
  }
  const out = new Map<number, Set<number>>();
  for (const ids of by.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      const s = out.get(id) ?? new Set();
      for (const o of ids) if (o !== id) s.add(o);
      out.set(id, s);
    }
  }
  return out;
}

const OPEN_VISIT = ["cancelled", "completed", "no-show"] as const;

export async function getLeads(): Promise<AdminLead[]> {
  const d = need();
  const [rows, upcoming] = await Promise.all([
    d.select().from(schema.leads).orderBy(desc(schema.leads.createdAt)).limit(5000),
    d
      .select({ leadId: schema.visits.leadId, startsAt: schema.visits.startsAt })
      .from(schema.visits)
      .where(and(gte(schema.visits.startsAt, new Date(Date.now() - 2 * 3_600_000)), notInArray(schema.visits.status, [...OPEN_VISIT])))
      .orderBy(asc(schema.visits.startsAt)),
  ]);
  const next = new Map<number, string>();
  for (const v of upcoming) if (!next.has(v.leadId)) next.set(v.leadId, v.startsAt.toISOString());
  const dupes = duplicateMap(rows);
  return rows.map((r) => toAdminLead(r, { nextVisit: next.get(r.id) ?? null, dupes: [...(dupes.get(r.id) ?? [])] }));
}

export async function getLeadDetail(id: number): Promise<LeadDetail | null> {
  const d = need();
  const [row] = await d.select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
  if (!row) return null;
  const match = [
    ...(row.phoneKey ? [eq(schema.leads.phoneKey, row.phoneKey)] : []),
    ...(row.email ? [eq(schema.leads.email, row.email)] : []),
  ];
  const [events, visits, dupes] = await Promise.all([
    d.select().from(schema.leadEvents).where(eq(schema.leadEvents.leadId, id)).orderBy(desc(schema.leadEvents.at), desc(schema.leadEvents.id)).limit(200),
    d.select(visitCols).from(schema.visits).innerJoin(schema.leads, eq(schema.leads.id, schema.visits.leadId)).where(eq(schema.visits.leadId, id)).orderBy(desc(schema.visits.startsAt)),
    match.length
      ? d
          .select({ id: schema.leads.id, name: schema.leads.name, source: schema.leads.source, createdAt: schema.leads.createdAt, kind: schema.leads.kind })
          .from(schema.leads)
          .where(and(ne(schema.leads.id, id), or(...match)))
          .orderBy(asc(schema.leads.createdAt))
      : Promise.resolve([]),
  ]);
  const now = Date.now();
  const nextVisit = visits
    .map((v) => v.visit)
    .filter((v) => v.startsAt.getTime() > now - 2 * 3_600_000 && !(OPEN_VISIT as readonly string[]).includes(v.status))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
  return {
    lead: toAdminLead(row, { nextVisit: nextVisit ? nextVisit.startsAt.toISOString() : null, dupes: dupes.map((x) => x.id) }),
    events: events.map((e): LeadEvent => ({ id: e.id, at: e.at.toISOString(), actor: e.actor, type: e.type, text: e.text })),
    visits: visits.map(toAdminVisit),
    dupes: dupes.map((x) => ({ ...x, createdAt: x.createdAt.toISOString() })),
  };
}

/** Visits starting in [from, to). */
export async function getVisits(from: number, to: number): Promise<AdminVisit[]> {
  const rows = await need()
    .select(visitCols)
    .from(schema.visits)
    .innerJoin(schema.leads, eq(schema.leads.id, schema.visits.leadId))
    .where(and(gte(schema.visits.startsAt, new Date(from)), lt(schema.visits.startsAt, new Date(to))))
    .orderBy(asc(schema.visits.startsAt));
  return rows.map(toAdminVisit);
}

export async function getVisit(id: number): Promise<AdminVisit | null> {
  const [row] = await need().select(visitCols).from(schema.visits).innerJoin(schema.leads, eq(schema.leads.id, schema.visits.leadId)).where(eq(schema.visits.id, id)).limit(1);
  return row ? toAdminVisit(row) : null;
}

export const CAPACITY_KEY = "visit_capacity";

/** Visitors per hour each location can host. */
export async function getCapacity(): Promise<Record<string, number>> {
  const d = need();
  const [[row], locs] = await Promise.all([
    d.select().from(schema.settings).where(eq(schema.settings.key, CAPACITY_KEY)).limit(1),
    d.selectDistinct({ l: schema.visits.location }).from(schema.visits),
  ]);
  const stored = (row?.value ?? {}) as Record<string, number>;
  const out: Record<string, number> = { [GALLERY]: DEFAULT_CAPACITY };
  for (const { l } of locs) out[l] = DEFAULT_CAPACITY;
  out[VIDEO] = DEFAULT_CAPACITY;
  for (const [k, v] of Object.entries(stored)) if (Number.isInteger(v) && v > 0) out[k] = v;
  return out;
}

/** Names already used for agents, for the assign pickers. */
export async function getAgents(): Promise<string[]> {
  const d = need();
  const [a, b] = await Promise.all([
    d.selectDistinct({ n: schema.leads.agent }).from(schema.leads).where(ne(schema.leads.agent, "")),
    d.selectDistinct({ n: schema.visits.agent }).from(schema.visits).where(ne(schema.visits.agent, "")),
  ]);
  return [...new Set([...a, ...b].map((x) => x.n))].sort((x, y) => x.localeCompare(y));
}

/** Leads to pick from when booking a visit in the console. */
export async function getLeadOptions() {
  const rows = await need()
    .select({ id: schema.leads.id, name: schema.leads.name, mobile: schema.leads.mobile, project: schema.leads.project, stage: schema.leads.stage })
    .from(schema.leads)
    .where(and(inArray(schema.leads.kind, SALES_KINDS), notInArray(schema.leads.stage, ["won", "lost"])))
    .orderBy(desc(schema.leads.createdAt))
    .limit(800);
  return rows;
}

/** Numbers for the dashboard tiles. */
export async function getCrmStats() {
  const d = need();
  const now = Date.now();
  const today = ymdOf(now);
  const sales = inArray(schema.leads.kind, SALES_KINDS);
  const [[leads], [visits]] = await Promise.all([
    d
      .select({
        fresh: sql<number>`count(*) filter (where ${schema.leads.stage} = 'new')::int`,
        week: sql<number>`count(*) filter (where ${schema.leads.createdAt} >= ${new Date(now - 7 * 86_400_000)})::int`,
        overdue: sql<number>`count(*) filter (where ${schema.leads.followUpAt} < ${new Date(now)} and ${schema.leads.stage} not in ('won', 'lost'))::int`,
      })
      .from(schema.leads)
      .where(sales),
    d
      .select({ today: sql<number>`count(*)::int` })
      .from(schema.visits)
      .where(and(gte(schema.visits.startsAt, new Date(at(today))), lt(schema.visits.startsAt, new Date(at(addDays(today, 1)))), ne(schema.visits.status, "cancelled"))),
  ]);
  return { newLeads: leads.fresh, weekLeads: leads.week, overdue: leads.overdue, visitsToday: visits.today };
}
