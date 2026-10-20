/**
 * Data access for the public website.
 *
 * Every page reads through these functions, never from ./data directly, so
 * switching to the admin backend later only means replacing the bodies here
 * with fetch() calls (and adding `"use cache"` + cacheLife where it fits).
 */
import { inventory, unitTypes } from "./data/inventory";
import { projects } from "./data/projects";
import { featuredUnits } from "./data/content";
import { tours } from "./data/tours";
import type { Floor, Project, Unit, UnitType, Tour } from "./types";

function withLiveAvailability(p: Project): Project {
  const towers = inventory[p.slug];
  if (!towers) return p;
  const available = Object.values(towers).reduce(
    (n, floors) => n + floors.reduce((m, f) => m + f.available, 0),
    0,
  );
  return { ...p, available };
}

export async function getProjects(): Promise<Project[]> {
  return projects.map(withLiveAvailability);
}

export async function getProject(slug: string): Promise<Project | null> {
  const p = projects.find((x) => x.slug === slug);
  return p ? withLiveAvailability(p) : null;
}

export async function getTowers(slug: string): Promise<Record<string, Floor[]> | null> {
  return inventory[slug] ?? null;
}

export async function getUnitTypes(slug: string): Promise<UnitType[]> {
  return unitTypes[slug] ?? [];
}

/** Unit reference format: "<tower>-<floor><letter>", e.g. "A-14B". */
export function parseUnitRef(ref: string) {
  const m = /^([A-Z])-(\d+)([A-Z])$/.exec(ref.toUpperCase());
  return m ? { tower: m[1], id: `${m[2]}${m[3]}` } : null;
}

export function unitRef(u: Pick<Unit, "tower" | "id">) {
  return `${u.tower}-${u.id}`;
}

export async function getUnit(slug: string, ref: string): Promise<Unit | null> {
  const parsed = parseUnitRef(ref);
  const towers = inventory[slug];
  if (!parsed || !towers?.[parsed.tower]) return null;
  for (const fl of towers[parsed.tower]) {
    const u = fl.units.find((x) => x.id === parsed.id);
    if (u) return u;
  }
  return null;
}

export async function getAllUnitRefs(): Promise<{ slug: string; unit: string }[]> {
  return Object.entries(inventory).flatMap(([slug, towers]) =>
    Object.values(towers).flatMap((floors) =>
      floors.flatMap((f) => f.units.map((u) => ({ slug, unit: unitRef(u) }))),
    ),
  );
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
