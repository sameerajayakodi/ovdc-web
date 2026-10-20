/** Cache tags shared by the website reads (api.ts) and the admin writes. */
export const TAGS = {
  projects: "projects",
  inventory: "inventory",
  inventoryOf: (slug: string) => `inventory:${slug}`,
} as const;
