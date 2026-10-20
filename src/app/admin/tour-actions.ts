"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { TourHotspotRow } from "@/db/schema";
import { requireAdmin, type Admin } from "@/lib/admin/auth";
import { slugify } from "@/lib/admin/format";
import { embedSrc } from "@/lib/embed";
import { TAGS } from "@/lib/cacheTags";
import type { ActionResult, AdminScene } from "@/lib/admin/types";

function need() {
  if (!db) throw new Error("The database is not configured (DATABASE_URL).");
  return db;
}

const txt = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 10) / 10)) : 0;
};
/** Yaw kept in [-180, 180). */
const wrapYaw = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round((((((n + 180) % 360) + 360) % 360) - 180) * 10) / 10;
};

function log(admin: Admin, ref: string, action: string, detail: Record<string, unknown>) {
  return need().insert(schema.activity).values({ actor: admin.username, entity: "tour", ref, action, detail });
}

function changed() {
  updateTag(TAGS.tours);
  refresh();
}

export async function createTour(input: { projectSlug: string; type: string; title: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const title = txt(input.title, 120);
  const fields: Record<string, string> = {};
  if (title.length < 3) fields.title = "Give the tour a title.";
  const [project] = await d.select({ slug: schema.projects.slug, id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.slug, input.projectSlug)).limit(1);
  if (!project) fields.projectSlug = "Choose a project.";
  if (Object.keys(fields).length) return { ok: false, error: Object.values(fields)[0], fields };

  const prefix = project!.slug.split("-").map((w) => w[0]).join("");
  const base = slugify(`${prefix}-${txt(input.type, 40) || title}`) || slugify(title);
  const taken = new Set((await d.select({ id: schema.tours.id }).from(schema.tours)).map((r) => r.id));
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;

  await d.batch([
    d.insert(schema.tours).values({ id, projectSlug: project!.slug, type: txt(input.type, 40), title, published: false }),
    log(admin, id, "created", { name: title }),
  ]);
  changed();
  redirect(`/admin/tours/${id}`);
}

export interface TourDraft {
  title: string;
  type: string;
  unitRef: string;
  source: "pano" | "embed";
  embedUrl: string;
  coverMediaId: number | null;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  scenes: AdminScene[];
}

/** Saves the whole tour (settings and every scene) in one transaction. `publish` also changes visibility. */
export async function saveTour(id: string, draft: TourDraft, publish?: boolean): Promise<ActionResult<{ published: boolean }>> {
  const admin = await requireAdmin();
  const d = need();
  const [before] = await d.select().from(schema.tours).where(eq(schema.tours.id, id)).limit(1);
  if (!before) return { ok: false, error: "This tour no longer exists." };

  const title = txt(draft.title, 120);
  if (title.length < 3) return { ok: false, error: "Give the tour a title.", fields: { title: "Give the tour a title." } };
  const source = draft.source === "embed" ? "embed" : "pano";
  const embedUrl = txt(draft.embedUrl, 500);
  if (source === "embed" && embedUrl && !embedSrc(embedUrl)) return { ok: false, error: "Use a Matterport (my.matterport.com/show/…) or Kuula (kuula.co/share/…) link.", fields: { embedUrl: "Not a Matterport or Kuula link." } };

  const scenes = (Array.isArray(draft.scenes) ? draft.scenes : []).slice(0, 40);
  const keys = new Set<string>();
  const mediaIds = scenes.map((s) => s.mediaId).filter((n): n is number => Number.isInteger(n));
  const known = mediaIds.length ? new Set((await d.select({ id: schema.media.id }).from(schema.media).where(inArray(schema.media.id, mediaIds))).map((r) => r.id)) : new Set<number>();
  for (const [i, s] of scenes.entries()) {
    const key = slugify(s.key || s.name);
    if (!key) return { ok: false, error: `Scene ${i + 1} needs a name.` };
    if (keys.has(key)) return { ok: false, error: `Two scenes are called “${s.name}”. Give each room its own name.` };
    keys.add(key);
    if (!/^(https:\/\/res\.cloudinary\.com\/|\/tours\/)/.test(s.panorama)) return { ok: false, error: `${s.name}: choose a panorama from the Media library.` };
  }
  const rows = scenes.map((s, i) => {
    const hotspots: TourHotspotRow[] = (s.hotspots ?? []).slice(0, 40).flatMap((h, j): TourHotspotRow[] => {
      const base = { yaw: wrapYaw(h.yaw), pitch: num(h.pitch, -89, 89) };
      if (h.t === "nav") {
        const to = slugify(h.to ?? "");
        return to && keys.has(to) && to !== slugify(s.key || s.name) ? [{ t: "nav", to, ...base }] : [];
      }
      const t = txt(h.title, 80);
      return t ? [{ t: "info", id: txt(h.id, 40) || `info-${j + 1}`, kicker: txt(h.kicker, 40), title: t, body: txt(h.body, 400), ...base }] : [];
    });
    return {
      tourId: id,
      key: slugify(s.key || s.name),
      name: txt(s.name, 60),
      short: txt(s.short, 20),
      note: txt(s.note, 160),
      sort: i,
      panorama: s.panorama,
      thumb: txt(s.thumb, 500),
      mediaId: s.mediaId != null && known.has(s.mediaId) ? s.mediaId : null,
      yaw: wrapYaw(s.yaw),
      rot: num(s.rot, -180, 180),
      planX: num(s.planX, 0, 200),
      planY: num(s.planY, 0, 140),
      hotspots,
    };
  });

  const published = publish ?? before.published;
  if (published) {
    if (source === "pano" && !rows.length) return { ok: false, error: "Add at least one panorama before publishing." };
    if (source === "embed" && !embedSrc(embedUrl)) return { ok: false, error: "Add the Matterport or Kuula link before publishing.", fields: { embedUrl: "Required to publish." } };
  }
  if (draft.coverMediaId != null) {
    const [m] = await d.select({ id: schema.media.id }).from(schema.media).where(eq(schema.media.id, draft.coverMediaId)).limit(1);
    if (!m) return { ok: false, error: "The cover image is no longer in the library." };
  }

  const action = publish === true && !before.published ? "published" : publish === false && before.published ? "unpublished" : "updated";
  await d.batch([
    d
      .update(schema.tours)
      .set({
        title,
        type: txt(draft.type, 40),
        unitRef: txt(draft.unitRef, 20).toUpperCase(),
        source,
        embedUrl,
        coverMediaId: draft.coverMediaId ?? null,
        bedrooms: txt(draft.bedrooms, 40),
        bathrooms: txt(draft.bathrooms, 40),
        parking: txt(draft.parking, 60),
        published,
        updatedAt: new Date(),
      })
      .where(eq(schema.tours.id, id)),
    d.delete(schema.tourScenes).where(eq(schema.tourScenes.tourId, id)),
    ...(rows.length ? [d.insert(schema.tourScenes).values(rows)] : []),
    log(admin, id, action, { name: title, scenes: rows.length }),
  ]);
  changed();
  return {
    ok: true,
    data: { published },
    message: action === "published" ? `${title} is live on the website` : action === "unpublished" ? `${title} is hidden from the website` : published ? "Saved · live on the website" : "Saved as draft",
  };
}

export async function deleteTour(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const [row] = await d.delete(schema.tours).where(eq(schema.tours.id, id)).returning({ title: schema.tours.title });
  if (!row) return { ok: false, error: "This tour no longer exists." };
  await log(admin, id, "deleted", { name: row.title });
  updateTag(TAGS.tours);
  redirect("/admin/tours");
}
