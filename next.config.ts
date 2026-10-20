import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack inside this project (a stray package-lock.json exists in the user's home folder).
  turbopack: { root: process.cwd() },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Stock photography is resized by the Unsplash CDN (see src/lib/imageLoader.ts and src/lib/data/media.ts).
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.ts",
  },
};

export default nextConfig;
