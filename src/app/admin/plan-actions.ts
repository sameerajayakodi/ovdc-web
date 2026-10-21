"use server";

import { refresh, updateTag } from "next/cache";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PlanRoom } from "@/db/schema";
import { requireAdmin, type Admin } from "@/lib/admin/auth";
import { TAGS } from "@/lib/cacheTags";
import type { ActionResult } from "@/lib/admin/types";

function need() {
  if (!db) throw new Error("The database is not configured (DATABASE_URL).");
  return db;
}

const txt = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function log(admin: Admin, ref: string, action: string, detail: Record<string, unknown>) {
  return need().insert(schema.activity).values({ actor: admin.username, entity: "plan", ref, action, detail });
}

/** Only the edited project's layouts are re-read by the website. */
function changed(slug: string, inventory = false) {
  updateTag(TAGS.plansOf(slug));
  if (inventory) {
    updateTag(TAGS.inventory);
    updateTag(TAGS.inventoryOf(slug));
    updateTag(TAGS.tours);
  }
  refresh();
}

export interface PlanInput {
  projectSlug: string;
  type: string;
  key: string;
  label: string;
  sqft: number;
  balcony: number;
  facing: string;
  view: string;
  rooms: PlanRoom[];
}

export async function savePlan(id: number | null, input: PlanInput): Promise<ActionResult<{ id: number }>> {
  const admin = await requireAdmin();
  const d = need();
  const fields: Record<string, string> = {};
  const type = txt(input.type, 60);
  if (!type) fields.type = "Enter the unit type, e.g. Type C.";
  const key = (txt(input.key, 8) || type.split(/\s+/).pop() || "").toUpperCase();
  if (!/^[A-Z0-9-]{1,8}$/.test(key)) fields.key = "Use 1–8 letters or numbers, e.g. C.";
  const ints: Record<"sqft" | "balcony", number> = { sqft: 0, balcony: 0 };
  for (const k of ["sqft", "balcony"] as const) {
    const v = Number(input[k]);
    if (!Number.isInteger(v) || v < 0 || v > 100000) fields[k] = "Enter a whole number of sqft.";
    ints[k] = v;
  }
  if (!fields.sqft && ints.sqft < 100) fields.sqft = "Enter the interior area in sqft.";
  if (!Array.isArray(input.rooms) || input.rooms.length > 40) fields.rooms = "Up to 40 rooms.";
  const rooms: PlanRoom[] = (input.rooms ?? []).map((r) => ({ name: txt(r.name, 60), w: Math.round(Number(r.w) * 100) / 100, l: Math.round(Number(r.l) * 100) / 100 }));
  rooms.forEach((r, i) => {
    if (!r.name) fields[`room${i}`] = "Name the room.";
    else if (!(r.w > 0 && r.w <= 100 && r.l > 0 && r.l <= 100)) fields[`room${i}`] = `${r.name}: enter width and length in metres.`;
  });
  const [project] = await d.select({ name: schema.projects.name }).from(schema.projects).where(eq(schema.projects.slug, input.projectSlug)).limit(1);
  if (!project) return { ok: false, error: "This project no longer exists." };
  if (type) {
    const [dup] = await d
      .select({ id: schema.floorPlans.id })
      .from(schema.floorPlans)
      .where(and(eq(schema.floorPlans.projectSlug, input.projectSlug), eq(schema.floorPlans.type, type), ...(id ? [ne(schema.floorPlans.id, id)] : [])))
      .limit(1);
    if (dup) fields.type = `${project.name} already has a ${type} layout.`;
  }
  if (!fields.key) {
    // The website tells layouts apart by this code, so it must be unique in the project.
    const [same] = await d
      .select({ type: schema.floorPlans.type })
      .from(schema.floorPlans)
      .where(and(eq(schema.floorPlans.projectSlug, input.projectSlug), eq(schema.floorPlans.key, key), ...(id ? [ne(schema.floorPlans.id, id)] : [])))
      .limit(1);
    if (same) fields.key = `${same.type} already uses the code ${key}.`;
  }
  if (Object.keys(fields).length) return { ok: false, error: Object.values(fields)[0], fields };

  const values = { type, key, label: txt(input.label, 60), sqft: ints.sqft, balcony: ints.balcony, facing: txt(input.facing, 40), view: txt(input.view, 40), rooms };
  const name = `${type}${values.label ? ` · ${values.label}` : ""}`;

  if (id == null) {
    const [{ n }] = await d
      .select({ n: sql<number>`coalesce(max(${schema.floorPlans.sort}), -1)::int + 1` })
      .from(schema.floorPlans)
      .where(eq(schema.floorPlans.projectSlug, input.projectSlug));
    const [row] = await d.insert(schema.floorPlans).values({ ...values, projectSlug: input.projectSlug, sort: n }).returning({ id: schema.floorPlans.id });
    await log(admin, String(row.id), "created", { name, project: input.projectSlug });
    changed(input.projectSlug);
    return { ok: true, data: { id: row.id }, message: `${name} added · live on the website` };
  }

  const [before] = await d.select().from(schema.floorPlans).where(eq(schema.floorPlans.id, id)).limit(1);
  if (!before) return { ok: false, error: "This layout no longer exists." };
  const diff = (Object.keys(values) as (keyof typeof values)[]).filter((k) => JSON.stringify(values[k]) !== JSON.stringify(before[k]));
  if (!diff.length) return { ok: true, data: { id }, message: "No changes to save" };
  // Units and 360° tours are linked to a layout by its type name: a rename takes them along.
  const renamed = type !== before.type;
  const moved = renamed
    ? [
        d.update(schema.units).set({ type, updatedAt: new Date() }).where(and(eq(schema.units.projectSlug, before.projectSlug), eq(schema.units.type, before.type))),
        d.update(schema.tours).set({ type }).where(and(eq(schema.tours.projectSlug, before.projectSlug), eq(schema.tours.type, before.type))),
      ]
    : [];
  await d.batch([
    d.update(schema.floorPlans).set({ ...values, updatedAt: new Date() }).where(eq(schema.floorPlans.id, id)),
    log(admin, String(id), renamed ? `renamed from ${before.type}` : "updated", { name, project: before.projectSlug, fields: diff }),
    ...moved,
  ]);
  changed(before.projectSlug, renamed);
  return { ok: true, data: { id }, message: renamed ? `Renamed to ${type} · its units and tour moved with it` : "Saved · live on the website" };
}

