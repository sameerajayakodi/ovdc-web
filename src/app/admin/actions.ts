"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin/auth";
import { SESSION_COOKIE } from "@/lib/admin/token";
import { getAdminUnits, toAdminUnit } from "@/lib/admin/queries";
import { slugify } from "@/lib/admin/format";
import { TAGS } from "@/lib/cacheTags";
import type { ActionResult, AdminUnit, PricePoint } from "@/lib/admin/types";
import type { UnitStatus } from "@/lib/types";

const STATUSES: UnitStatus[] = ["A", "R", "S", "B"];
const STATUS_LABEL: Record<UnitStatus, string> = { A: "Available", R: "Reserved", S: "Sold", B: "Not released" };

function need() {
  if (!db) throw new Error("The database is not configured (DATABASE_URL).");
  return db;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface UnitChange {
  ids: number[];
  status?: UnitStatus;
  price?: { mode: "set" | "pct" | "add"; value: number };
  note?: string;
  /** A floor plan type of the units' project; its bedrooms and areas are copied to the units */
  type?: string;
}

/** Status / price edits for one or many units. Updates the public site immediately. */
export async function updateUnits(
  change: UnitChange,
): Promise<ActionResult<{ units: AdminUnit[]; history: Record<number, PricePoint[]> }>> {
  const admin = await requireAdmin();
  const d = need();

  const ids = [...new Set(change.ids)].filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length || ids.length > 1000) return { ok: false, error: "Select at least one unit." };
  if (change.status && !STATUSES.includes(change.status)) return { ok: false, error: "Unknown status." };
  if (change.price && (!Number.isFinite(change.price.value) || !["set", "pct", "add"].includes(change.price.mode)))
    return { ok: false, error: "Enter a valid price change." };
  if (!change.status && !change.price && change.note === undefined && change.type === undefined) return { ok: false, error: "Nothing to change." };

  const current = await d.select().from(schema.units).where(inArray(schema.units.id, ids));
  if (current.length !== ids.length) return { ok: false, error: "Some units no longer exist. Reload the page." };
  const slugs = [...new Set(current.map((u) => u.projectSlug))];

  let layout: Partial<typeof schema.units.$inferInsert> = {};
  if (change.type !== undefined) {
    if (slugs.length !== 1) return { ok: false, error: "Choose units from one project to change their type." };
    const [plan] = await d
      .select()
      .from(schema.floorPlans)
      .where(and(eq(schema.floorPlans.projectSlug, slugs[0]), eq(schema.floorPlans.type, String(change.type))))
      .limit(1);
    if (!plan) return { ok: false, error: "Add this type in Floor plans first." };
    const beds = Number(plan.label.match(/\d+/)?.[0]);
    layout = {
      type: plan.type,
      ...(plan.label ? { label: plan.label } : {}),
      ...(beds > 0 ? { beds } : {}),
      ...(plan.sqft ? { sqft: plan.sqft } : {}),
      ...(plan.balcony ? { balcony: plan.balcony } : {}),
    };
  }

  const next = current.map((u) => {
    let price = u.priceMn;
    if (change.price) {
      const { mode, value } = change.price;
      price = round1(mode === "set" ? value : mode === "pct" ? u.priceMn * (1 + value / 100) : u.priceMn + value);
    }
    return { u, price };
  });
  const bad = next.find((x) => x.price < 1 || x.price > 100000);
  if (bad) return { ok: false, error: `Unit ${bad.u.tower}-${bad.u.code} would be priced at LKR ${bad.price} Mn, which is out of range.` };

  const note = change.note?.slice(0, 500);
  const now = new Date();
  const priceChanged = next.filter((x) => x.price !== x.u.priceMn);
  const common = { ...(change.status ? { status: change.status } : {}), ...(note !== undefined ? { note } : {}), ...layout, updatedAt: now };

  const refs = current.map((u) => `${u.tower}-${u.code}`);
  const parts: string[] = [];
  if (change.status) parts.push(`status → ${STATUS_LABEL[change.status]}`);
  if (change.price) {
    const { mode, value } = change.price;
    const sign = value >= 0 ? "+" : "";
    parts.push(mode === "set" ? `price → LKR ${value} Mn` : mode === "pct" ? `price ${sign}${value}%` : `price ${sign}${value} Mn`);
  }
  if (layout.type) parts.push(`type → ${layout.type}`);
  if (note !== undefined && !change.status && !change.price) parts.push("note updated");

  const log = d.insert(schema.activity).values({
    actor: admin.username,
    entity: "unit",
    ref: refs.length === 1 ? refs[0] : `${refs.length} units`,
    action: parts.join(" · "),
    detail: {
      project: slugs.join(","),
      units: refs.slice(0, 50),
      ...(change.status ? { from: [...new Set(current.map((u) => u.status))], to: change.status } : {}),
      ...(layout.type ? { fromType: [...new Set(current.map((u) => u.type))], type: layout.type } : {}),
      ...(priceChanged.length === 1 ? { previousMn: priceChanged[0].u.priceMn, priceMn: priceChanged[0].price } : {}),
    },
    at: now,
  });

  // One HTTP round trip, applied as a single transaction.
  if (change.price) {
    const updates = next.map((x) => d.update(schema.units).set({ ...common, priceMn: x.price }).where(eq(schema.units.id, x.u.id)));
    const history = priceChanged.length
      ? [d.insert(schema.priceHistory).values(priceChanged.map((x) => ({ unitId: x.u.id, priceMn: x.price, previousMn: x.u.priceMn, changedBy: admin.username, changedAt: now })))]
      : [];
    await d.batch([log, ...updates, ...history]);
  } else {
    await d.batch([log, d.update(schema.units).set(common).where(inArray(schema.units.id, ids))]);
  }

  updateTag(TAGS.inventory);
  for (const s of slugs) {
    updateTag(TAGS.inventoryOf(s));
    if (layout.type) updateTag(TAGS.plansOf(s));
  }

  const fresh = await d.select().from(schema.units).where(inArray(schema.units.id, ids));
  const { history } = slugs.length === 1 ? await getAdminUnits(slugs[0]) : { history: {} as Record<number, PricePoint[]> };
  return {
    ok: true,
    data: { units: fresh.map(toAdminUnit), history: Object.fromEntries(ids.map((id) => [id, history[id] ?? []])) },
    message: ids.length === 1 ? `Unit ${refs[0]} updated` : `${ids.length} units updated`,
  };
}

