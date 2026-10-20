/**
 * Delivery URLs for Cloudinary files (client and server safe). Cloudinary
 * resizes and converts on the fly, e.g. `f_auto` serves WebP or AVIF.
 */

export const isCloudinary = (url: string) => url.startsWith("https://res.cloudinary.com/");

/** Inserts a transformation after /upload/, e.g. cld(url, "f_auto,q_auto,w_800"). Other URLs pass through. */
export function cld(url: string, transform: string) {
  if (!isCloudinary(url)) return url;
  return url.replace(/\/(image|video)\/upload\/(?:[a-z]_[^/]*\/)*/, (_m, t) => `/${t}/upload/${transform}/`);
}

/** Thumbnail for any kind: a video frame, or page 1 of a PDF, as an image. */
export function thumbUrl(m: { url: string; kind: string }, w = 360, h = Math.round((w * 3) / 4)) {
  const t = `c_fill,g_auto,w_${w},h_${h},q_auto`;
  if (m.kind === "video") return cld(m.url, `${t},so_1,f_jpg`).replace(/\.[a-z0-9]+$/i, ".jpg");
  if (m.kind === "pdf") return cld(m.url, `${t},pg_1,f_jpg`).replace(/\.pdf$/i, ".jpg");
  return cld(m.url, `${t},f_auto`);
}

/** Panorama for the WebGL viewer: JPEG (every GPU path decodes it), capped at 4096 px wide. */
export function panoUrl(url: string) {
  return cld(url, "f_jpg,q_auto:good,w_4096,c_limit");
}

export function bytesLabel(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}
