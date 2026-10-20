"use client";

/**
 * next/image loader. Unsplash photos are resized by Unsplash's own CDN (their
 * recommended hotlinking), so the browser never waits on a server-side fetch.
 * Cloudinary uploads (admin Media library) are resized and converted to
 * WebP/AVIF by Cloudinary. Local files under /public are served as they are.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 75));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    return url.toString();
  }
  if (src.startsWith("https://res.cloudinary.com/")) {
    return src.replace(/\/image\/upload\/(?:[a-z]_[^/]*\/)*/, `/image/upload/f_auto,q_${quality ?? "auto"},w_${width},c_limit/`);
  }
  return src;
}
