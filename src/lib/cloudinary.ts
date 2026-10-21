import "server-only";
import { createHash } from "node:crypto";

/**
 * Cloudinary over its REST API (no SDK). Browsers upload straight to
 * Cloudinary with a signature from a Server Action, so big panoramas and
 * videos never pass through a Vercel function (4.5 MB body limit).
 */

export const ROOT = "ovdc";

export function cloudinaryConfig() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  return cloud && key && secret ? { cloud, key, secret } : null;
}

function need() {
  const c = cloudinaryConfig();
  if (!c) throw new Error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).");
  return c;
}

/** Cloudinary's signature: sorted key=value pairs joined with &, plus the secret, SHA-1. */
export function sign(params: Record<string, string | number>, secret = need().secret) {
  const base = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + secret).digest("hex");
}

/** Proves an upload response came from Cloudinary for our account. */
export function verifyUpload(publicId: string, version: number, signature: string) {
  return sign({ public_id: publicId, version }) === signature;
}

export type ResourceType = "image" | "video" | "raw";

/** Delivery type: "authenticated" files have no public URL and are fetched with privateDownload(). */
export type DeliveryType = "upload" | "authenticated";

export function uploadTicket(folder: string, resourceType: ResourceType, type: DeliveryType = "upload") {
  const c = need();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder: `${ROOT}/${folder}`, timestamp, use_filename: "true", unique_filename: "true", ...(type === "upload" ? {} : { type }) };
  return {
    url: `https://api.cloudinary.com/v1_1/${c.cloud}/${resourceType}/upload`,
    fields: { ...params, timestamp: String(timestamp), api_key: c.key, signature: sign(params, c.secret) },
  };
}

export async function destroy(publicId: string, resourceType: ResourceType, type: DeliveryType = "upload") {
  const c = need();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { public_id: publicId, timestamp, invalidate: "true", ...(type === "upload" ? {} : { type }) };
  const body = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: c.key, signature: sign(params, c.secret) });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/${resourceType}/destroy`, { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { result?: string };
  // "not found" is fine: the file is already gone.
  return json.result === "ok" || json.result === "not found";
}

/** A short-lived, signed link that downloads an authenticated file (Cloudinary's private download API). */
export function privateDownload(publicId: string, resourceType: ResourceType, format: string, ttlSeconds = 300) {
  const c = need();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { public_id: publicId, format, type: "authenticated", attachment: "true", expires_at: timestamp + ttlSeconds, timestamp };
  const q = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "").map(([k, v]) => [k, String(v)])), api_key: c.key, signature: sign(params, c.secret) });
  return `https://api.cloudinary.com/v1_1/${c.cloud}/${resourceType}/download?${q}`;
}

/** Plan usage and per-file limits, for the storage meter and upload checks. */
export async function usage() {
  const c = cloudinaryConfig();
  if (!c) return null;
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/usage`, {
      headers: { Authorization: `Basic ${Buffer.from(`${c.key}:${c.secret}`).toString("base64")}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      plan: string;
      credits?: { usage: number; limit: number; used_percent: number };
      storage?: { usage: number };
      media_limits?: { image_max_size_bytes: number; video_max_size_bytes: number; raw_max_size_bytes: number; image_max_px: number };
    };
    return {
      plan: j.plan,
      creditsPct: j.credits?.used_percent ?? 0,
      storageBytes: j.storage?.usage ?? 0,
      limits: {
        image: j.media_limits?.image_max_size_bytes ?? 10 * 1024 * 1024,
        video: j.media_limits?.video_max_size_bytes ?? 100 * 1024 * 1024,
        raw: j.media_limits?.raw_max_size_bytes ?? 10 * 1024 * 1024,
        imagePx: j.media_limits?.image_max_px ?? 25_000_000,
      },
    };
  } catch {
    return null;
  }
}
