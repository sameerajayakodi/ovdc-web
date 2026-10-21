import type { MetadataRoute } from "next";
import { getAllUnitRefs, getArticles, getProjects, getRoles, getTours } from "@/lib/api";
import { routes } from "@/lib/routes";

const BASE = "https://ovdc.lk";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, tours, units, articles, roles] = await Promise.all([getProjects(), getTours(), getAllUnitRefs(), getArticles(), getRoles()]);
  const pages = [
    "/", routes.projects, routes.tours, routes.about, routes.contact, routes.bookVisit(), routes.news, routes.gallery, routes.progress,
    routes.buyersGuide, routes.overseas, routes.calculators, routes.awards, routes.careers, routes.faq, routes.portal, routes.legal,
  ];
  return [
    ...pages.map((p) => ({ url: `${BASE}${p}`, changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...projects.map((p) => ({ url: `${BASE}${routes.project(p.slug)}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...projects.filter((p) => p.explorer).map((p) => ({ url: `${BASE}${routes.explorer(p.slug)}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...units.map((u) => ({ url: `${BASE}${routes.unit(u.slug, u.unit)}`, changeFrequency: "daily" as const, priority: 0.5 })),
    ...tours.map((t) => ({ url: `${BASE}${routes.tour(t.id)}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...articles.map((a) => ({ url: `${BASE}${routes.article(a.slug)}`, lastModified: a.date, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...roles.map((r) => ({ url: `${BASE}${routes.career(r.slug)}`, changeFrequency: "weekly" as const, priority: 0.4 })),
  ];
}