/* ───────── Projects ───────── */

const PROJECT_STATUS = ["uc", "done", "soon"] as const;

function str(fd: FormData, k: string, max = 200) {
  return String(fd.get(k) ?? "").trim().slice(0, max);
}
function num(fd: FormData, k: string) {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : Number(v);
}
function bool(fd: FormData, k: string) {
  return fd.get(k) === "on" || fd.get(k) === "true";
}

function readProject(fd: FormData) {
  const fields: Record<string, string> = {};
  const name = str(fd, "name", 120);
  if (name.length < 3) fields.name = "Enter the project name.";
  const loc = str(fd, "loc", 80);
  if (!loc) fields.loc = "Enter the area, e.g. Mount Lavinia.";
  const status = str(fd, "status") as (typeof PROJECT_STATUS)[number];
  if (!PROJECT_STATUS.includes(status)) fields.status = "Choose a stage.";
  const fromMn = num(fd, "fromMn");
  if (fromMn != null && (!Number.isFinite(fromMn) || fromMn <= 0 || fromMn > 100000))
    fields.fromMn = "Enter a price in LKR millions, or leave it empty.";
  const progress = num(fd, "progress") ?? 0;
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) fields.progress = "Enter 0 to 100.";
  const ints: Record<string, number> = {};
  for (const k of ["units", "floors", "availableManual", "sort"]) {
    const v = num(fd, k) ?? 0;
    if (!Number.isInteger(v) || v < 0 || v > 100000) fields[k] = "Enter a whole number.";
    ints[k] = v;
  }
  const lat = num(fd, "lat") ?? 6.9271;
  const lng = num(fd, "lng") ?? 79.8612;
  if (!(lat >= 5.5 && lat <= 10.2)) fields.lat = "Sri Lanka latitudes run from 5.9 to 9.9.";
  if (!(lng >= 79.4 && lng <= 82.1)) fields.lng = "Sri Lanka longitudes run from 79.5 to 81.9.";

  return {
    fields,
    values: {
      name,
      loc,
      address: str(fd, "address", 200),
      type: str(fd, "type", 60) || "Apartments",
      status,
      fromMn: fromMn == null ? null : round1(fromMn),
      progress,
      completion: str(fd, "completion", 40),
      uda: str(fd, "uda", 60),
      units: ints.units,
      floors: ints.floors,
      availableManual: ints.availableManual,
      sort: ints.sort,
      towers: str(fd, "towers", 80),
      beds: str(fd, "beds", 40),
      lat,
      lng,
      blurb: str(fd, "blurb", 600),
      published: bool(fd, "published"),
      featured: bool(fd, "featured"),
      tour: bool(fd, "tour"),
      explorer: bool(fd, "explorer"),
    },
  };
}

