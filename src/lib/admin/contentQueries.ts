import "server-only";
import { asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { FloorPlanRow, MediaRow, PlanRoom, TourRow, TourSceneRow } from "@/db/schema";
import type { AdminMedia, AdminPlan, AdminScene, AdminTour, MediaUse } from "./types";

/** Media library, floor plans and 360° tours reads for the console. Never cached; pages call requireAdmin() first. */

function need() {
  if (!db) throw new Error("DATABASE_URL is not configured");
  return db;
}

export function toAdminMedia(r: MediaRow, used: MediaUse[] = []): AdminMedia {
  return {
    id: r.id,
    publicId: r.publicId,
    resourceType: r.resourceType,
    kind: r.kind,
    folder: r.folder,
    name: r.name,
    format: r.format,
    bytes: r.bytes,
    width: r.width,
    height: r.height,
    duration: r.duration,
    pages: r.pages,
    url: r.url,
    alt: r.alt,
    uploadedBy: r.uploadedBy,
    createdAt: r.createdAt.toISOString(),
    used,
  };
}

/** Where each file is used: floor plans, tour covers and tour scenes. */
export async function mediaUsage(ids?: number[]) {
  const d = need();
  const only = <T extends { mediaId: number | null }>(rows: T[]) => (ids ? rows.filter((r) => r.mediaId != null && ids.includes(r.mediaId)) : rows);
  const [plans, covers, scenes] = await Promise.all([
    d
      .select({ mediaId: schema.floorPlans.mediaId, type: schema.floorPlans.type, label: schema.floorPlans.label, slug: schema.floorPlans.projectSlug, name: schema.projects.name })
      .from(schema.floorPlans)
      .innerJoin(schema.projects, eq(schema.projects.slug, schema.floorPlans.projectSlug))
      .where(isNotNull(schema.floorPlans.mediaId)),
    d.select({ mediaId: schema.tours.coverMediaId, id: schema.tours.id, title: schema.tours.title }).from(schema.tours).where(isNotNull(schema.tours.coverMediaId)),
    d
      .select({ mediaId: schema.tourScenes.mediaId, tourId: schema.tourScenes.tourId, name: schema.tourScenes.name, title: schema.tours.title })
      .from(schema.tourScenes)
      .innerJoin(schema.tours, eq(schema.tours.id, schema.tourScenes.tourId))
      .where(isNotNull(schema.tourScenes.mediaId)),
  ]);
  const map = new Map<number, MediaUse[]>();
  const add = (id: number | null, u: MediaUse) => id != null && (map.get(id) ?? map.set(id, []).get(id)!).push(u);
  for (const p of only(plans)) add(p.mediaId, { kind: "plan", label: `Floor plan · ${p.name} ${p.type}`, href: `/admin/floor-plans?project=${p.slug}&type=${encodeURIComponent(p.type)}` });
  for (const c of only(covers)) add(c.mediaId, { kind: "tour", label: `Tour cover · ${c.title}`, href: `/admin/tours/${c.id}` });
  for (const s of only(scenes)) add(s.mediaId, { kind: "scene", label: `Tour · ${s.title} · ${s.name}`, href: `/admin/tours/${s.tourId}` });
  return map;
}

export async function getMedia(): Promise<AdminMedia[]> {
  const [rows, used] = await Promise.all([need().select().from(schema.media).orderBy(desc(schema.media.createdAt)).limit(5000), mediaUsage()]);
  return rows.map((r) => toAdminMedia(r, used.get(r.id)));
}

export async function getMediaByIds(ids: number[]) {
  if (!ids.length) return [];
  const [rows, used] = await Promise.all([need().select().from(schema.media).where(inArray(schema.media.id, ids)), mediaUsage(ids)]);
  return rows.map((r) => toAdminMedia(r, used.get(r.id)));
}

/* ───────── Floor plans ───────── */

export async function getPlanProjects() {
  return need().select({ slug: schema.projects.slug, name: schema.projects.name }).from(schema.projects).orderBy(asc(schema.projects.sort), asc(schema.projects.name));
}

function toAdminPlan(r: FloorPlanRow, m: MediaRow | null, units: AdminPlan["units"], tourId: string | null): AdminPlan {
  return {
    ...r,
    rooms: r.rooms ?? [],
    updatedAt: r.updatedAt.toISOString(),
    media: m ? { id: m.id, url: m.url, kind: m.kind, name: m.name, format: m.format, width: m.width, height: m.height, pages: m.pages, bytes: m.bytes } : null,
    units,
    tourId,
  };
}

export async function getAdminPlans(slug: string): Promise<{ plans: AdminPlan[]; inventoryTypes: string[] }> {
  const d = need();
  const [rows, counts, tours] = await Promise.all([
    d.select({ plan: schema.floorPlans, media: schema.media }).from(schema.floorPlans).leftJoin(schema.media, eq(schema.media.id, schema.floorPlans.mediaId)).where(eq(schema.floorPlans.projectSlug, slug)).orderBy(asc(schema.floorPlans.sort), asc(schema.floorPlans.type)),
    d
      .select({ type: schema.units.type, status: schema.units.status, n: sql<number>`count(*)::int` })
      .from(schema.units)
      .where(eq(schema.units.projectSlug, slug))
      .groupBy(schema.units.type, schema.units.status),
    d.select({ id: schema.tours.id, type: schema.tours.type, published: schema.tours.published }).from(schema.tours).where(eq(schema.tours.projectSlug, slug)),
  ]);
  const byType = new Map<string, AdminPlan["units"]>();
  for (const c of counts) {
    const u = byType.get(c.type) ?? { A: 0, R: 0, S: 0, B: 0, total: 0 };
    u[c.status] += c.n;
    u.total += c.n;
    byType.set(c.type, u);
  }
  return {
    plans: rows.map(({ plan, media }) =>
      toAdminPlan(plan, media, byType.get(plan.type) ?? { A: 0, R: 0, S: 0, B: 0, total: 0 }, tours.find((t) => t.type === plan.type && t.published)?.id ?? tours.find((t) => t.type === plan.type)?.id ?? null),
    ),
    inventoryTypes: [...byType.keys()].sort(),
  };
}

/* ───────── Tours ───────── */

export function toAdminScene(s: TourSceneRow): AdminScene {
  return {
    key: s.key,
    name: s.name,
    short: s.short,
    note: s.note,
    panorama: s.panorama,
    thumb: s.thumb,
    mediaId: s.mediaId,
    yaw: s.yaw,
    rot: s.rot,
    planX: s.planX,
    planY: s.planY,
    planRot: s.planRot,
    hotspots: s.hotspots ?? [],
  };
}

function toAdminTour(t: TourRow, projectName: string, coverUrl: string | null, scenes: TourSceneRow[]): AdminTour {
  return {
    id: t.id,
    projectSlug: t.projectSlug,
    projectName,
    type: t.type,
    unitRef: t.unitRef,
    title: t.title,
    source: t.source,
    embedUrl: t.embedUrl,
    coverMediaId: t.coverMediaId,
    coverUrl,
    bedrooms: t.bedrooms,
    bathrooms: t.bathrooms,
    parking: t.parking,
    planRooms: t.planRooms ?? [],
    published: t.published,
    updatedAt: t.updatedAt.toISOString(),
    scenes: scenes.map(toAdminScene),
  };
}

export async function getAdminTours(): Promise<AdminTour[]> {
  const d = need();
  const [rows, scenes] = await Promise.all([
    d
      .select({ tour: schema.tours, projectName: schema.projects.name, coverUrl: schema.media.url })
      .from(schema.tours)
      .innerJoin(schema.projects, eq(schema.projects.slug, schema.tours.projectSlug))
      .leftJoin(schema.media, eq(schema.media.id, schema.tours.coverMediaId))
      .orderBy(asc(schema.projects.sort), asc(schema.tours.title)),
    d.select().from(schema.tourScenes).orderBy(asc(schema.tourScenes.sort), asc(schema.tourScenes.id)),
  ]);
  return rows.map((r) => toAdminTour(r.tour, r.projectName, r.coverUrl, scenes.filter((s) => s.tourId === r.tour.id)));
}

export async function getAdminTour(id: string): Promise<AdminTour | null> {
  const d = need();
  const [row] = await d
    .select({ tour: schema.tours, projectName: schema.projects.name, coverUrl: schema.media.url })
    .from(schema.tours)
    .innerJoin(schema.projects, eq(schema.projects.slug, schema.tours.projectSlug))
    .leftJoin(schema.media, eq(schema.media.id, schema.tours.coverMediaId))
    .where(eq(schema.tours.id, id))
    .limit(1);
  if (!row) return null;
  const scenes = await d.select().from(schema.tourScenes).where(eq(schema.tourScenes.tourId, id)).orderBy(asc(schema.tourScenes.sort), asc(schema.tourScenes.id));
  return toAdminTour(row.tour, row.projectName, row.coverUrl, scenes);
}

/** Unit types and refs per project, for the tour settings pickers. */
export async function getTourTargets() {
  const d = need();
  const [plans, units] = await Promise.all([
    d.select({ slug: schema.floorPlans.projectSlug, type: schema.floorPlans.type, label: schema.floorPlans.label, rooms: schema.floorPlans.rooms }).from(schema.floorPlans).orderBy(asc(schema.floorPlans.sort)),
    d.selectDistinct({ slug: schema.units.projectSlug, type: schema.units.type }).from(schema.units),
  ]);
  const out: Record<string, { type: string; label: string; rooms: PlanRoom[] }[]> = {};
  for (const p of plans) (out[p.slug] ??= []).push({ type: p.type, label: p.label, rooms: (p.rooms ?? []).map((r) => ({ name: r.name, w: r.w, l: r.l })) });
  for (const u of units) if (!(out[u.slug] ??= []).some((x) => x.type === u.type)) out[u.slug].push({ type: u.type, label: "", rooms: [] });
  return out;
}

/** "A-14B" refs and their types for one project, for the tour's sample-unit picker. */
export async function getUnitRefs(slug: string) {
  const rows = await need()
    .select({ tower: schema.units.tower, code: schema.units.code, type: schema.units.type })
    .from(schema.units)
    .where(eq(schema.units.projectSlug, slug))
    .orderBy(asc(schema.units.tower), desc(schema.units.floor), asc(schema.units.letter));
  return rows.map((r) => ({ ref: `${r.tower}-${r.code}`, type: r.type }));
}

/** 360° panoramas and photos in the library, for the tour editor's pickers. */
export async function getMediaOfKinds(kinds: ("image" | "360")[]) {
  const rows = await need().select().from(schema.media).where(inArray(schema.media.kind, kinds)).orderBy(desc(schema.media.createdAt)).limit(500);
  return rows.map((r) => toAdminMedia(r));
}
