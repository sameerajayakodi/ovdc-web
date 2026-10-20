/**
 * Data access for the public website.
 *
 * Every page reads through these functions, never from the database or
 * ./data directly. Projects and inventory come from Neon (edited in /admin);
 * reads are cached with `"use cache"` and tagged so an admin change shows up
 * on the next request (see src/app/admin/actions). Without DATABASE_URL the
 * site falls back to the sample data in ./data.
 */
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { inventory as sampleInventory, unitTypes } from "./data/inventory";
import { projects as sampleProjects } from "./data/projects";
import { featuredUnits } from "./data/content";
import { tours as sampleTours } from "./data/tours";
import { cld, isCloudinary, panoUrl } from "./mediaUrl";
import { TAGS } from "./cacheTags";
import { parseUnitRef, unitRef } from "./unitRef";
import type { Floor, Project, Unit, UnitType, Tour, TourScene } from "./types";
import type { ProjectRow, UnitRow } from "@/db/schema";

export { parseUnitRef, unitRef };

type Towers = Record<string, Floor[]>;

/** Groups unit rows into towers → floors (top floor first), as the explorer expects. */
export function toTowers(rows: Pick<UnitRow, keyof Omit<UnitRow, "id" | "projectSlug" | "note" | "updatedAt">>[]): Towers {
  const towers: Record<string, Map<number, Unit[]>> = {};
  for (const r of rows) {
    const floors = (towers[r.tower] ??= new Map());
    const list = floors.get(r.floor) ?? [];
    list.push({
      u: r.letter,
      id: r.code,
      tower: r.tower,
      floor: r.floor,
      type: r.type,
      beds: r.beds,
      label: r.label,
      baths: r.baths,
      sqft: r.sqft,
      balcony: r.balcony,
      facing: r.facing,
      view: r.view,
      status: r.status,
      price: r.priceMn,
    });
    floors.set(r.floor, list);
  }
  const out: Towers = {};
  for (const t of Object.keys(towers).sort()) {
    out[t] = [...towers[t].entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([n, units]) => {
        units.sort((a, b) => a.u.localeCompare(b.u));
        const avail = units.filter((u) => u.status === "A");
        return { n, units, available: avail.length, from: avail.length ? Math.min(...avail.map((u) => u.price)) : Infinity };
      });
  }
  return out;
}

function toProject(r: ProjectRow, available: number | undefined): Project {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    loc: r.loc,
    address: r.address,
    type: r.type,
    status: r.status,
    from: r.fromMn,
    tour: r.tour,
    explorer: r.explorer,
    progress: r.progress,
    completion: r.completion,
    uda: r.uda,
    units: r.units,
    floors: r.floors,
    towers: r.towers,
    beds: r.beds,
    available: available ?? r.availableManual,
    lat: r.lat,
    lng: r.lng,
    blurb: r.blurb,
  };
}

/** Published projects with live availability from the unit inventory. */
async function loadProjects(): Promise<Project[]> {
  "use cache";
  cacheTag(TAGS.projects, TAGS.inventory);
  cacheLife("hours");

  if (!db) {
    return sampleProjects.map((p) => {
      const towers = sampleInventory[p.slug];
      if (!towers) return p;
      const available = Object.values(towers).reduce((n, fl) => n + fl.reduce((m, f) => m + f.available, 0), 0);
      return { ...p, available };
    });
  }

  const [rows, counts] = await Promise.all([
    db.select().from(schema.projects).where(eq(schema.projects.published, true)).orderBy(asc(schema.projects.sort), asc(schema.projects.name)),
    db.select({ slug: schema.units.projectSlug, status: schema.units.status }).from(schema.units),
  ]);
  const avail = new Map<string, number>();
  for (const c of counts) avail.set(c.slug, (avail.get(c.slug) ?? 0) + (c.status === "A" ? 1 : 0));
  return rows.map((r) => toProject(r, avail.get(r.slug)));
}

export async function getProjects(): Promise<Project[]> {
  return loadProjects();
}

export async function getProject(slug: string): Promise<Project | null> {
  return (await loadProjects()).find((x) => x.slug === slug) ?? null;
}

