import "server-only";
import { asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ActivityItem, AdminProject, AdminUnit, PricePoint } from "./types";
import type { ProjectRow, UnitRow } from "@/db/schema";

/**
 * Admin reads. Always fresh (never cached) — the console must show what is in
 * the database right now. Each page calls requireAdmin() before these.
 */

export function hasDb() {
  return db != null;
}

function need() {
  if (!db) throw new Error("DATABASE_URL is not configured");
  return db;
}

export function toAdminUnit(r: UnitRow): AdminUnit {
  return {
    id: r.id,
    tower: r.tower,
    floor: r.floor,
    letter: r.letter,
    code: r.code,
    type: r.type,
    beds: r.beds,
    label: r.label,
    baths: r.baths,
    sqft: r.sqft,
    balcony: r.balcony,
    facing: r.facing,
    view: r.view,
    status: r.status,
    priceMn: r.priceMn,
    note: r.note,
    updatedAt: r.updatedAt.toISOString(),
  };
}

function toAdminProject(r: ProjectRow, inv: AdminProject["inventory"]): AdminProject {
  return { ...r, updatedAt: r.updatedAt.toISOString(), inventory: inv };
}

async function inventoryCounts() {
  const rows = await need()
    .select({ slug: schema.units.projectSlug, status: schema.units.status, n: sql<number>`count(*)::int` })
    .from(schema.units)
    .groupBy(schema.units.projectSlug, schema.units.status);
  const map = new Map<string, NonNullable<AdminProject["inventory"]>>();
  for (const r of rows) {
    const c = map.get(r.slug) ?? { A: 0, R: 0, S: 0, B: 0, total: 0 };
    c[r.status] += r.n;
    c.total += r.n;
    map.set(r.slug, c);
  }
  return map;
}

export async function getAdminProjects(): Promise<AdminProject[]> {
  const [rows, counts] = await Promise.all([
    need().select().from(schema.projects).orderBy(asc(schema.projects.sort), asc(schema.projects.name)),
    inventoryCounts(),
  ]);
  return rows.map((r) => toAdminProject(r, counts.get(r.slug) ?? null));
}

export async function getAdminProject(slug: string): Promise<AdminProject | null> {
  const [row] = await need().select().from(schema.projects).where(eq(schema.projects.slug, slug)).limit(1);
  if (!row) return null;
  const counts = await inventoryCounts();
  return toAdminProject(row, counts.get(slug) ?? null);
}

export async function getInventoryProjects() {
  const rows = await need()
    .selectDistinct({ slug: schema.units.projectSlug, name: schema.projects.name, sort: schema.projects.sort })
    .from(schema.units)
    .innerJoin(schema.projects, eq(schema.projects.slug, schema.units.projectSlug))
    .orderBy(asc(schema.projects.sort));
  return rows.map(({ slug, name }) => ({ slug, name }));
}

export async function getAdminUnits(slug: string) {
  const d = need();
  const rows = await d
    .select()
    .from(schema.units)
    .where(eq(schema.units.projectSlug, slug))
    .orderBy(asc(schema.units.tower), desc(schema.units.floor), asc(schema.units.letter));
  const ids = rows.map((r) => r.id);
  const history = ids.length
    ? await d.select().from(schema.priceHistory).where(inArray(schema.priceHistory.unitId, ids)).orderBy(desc(schema.priceHistory.changedAt))
    : [];
  const byUnit: Record<number, PricePoint[]> = {};
  for (const h of history) {
    const list = (byUnit[h.unitId] ??= []);
    if (list.length < 6) list.push({ priceMn: h.priceMn, previousMn: h.previousMn, changedBy: h.changedBy, changedAt: h.changedAt.toISOString() });
  }
  return { units: rows.map(toAdminUnit), history: byUnit };
}

export async function getActivity(limit = 50, entity?: ActivityItem["entity"]): Promise<ActivityItem[]> {
  const q = need().select().from(schema.activity);
  const rows = await (entity ? q.where(eq(schema.activity.entity, entity)) : q).orderBy(desc(schema.activity.at)).limit(limit);
  return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
}

/** Everything the dashboard shows, from live inventory and the activity log. */
export async function getDashboard() {
  const d = need();
  const [projects, units, activity] = await Promise.all([
    getAdminProjects(),
    d
      .select({
        slug: schema.units.projectSlug,
        tower: schema.units.tower,
        type: schema.units.type,
        label: schema.units.label,
        status: schema.units.status,
        priceMn: schema.units.priceMn,
        sqft: schema.units.sqft,
        updatedAt: schema.units.updatedAt,
      })
      .from(schema.units),
    // Content changes only; sign-ins live on the Activity log page.
    need().select().from(schema.activity).where(ne(schema.activity.entity, "auth")).orderBy(desc(schema.activity.at)).limit(7),
  ]);
  return {
    projects,
    units: units.map((u) => ({ ...u, updatedAt: u.updatedAt.toISOString() })),
    activity: activity.map((r) => ({ ...r, at: r.at.toISOString() })),
  };
}
