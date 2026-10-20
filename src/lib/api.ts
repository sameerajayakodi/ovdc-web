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
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { inventory as sampleInventory, unitTypes } from "./data/inventory";
import { projects as sampleProjects } from "./data/projects";
import { featuredUnits } from "./data/content";
import { tours } from "./data/tours";
import { TAGS } from "./cacheTags";
import { parseUnitRef, unitRef } from "./unitRef";
import type { Floor, Project, Unit, UnitType, Tour } from "./types";
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

export async function getUnitTypes(slug: string): Promise<UnitType[]> {
  return unitTypes[slug] ?? [];
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

export async function getTours(): Promise<Tour[]> {
  return tours;
}

export async function getTour(id: string): Promise<Tour | null> {
  return tours.find((t) => t.id === id) ?? null;
}

/** The 360° tour published for a unit's layout, if any. */
export async function getTourForType(slug: string, type: string): Promise<Tour | null> {
  const t = (unitTypes[slug] ?? []).find((x) => x.type === type);
  return t?.tourId ? getTour(t.tourId) : null;
}

export async function getProjectContent(slug: string) {
  const { projectContent } = await import("./data/projectContent");
  return projectContent[slug] ?? null;
}
