import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/shortlist", "/admin"] }],
    sitemap: "https://ovdc.lk/sitemap.xml",
  };
}