export async function saveProject(slug: string | null, _prev: unknown, fd: FormData): Promise<ActionResult<{ slug: string }>> {
  const admin = await requireAdmin();
  const d = need();
  const { fields, values } = readProject(fd);

  if (slug === null) {
    const newSlug = slugify(str(fd, "slug", 60) || values.name);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newSlug)) fields.slug = "Use lowercase letters, numbers and dashes.";
    else if (newSlug === "new") fields.slug = "This web address is reserved. Choose another.";
    else {
      const [taken] = await d.select({ s: schema.projects.slug }).from(schema.projects).where(eq(schema.projects.slug, newSlug)).limit(1);
      if (taken) fields.slug = "Another project already uses this web address.";
    }
    if (Object.keys(fields).length) return { ok: false, error: "Check the highlighted fields.", fields };

    // A new project has no unit inventory yet, so the explorer stays off.
    await d.batch([
      d.insert(schema.projects).values({ ...values, explorer: false, id: newSlug, slug: newSlug }),
      d.insert(schema.activity).values({
        actor: admin.username,
        entity: "project",
        ref: newSlug,
        action: "created",
        detail: { name: values.name, published: values.published },
      }),
    ]);
    updateTag(TAGS.projects);
    redirect(`/admin/projects/${newSlug}?created=1`);
  }

  if (Object.keys(fields).length) return { ok: false, error: "Check the highlighted fields.", fields };
  const [before] = await d.select().from(schema.projects).where(eq(schema.projects.slug, slug)).limit(1);
  if (!before) return { ok: false, error: "This project no longer exists." };

  if (values.explorer) {
    const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(schema.units).where(eq(schema.units.projectSlug, slug));
    if (!n) return { ok: false, error: "The building explorer needs unit inventory.", fields: { explorer: "This project has no units yet." } };
  }

  const changed = (Object.keys(values) as (keyof typeof values)[]).filter((k) => values[k] !== before[k]);
  if (!changed.length) return { ok: true, data: { slug }, message: "No changes to save" };

  await d.batch([
    d.update(schema.projects).set({ ...values, updatedAt: new Date() }).where(eq(schema.projects.slug, slug)),
    d.insert(schema.activity).values({
      actor: admin.username,
      entity: "project",
      ref: slug,
      action: changed.includes("published") ? (values.published ? "published" : "unpublished") : "updated",
      detail: { name: values.name, fields: changed },
    }),
  ]);
  updateTag(TAGS.projects);
  return { ok: true, data: { slug }, message: values.published ? "Saved · live on the website" : "Saved as draft" };
}

export async function setProjectPublished(slug: string, published: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const res = await d
    .update(schema.projects)
    .set({ published, updatedAt: new Date() })
    .where(eq(schema.projects.slug, slug))
    .returning({ name: schema.projects.name });
  if (!res.length) return { ok: false, error: "This project no longer exists." };
  await d.insert(schema.activity).values({
    actor: admin.username,
    entity: "project",
    ref: slug,
    action: published ? "published" : "unpublished",
    detail: { name: res[0].name },
  });
  updateTag(TAGS.projects);
  return { ok: true, message: published ? `${res[0].name} is live` : `${res[0].name} is hidden from the website` };
}

/** Only drafts can be deleted, so a live page never disappears by accident. */
export async function deleteProject(slug: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const res = await d
    .delete(schema.projects)
    .where(and(eq(schema.projects.slug, slug), eq(schema.projects.published, false)))
    .returning({ name: schema.projects.name });
  if (!res.length) return { ok: false, error: "Only draft projects can be deleted. Unpublish it first." };
  await d.insert(schema.activity).values({ actor: admin.username, entity: "project", ref: slug, action: "deleted", detail: { name: res[0].name } });
  updateTag(TAGS.projects);
  updateTag(TAGS.inventory);
  return { ok: true, message: `${res[0].name} deleted` };
}

export async function logout() {
  const admin = await requireAdmin();
  (await cookies()).delete(SESSION_COOKIE);
  if (db) {
    await db
      .insert(schema.activity)
      .values({ actor: admin.username, entity: "auth", ref: admin.username, action: "signed out" })
      .catch(() => {});
  }
  redirect("/admin/login");
}
