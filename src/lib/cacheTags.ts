/** Cache tags shared by the website reads (api.ts) and the admin writes. */
export const TAGS = {
  projects: "projects",
  inventory: "inventory",
  inventoryOf: (slug: string) => `inventory:${slug}`,
  /** Unit layouts and floor plans (floor_plans) */
  plans: "plans",
  plansOf: (slug: string) => `plans:${slug}`,
  tours: "tours",
} as const;
