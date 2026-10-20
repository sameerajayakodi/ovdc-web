"use client";

import { prepareUpload, saveUpload, type UploadResult } from "@/app/admin/media-actions";
import type { MediaKind } from "@/db/schema";
import type { AdminMedia } from "@/lib/admin/types";

export type UploadOutcome = { ok: true; media: AdminMedia; message?: string } | { ok: false; error: string };

/** Pixel size of an image file, read in the browser before uploading. */
export async function imageSize(file: File): Promise<{ w: number; h: number } | null> {
  try {
    const bmp = await createImageBitmap(file);
    const out = { w: bmp.width, h: bmp.height };
    bmp.close();
    return out;
  } catch {
    return null;
  }
}

export function kindOf(file: File, hint?: MediaKind): MediaKind | null {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return hint === "360" ? "360" : "image";
  return null;
}

/**
 * Uploads one file straight from the browser to Cloudinary (signed by a Server
 * Action), then records it in the library.
 */
export async function uploadFile(
  file: File,
  opts: { folder: string; kind?: MediaKind; maxPx?: number; onProgress?: (pct: number) => void; alt?: string },
): Promise<UploadOutcome> {
  let kind = kindOf(file, opts.kind);
  if (!kind) return { ok: false, error: `${file.name}: only images, 360° panoramas, videos and PDFs can be uploaded.` };

  if (kind === "image" || kind === "360") {
    const size = await imageSize(file);
    if (!size) return { ok: false, error: `${file.name} could not be read as an image.` };
    if (opts.maxPx && size.w * size.h > opts.maxPx)
      return {
        ok: false,
        error: `${file.name} is ${size.w} × ${size.h} (${Math.round((size.w * size.h) / 1e6)} MP). The Cloudinary plan allows up to ${Math.round(opts.maxPx / 1e6)} MP — resize it first${kind === "360" ? ", e.g. to 7000 × 3500" : ""}.`,
      };
    const twoToOne = Math.abs(size.w / size.h - 2) < 0.02;
    if (kind === "360" && !twoToOne) return { ok: false, error: `${file.name} is ${size.w} × ${size.h}. A 360° panorama must be equirectangular, exactly 2:1.` };
    // A large 2:1 image dropped into the library is almost certainly a panorama.
    if (kind === "image" && opts.kind === undefined && twoToOne && size.w >= 4000) kind = "360";
  }

  const ticket = await prepareUpload({ folder: opts.folder, kind, name: file.name, size: file.size });
  if (!ticket.ok) return { ok: false, error: ticket.error };

  const form = new FormData();
  for (const [k, v] of Object.entries(ticket.data!.fields)) form.append(k, v);
  form.append("file", file);

  let result: UploadResult;
  try {
    result = await new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", ticket.data!.url);
      xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        let body: { error?: { message?: string } } & Partial<UploadResult> = {};
        try {
          body = JSON.parse(xhr.responseText);
        } catch {}
        if (xhr.status >= 200 && xhr.status < 300 && body.public_id) resolve(body as UploadResult);
        else reject(new Error(body.error?.message ?? `Upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
      xhr.send(form);
    });
  } catch (e) {
    return { ok: false, error: `${file.name}: ${e instanceof Error ? e.message : "upload failed"}` };
  }

  opts.onProgress?.(100);
  const saved = await saveUpload(result, { folder: opts.folder, kind, name: file.name, alt: opts.alt });
  return saved.ok ? { ok: true, media: saved.data!, message: saved.message } : { ok: false, error: saved.error };
}