/** Attaches an uploaded drawing (image or PDF from the Media library), or removes it with null. */
export async function setPlanFile(id: number, mediaId: number | null): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  if (mediaId != null) {
    const [m] = await d.select({ kind: schema.media.kind }).from(schema.media).where(eq(schema.media.id, mediaId)).limit(1);
    if (!m) return { ok: false, error: "That file is no longer in the library." };
    if (m.kind !== "image" && m.kind !== "pdf") return { ok: false, error: "A floor plan must be an image or a PDF." };
  }
  const [row] = await d.update(schema.floorPlans).set({ mediaId, updatedAt: new Date() }).where(eq(schema.floorPlans.id, id)).returning({ type: schema.floorPlans.type, label: schema.floorPlans.label, slug: schema.floorPlans.projectSlug });
  if (!row) return { ok: false, error: "This layout no longer exists." };
  await log(admin, String(id), mediaId == null ? "drawing removed" : "drawing updated", { name: `${row.type}${row.label ? ` · ${row.label}` : ""}`, project: row.slug, media: mediaId });
  changed(row.slug);
  return { ok: true, message: mediaId == null ? "Drawing removed · the website shows the generated plan" : "Floor plan updated · live on the website" };
}

export async function deletePlan(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const [row] = await d.delete(schema.floorPlans).where(eq(schema.floorPlans.id, id)).returning({ type: schema.floorPlans.type, label: schema.floorPlans.label, slug: schema.floorPlans.projectSlug });
  if (!row) return { ok: false, error: "This layout no longer exists." };
  const name = `${row.type}${row.label ? ` · ${row.label}` : ""}`;
  await log(admin, String(id), "deleted", { name, project: row.slug });
  changed(row.slug);
  return { ok: true, message: `${name} deleted` };
}

/** Moves a layout one place up or down: the order of the floor plan table on the website. */
export async function movePlan(id: number, dir: -1 | 1): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const [row] = await d.select().from(schema.floorPlans).where(eq(schema.floorPlans.id, id)).limit(1);
  if (!row) return { ok: false, error: "This layout no longer exists." };
  const list = await d.select({ id: schema.floorPlans.id }).from(schema.floorPlans).where(eq(schema.floorPlans.projectSlug, row.projectSlug)).orderBy(asc(schema.floorPlans.sort), asc(schema.floorPlans.type));
  const i = list.findIndex((p) => p.id === id);
  const j = i + dir;
  if (j < 0 || j >= list.length) return { ok: true };
  [list[i], list[j]] = [list[j], list[i]];
  await d.batch([
    log(admin, String(id), dir < 0 ? "moved up" : "moved down", { name: `${row.type}${row.label ? ` · ${row.label}` : ""}`, project: row.projectSlug }),
    // Renumber the whole list so earlier ties in sort order are settled too.
    ...list.map((p, n) => d.update(schema.floorPlans).set({ sort: n }).where(eq(schema.floorPlans.id, p.id))),
  ]);
  changed(row.projectSlug);
  return { ok: true };
}
