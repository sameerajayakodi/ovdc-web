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
import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { inventory as sampleInventory, unitTypes } from "./data/inventory";
import { projects as sampleProjects } from "./data/projects";
import { featuredUnits, company as sampleCompany, offices as sampleOffices, testimonials as sampleTestimonials } from "./data/content";
import { articles as sampleArticles, awards as sampleAwards, faqGroups as sampleFaq, roles as sampleRoles, type Article, type Role } from "./data/editorial";
import { photos, type Photo, type PhotoKey } from "./data/media";
import { FX } from "./money";
import { tours as sampleTours } from "./data/tours";
import { cld, isCloudinary, panoUrl } from "./mediaUrl";
import { TAGS } from "./cacheTags";
import { parseUnitRef, unitRef } from "./unitRef";
import type { Currency, Floor, Project, Unit, UnitType, Tour, TourScene } from "./types";
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

/* ───────── Website content (admin: Website content) ───────── */

export type SiteArticle = Article & { cover?: string };

const minutesOf = (body: { h?: string; p: string }[]) =>
  Math.max(1, Math.round(body.reduce((n, b) => n + `${b.h ?? ""} ${b.p}`.split(/\s+/).filter(Boolean).length, 0) / 200));

/** Published posts whose publish time has passed (one by slug, or all, newest first). */
async function loadArticles(slug?: string): Promise<SiteArticle[]> {
  if (!db) return slug ? sampleArticles.filter((a) => a.slug === slug) : sampleArticles;
  const rows = await db
    .select({ post: schema.posts, cover: schema.media.url })
    .from(schema.posts)
    .leftJoin(schema.media, eq(schema.media.id, schema.posts.coverMediaId))
    .where(and(eq(schema.posts.published, true), lte(schema.posts.publishAt, new Date()), ...(slug ? [eq(schema.posts.slug, slug)] : [])))
    .orderBy(desc(schema.posts.publishAt));
  return rows.map(({ post: p, cover }) => ({
    slug: p.slug,
    title: p.title,
    dek: p.dek,
    category: p.category,
    date: ymdColombo(p.publishAt),
    minutes: minutesOf(p.body ?? []),
    photo: (p.photo in photos ? p.photo : "site1") as PhotoKey,
    body: p.body ?? [],
    ...(cover ? { cover: cld(cover, "f_auto,q_auto,w_2000,c_limit") } : {}),
  }));
}

export async function getArticles(): Promise<SiteArticle[]> {
  "use cache";
  cacheTag(TAGS.content);
  // Scheduled posts appear within minutes of their publish time.
  cacheLife("minutes");
  return loadArticles();
}

/** Cached under its own slug, so a post published after the build never 404s. */
export async function getArticle(slug: string): Promise<SiteArticle | null> {
  "use cache";
  cacheTag(TAGS.content);
  cacheLife("minutes");
  return (await loadArticles(slug))[0] ?? null;
}

/** The photo for a news card: the uploaded cover, else the stock photo. */
export function articlePhoto(a: SiteArticle): Photo {
  return a.cover ? { src: a.cover, alt: a.title, ar: 1.6 } : photos[a.photo];
}

async function loadRoles(slug?: string): Promise<Role[]> {
  if (!db) return slug ? sampleRoles.filter((r) => r.slug === slug) : sampleRoles;
  const today = ymdColombo(new Date());
  const rows = await db
    .select()
    .from(schema.jobs)
    .where(and(eq(schema.jobs.open, true), ...(slug ? [eq(schema.jobs.slug, slug)] : [])))
    .orderBy(asc(schema.jobs.sort), asc(schema.jobs.title));
  return rows
    .filter((j) => !j.closes || j.closes >= today)
    .map((j) => ({ slug: j.slug, title: j.title, team: j.team, location: j.location, type: j.type, summary: j.summary, duties: j.duties ?? [], needs: j.needs ?? [] }));
}

export async function getRoles(): Promise<Role[]> {
  "use cache";
  cacheTag(TAGS.content);
  cacheLife("hours");
  return loadRoles();
}

