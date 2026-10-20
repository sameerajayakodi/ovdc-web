"use client";

/**
 * next/image loader. Unsplash photos are resized by Unsplash's own CDN (their
 * recommended hotlinking), so the browser never waits on a server-side fetch.
 * Local files under /public are served as they are.
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
  return src;
}
