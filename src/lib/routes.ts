export const routes = {
  home: "/",
  projects: "/projects",
  project: (slug: string) => `/projects/${slug}`,
  explorer: (slug: string, tower?: string, floor?: number) =>
    `/projects/${slug}/explorer${tower ? `?tower=${tower}${floor ? `&floor=${floor}` : ""}` : ""}`,
  unit: (slug: string, ref: string) => `/projects/${slug}/units/${ref}`,
  tour: (id: string, from?: string) => `/tours/${id}${from ? `?from=${encodeURIComponent(from)}` : ""}`,
  tours: "/3d-tours",
  about: "/about",
  contact: "/contact",
  bookVisit: (q?: { project?: string; unit?: string }) => {
    const p = new URLSearchParams();
    if (q?.project) p.set("project", q.project);
    if (q?.unit) p.set("unit", q.unit);
    const s = p.toString();
    return `/book-a-visit${s ? `?${s}` : ""}`;
  },
  news: "/news",
  article: (slug: string) => `/news/${slug}`,
  career: (slug: string) => `/careers/${slug}`,
  shortlist: "/shortlist",
  credits: "/credits",
  gallery: "/gallery",
  progress: "/construction-progress",
  buyersGuide: "/buyers-guide",
  overseas: "/overseas-buyers",
  calculators: "/calculators",
  awards: "/awards",
  careers: "/careers",
  faq: "/faq",
  portal: "/customer-portal",
  legal: "/legal",
} as const;

/** Main navigation (after the Projects mega menu). */
export const mainNav = [
  { k: "residences", label: "Residences", href: "/projects/ocean-view-residences/explorer" },
  { k: "3d", label: "3D & 360°", href: routes.tours },
  { k: "about", label: "About", href: routes.about },
  { k: "news", label: "News", href: routes.news },
  { k: "contact", label: "Contact", href: routes.contact },
];