export async function getTowers(slug: string): Promise<Towers | null> {
  "use cache";
  cacheTag(TAGS.inventory, TAGS.inventoryOf(slug));
  cacheLife("hours");

  if (!db) return sampleInventory[slug] ?? null;
  const rows = await db.select().from(schema.units).where(eq(schema.units.projectSlug, slug));
  return rows.length ? toTowers(rows) : null;
}

const fmt = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

/** Unit layouts with room sizes and plan drawings (admin: Floor plans). */
export async function getUnitTypes(slug: string): Promise<UnitType[]> {
  "use cache";
  cacheTag(TAGS.plans, TAGS.plansOf(slug), TAGS.tours);
  cacheLife("hours");

  if (!db) return unitTypes[slug] ?? [];
  const [rows, published] = await Promise.all([
    db
      .select({ plan: schema.floorPlans, url: schema.media.url, kind: schema.media.kind })
      .from(schema.floorPlans)
      .leftJoin(schema.media, eq(schema.media.id, schema.floorPlans.mediaId))
      .where(eq(schema.floorPlans.projectSlug, slug))
      .orderBy(asc(schema.floorPlans.sort), asc(schema.floorPlans.type)),
    db.select({ id: schema.tours.id, type: schema.tours.type }).from(schema.tours).where(and(eq(schema.tours.projectSlug, slug), eq(schema.tours.published, true))),
  ]);
  return rows.map(({ plan: p, url, kind }) => ({
    key: p.key,
    type: p.type,
    label: p.label,
    sqft: p.sqft,
    balcony: p.balcony,
    facing: p.facing,
    view: p.view,
    rooms: (p.rooms ?? []).map((r) => ({ name: r.name, dim: `${fmt(r.w)} × ${fmt(r.l)} m` })),
    tourId: published.find((t) => t.type === p.type)?.id,
    planImage: url ? (kind === "pdf" ? cld(url, "pg_1,f_auto,q_auto,w_1600,c_limit").replace(/\.pdf$/i, ".jpg") : cld(url, "f_auto,q_auto,w_1600,c_limit")) : undefined,
    planPdf: url && kind === "pdf" ? url : undefined,
  }));
}

export async function getUnit(slug: string, ref: string): Promise<Unit | null> {
  const parsed = parseUnitRef(ref);
  const towers = await getTowers(slug);
  if (!parsed || !towers?.[parsed.tower]) return null;
  for (const fl of towers[parsed.tower]) {
    const u = fl.units.find((x) => x.id === parsed.id);
    if (u) return u;
  }
  return null;
}

export async function getAllUnitRefs(): Promise<{ slug: string; unit: string }[]> {
  const projects = await getProjects();
  const out: { slug: string; unit: string }[] = [];
  for (const p of projects) {
    if (!p.explorer) continue;
    const towers = await getTowers(p.slug);
    if (!towers) continue;
    for (const floors of Object.values(towers)) for (const f of floors) for (const u of f.units) out.push({ slug: p.slug, unit: unitRef(u) });
  }
  return out;
}

export async function getFeaturedUnits(): Promise<(Unit & { projectSlug: string; projectName: string })[]> {
  const out = [];
  for (const f of featuredUnits) {
    const [u, p] = await Promise.all([getUnit(f.projectSlug, f.unitRef), getProject(f.projectSlug)]);
    if (u && p) out.push({ ...u, projectSlug: p.slug, projectName: p.name });
  }
  return out;
}

