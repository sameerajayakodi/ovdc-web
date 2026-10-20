"use server";

import { refresh } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { MediaKind } from "@/db/schema";
import { requireAdmin, type Admin } from "@/lib/admin/auth";
import { destroy, uploadTicket, usage, verifyUpload, type ResourceType } from "@/lib/cloudinary";
import { getMediaByIds, mediaUsage, toAdminMedia } from "@/lib/admin/contentQueries";
import { bytesLabel } from "@/lib/mediaUrl";
import type { ActionResult, AdminMedia } from "@/lib/admin/types";

function need() {
  if (!db) throw new Error("The database is not configured (DATABASE_URL).");
  return db;
}

const KINDS: MediaKind[] = ["image", "360", "video", "pdf"];
const resourceOf = (k: MediaKind): ResourceType => (k === "video" ? "video" : "image");
const txt = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function validFolder(folder: string) {
  if (folder === "web") return true;
  const [p] = await need().select({ s: schema.projects.slug }).from(schema.projects).where(eq(schema.projects.slug, folder)).limit(1);
  return !!p;
}

function log(admin: Admin, ref: string, action: string, detail: Record<string, unknown>) {
  return need().insert(schema.activity).values({ actor: admin.username, entity: "media", ref, action, detail });
}

export interface UploadRequest {
  folder: string;
  kind: MediaKind;
  name: string;
  size: number;
}