export async function getRole(slug: string): Promise<Role | null> {
  "use cache";
  cacheTag(TAGS.content);
  cacheLife("hours");
  return (await loadRoles(slug))[0] ?? null;
}

export async function getFaqGroups(): Promise<{ group: string; items: { q: string; a: string }[] }[]> {
  "use cache";
  cacheTag(TAGS.content);
  cacheLife("hours");
  if (!db) return sampleFaq;
  const rows = await db.select().from(schema.faqs).where(eq(schema.faqs.published, true)).orderBy(asc(schema.faqs.sort), asc(schema.faqs.id));
  const groups: { group: string; items: { q: string; a: string }[] }[] = [];
  for (const r of rows) {
    const g = groups.find((x) => x.group === r.group) ?? (groups.push({ group: r.group, items: [] }), groups[groups.length - 1]);
    g.items.push({ q: r.q, a: r.a });
  }
  return groups;
}

export async function getAwards(): Promise<{ year: string; title: string; by: string; project: string }[]> {
  "use cache";
  cacheTag(TAGS.content);
  cacheLife("hours");
  if (!db) return sampleAwards.map((a) => ({ ...a, project: "" }));
  const rows = await db.select().from(schema.awards).where(eq(schema.awards.shown, true)).orderBy(asc(schema.awards.sort), desc(schema.awards.year));
  return rows.map((a) => ({ year: a.year, title: a.title, by: a.by, project: a.project }));
}

export async function getTestimonials(): Promise<{ id: string; quote: string; name: string; role: string }[]> {
  "use cache";
  cacheTag(TAGS.content);
  cacheLife("hours");
  if (!db) return sampleTestimonials;
  const rows = await db.select().from(schema.testimonials).where(eq(schema.testimonials.published, true)).orderBy(asc(schema.testimonials.sort), asc(schema.testimonials.id));
  return rows.map((t) => ({ id: String(t.id), quote: t.quote, name: t.name, role: t.role }));
}

/* ───────── Site settings (admin: Settings) ───────── */

export type Company = typeof sampleCompany & { vat: string; socials: Record<string, string> };
export type Office = (typeof sampleOffices)[number];
export interface SiteSettings {
  company: Company;
  offices: Office[];
  /** LKR per unit of each foreign currency */
  fx: Record<Currency, number>;
}

/** "+94 77 123 4567" → "tel:+94771234567" / "https://wa.me/94771234567" */
const telHref = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;
const waHref = (n: string) => `https://wa.me/${n.replace(/\D/g, "").replace(/^0/, "94")}`;

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(TAGS.settings);
  cacheLife("hours");
  return loadSiteSettings();
}

/** Saved settings over the built-in defaults, uncached (the admin Settings page reads this). */
export async function loadSiteSettings(): Promise<SiteSettings> {
  const base: SiteSettings = { company: { ...sampleCompany, vat: "", socials: {} }, offices: sampleOffices, fx: { ...FX } };
  if (!db) return base;
  const rows = await db.select().from(schema.settings).where(inArray(schema.settings.key, ["company", "offices", "fx"]));
  const get = <T,>(k: string) => rows.find((r) => r.key === k)?.value as T | undefined;
  const c = get<Partial<Company>>("company") ?? {};
  const company: Company = { ...base.company, ...c, address: c.address?.length ? c.address : base.company.address, socials: { ...base.company.socials, ...(c.socials ?? {}) } };
  company.hotlineHref = telHref(company.hotline);
  company.whatsappHref = waHref(company.whatsapp);
  const offices = get<Office[]>("offices");
  const fx = get<Partial<Record<Currency, number>>>("fx") ?? {};
  return {
    company,
    offices: offices?.length ? offices : base.offices,
    fx: { ...base.fx, ...Object.fromEntries(Object.entries(fx).filter(([, v]) => typeof v === "number" && v > 0)), LKR: 1 },
  };
}

/** "YYYY-MM-DD" in Colombo time. */
function ymdColombo(d: Date) {
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}