/** Builds published tours (all, or one by id) with price and status from the live inventory. */
async function loadTours(id?: string): Promise<Tour[]> {
  if (!db) return id ? sampleTours.filter((t) => t.id === id) : sampleTours;
  const only = id ? [eq(schema.tours.id, id)] : [];
  const [rows, scenes, plans] = await Promise.all([
    db
      .select({ tour: schema.tours, project: { name: schema.projects.name, loc: schema.projects.loc }, cover: schema.media.url })
      .from(schema.tours)
      .innerJoin(schema.projects, eq(schema.projects.slug, schema.tours.projectSlug))
      .leftJoin(schema.media, eq(schema.media.id, schema.tours.coverMediaId))
      .where(and(eq(schema.tours.published, true), eq(schema.projects.published, true), ...only))
      .orderBy(asc(schema.projects.sort), asc(schema.tours.title)),
    db
      .select()
      .from(schema.tourScenes)
      .where(id ? eq(schema.tourScenes.tourId, id) : undefined)
      .orderBy(asc(schema.tourScenes.sort), asc(schema.tourScenes.id)),
    db.select().from(schema.floorPlans),
  ]);

  const out: Tour[] = [];
  for (const { tour: t, project, cover } of rows) {
    const sc = scenes.filter((x) => x.tourId === t.id);
    if (t.source === "pano" && !sc.length) continue;
    if (t.source === "embed" && !t.embedUrl) continue;
    const unit = t.unitRef ? await getUnit(t.projectSlug, t.unitRef) : null;
    const plan = plans.find((p) => p.projectSlug === t.projectSlug && p.type === t.type);
    const interior = unit?.sqft ?? plan?.sqft ?? 0;
    const price = unit?.price ?? 0;
    const sceneList: TourScene[] = sc.map((x) => ({
      id: x.key,
      name: x.name,
      short: x.short || x.name,
      note: x.note,
      plan: [x.planX, x.planY],
      rot: x.rot,
      yaw: x.yaw,
      pos: "50% 50%",
      panorama: panoUrl(x.panorama),
      thumb: x.thumb || (isCloudinary(x.panorama) ? cld(x.panorama, "c_fill,w_480,h_240,f_auto,q_auto") : x.panorama),
      hs: (x.hotspots ?? []).flatMap((h): TourScene["hs"] =>
        h.t === "nav"
          ? h.to && sc.some((o) => o.key === h.to)
            ? [{ t: "nav" as const, to: h.to, yaw: h.yaw, pitch: h.pitch }]
            : []
          : [{ t: "info" as const, id: h.id ?? `${x.key}-${h.yaw}`, yaw: h.yaw, pitch: h.pitch, kicker: h.kicker ?? "", title: h.title ?? "", body: h.body ?? "" }],
      ),
    }));
    out.push({
      id: t.id,
      projectSlug: t.projectSlug,
      projectName: project.name,
      projectLoc: project.loc,
      unitRef: t.unitRef,
      title: t.title,
      typeLabel: t.type,
      floorLabel: unit ? `Floor ${unit.floor}` : "",
      interior,
      terrace: unit?.balcony ?? plan?.balcony ?? 0,
      bedrooms: t.bedrooms || plan?.label || "",
      bathrooms: t.bathrooms || (unit ? String(unit.baths) : ""),
      price,
      pricePerSqft: price && interior ? Math.round((price * 1e6) / interior / 100) * 100 : 0,
      parking: t.parking,
      status: unit?.status ?? "A",
      panorama: sceneList[0]?.panorama ?? (cover ? cld(cover, "f_auto,q_auto,w_1600,c_limit") : ""),
      planRooms: t.planRooms ?? [],
      scenes: sceneList,
      ...(t.source === "embed" ? { embedUrl: t.embedUrl } : {}),
      ...(cover ? { cover: cld(cover, "f_auto,q_auto,w_1200,c_limit") } : {}),
    });
  }
  return out;
}

/** Published 360° tours (admin: 360° Tours). */
export async function getTours(): Promise<Tour[]> {
  "use cache";
  cacheTag(TAGS.tours, TAGS.inventory, TAGS.projects);
  cacheLife("hours");
  return loadTours();
}

/**
 * One tour, cached under its own id. Reading it from the getTours() list would
 * bake the build-time list into the /tours/[id] shell, so a tour published
 * later would 404 there.
 */
export async function getTour(id: string): Promise<Tour | null> {
  "use cache";
  cacheTag(TAGS.tours, TAGS.inventory, TAGS.projects);
  cacheLife("hours");
  return (await loadTours(id))[0] ?? null;
}

/** The 360° tour published for a unit's layout, if any. */
export async function getTourForType(slug: string, type: string): Promise<Tour | null> {
  return (await getTours()).find((t) => t.projectSlug === slug && t.typeLabel === type) ?? null;
}

export async function getProjectContent(slug: string) {
  const { projectContent } = await import("./data/projectContent");
  return projectContent[slug] ?? null;
}