/** A signed, short-lived permission for the browser to upload one file straight to Cloudinary. */
export async function prepareUpload(req: UploadRequest): Promise<ActionResult<{ url: string; fields: Record<string, string> }>> {
  await requireAdmin();
  if (!KINDS.includes(req.kind)) return { ok: false, error: "Unsupported file type." };
  if (!(await validFolder(req.folder))) return { ok: false, error: "Choose a folder first." };
  const limits = (await usage())?.limits;
  const max = req.kind === "video" ? (limits?.video ?? 100 * 1024 ** 2) : (limits?.image ?? 10 * 1024 ** 2);
  if (!Number.isFinite(req.size) || req.size <= 0) return { ok: false, error: "This file is empty." };
  if (req.size > max) return { ok: false, error: `${req.name} is ${bytesLabel(req.size)}. The Cloudinary plan allows up to ${bytesLabel(max)} per ${req.kind === "video" ? "video" : "file"}.` };
  try {
    return { ok: true, data: uploadTicket(req.folder, resourceOf(req.kind)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Uploads are not configured." };
  }
}

/** Fields of Cloudinary's upload response that we keep. */
export interface UploadResult {
  public_id: string;
  version: number;
  signature: string;
  resource_type: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  pages?: number;
  secure_url: string;
}

export async function saveUpload(r: UploadResult, meta: { folder: string; kind: MediaKind; name: string; alt?: string }): Promise<ActionResult<AdminMedia>> {
  const admin = await requireAdmin();
  const d = need();
  if (!r?.public_id || !verifyUpload(r.public_id, r.version, r.signature)) return { ok: false, error: "The upload could not be verified. Try again." };
  if (!(await validFolder(meta.folder))) return { ok: false, error: "Unknown folder." };
  let kind: MediaKind = KINDS.includes(meta.kind) ? meta.kind : "image";
  if (r.format === "pdf") kind = "pdf";
  else if (r.resource_type === "video") kind = "video";
  const w = Math.round(r.width ?? 0);
  const h = Math.round(r.height ?? 0);
  // A 360° panorama must be equirectangular (2:1).
  const notPano = kind === "360" && !(h > 0 && Math.abs(w / h - 2) < 0.02);
  if (notPano) kind = "image";

  const [row] = await d
    .insert(schema.media)
    .values({
      publicId: r.public_id,
      resourceType: r.resource_type === "video" ? "video" : r.resource_type === "raw" ? "raw" : "image",
      kind,
      folder: meta.folder,
      name: txt(meta.name, 160) || r.public_id.split("/").pop()!,
      format: r.format ?? "",
      bytes: Math.round(r.bytes ?? 0),
      width: w,
      height: h,
      duration: r.duration ?? 0,
      pages: Math.round(r.pages ?? 0),
      url: r.secure_url,
      version: r.version,
      alt: txt(meta.alt, 125),
      uploadedBy: admin.name,
    })
    .onConflictDoNothing({ target: schema.media.publicId })
    .returning();
  if (!row) return { ok: false, error: "This file is already in the library." };
  await log(admin, String(row.id), "uploaded", { name: row.name, kind, folder: row.folder, bytes: row.bytes });
  refresh();
  return { ok: true, data: toAdminMedia(row), message: notPano ? `${row.name} is not 2:1, so it was saved as a photo, not a 360° panorama` : `${row.name} uploaded` };
}

export async function updateMedia(id: number, patch: { alt?: string; name?: string }): Promise<ActionResult<AdminMedia>> {
  const admin = await requireAdmin();
  const d = need();
  const set: Partial<typeof schema.media.$inferInsert> = { updatedAt: new Date() };
  if (patch.alt !== undefined) set.alt = txt(patch.alt, 125);
  if (patch.name !== undefined) {
    set.name = txt(patch.name, 160);
    if (!set.name) return { ok: false, error: "Enter a file name." };
  }
  const [row] = await d.update(schema.media).set(set).where(eq(schema.media.id, id)).returning();
  if (!row) return { ok: false, error: "This file no longer exists." };
  await log(admin, String(id), patch.alt !== undefined ? "alt text updated" : "renamed", { name: row.name });
  const [fresh] = await getMediaByIds([id]);
  refresh();
  return { ok: true, data: fresh, message: patch.alt !== undefined ? "Alt text saved" : "Renamed" };
}

export async function moveMedia(ids: number[], folder: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const list = [...new Set(ids)].filter((n) => Number.isInteger(n) && n > 0);
  if (!list.length) return { ok: false, error: "Select files first." };
  if (!(await validFolder(folder))) return { ok: false, error: "Unknown folder." };
  const rows = await d.update(schema.media).set({ folder, updatedAt: new Date() }).where(inArray(schema.media.id, list)).returning({ id: schema.media.id, name: schema.media.name });
  await log(admin, rows.length === 1 ? String(rows[0].id) : `${rows.length} files`, `moved to ${folder}`, { name: rows.length === 1 ? rows[0].name : `${rows.length} files`, ids: rows.map((r) => r.id) });
  refresh();
  return { ok: true, message: `${rows.length} file${rows.length === 1 ? "" : "s"} moved` };
}

/** Deletes from Cloudinary and the library. Files still used by a floor plan or tour are kept. */
export async function deleteMedia(ids: number[]): Promise<ActionResult<{ deleted: number[] }>> {
  const admin = await requireAdmin();
  const d = need();
  const list = [...new Set(ids)].filter((n) => Number.isInteger(n) && n > 0);
  if (!list.length) return { ok: false, error: "Select files first." };
  const [rows, used] = await Promise.all([d.select().from(schema.media).where(inArray(schema.media.id, list)), mediaUsage(list)]);
  const blocked = rows.filter((r) => used.has(r.id));
  const free = rows.filter((r) => !used.has(r.id));
  const deleted: number[] = [];
  for (const r of free) {
    if (await destroy(r.publicId, r.resourceType)) deleted.push(r.id);
  }
  if (deleted.length) {
    await d.batch([
      d.delete(schema.media).where(inArray(schema.media.id, deleted)),
      log(admin, deleted.length === 1 ? String(deleted[0]) : `${deleted.length} files`, "deleted", {
        name: deleted.length === 1 ? free.find((r) => r.id === deleted[0])!.name : `${deleted.length} files`,
        ids: deleted,
      }),
    ]);
    refresh();
  }
  if (blocked.length && !deleted.length)
    return { ok: false, error: `${blocked.length === 1 ? blocked[0].name + " is" : `${blocked.length} files are`} still used on the website. Remove ${blocked.length === 1 ? "it" : "them"} from the floor plan or tour first.` };
  if (deleted.length < free.length) return { ok: false, error: "Some files could not be deleted from Cloudinary. Try again." };
  return {
    ok: true,
    data: { deleted },
    message: `${deleted.length} file${deleted.length === 1 ? "" : "s"} deleted${blocked.length ? ` · ${blocked.length} kept because ${blocked.length === 1 ? "it is" : "they are"} in use` : ""}`,
  };
}
