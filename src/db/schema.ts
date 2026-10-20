import { boolean, index, integer, jsonb, numeric, pgTable, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/** LKR millions are stored as numeric(10,1) and read back as numbers in the data layer. */
const mn = (name: string) => numeric(name, { precision: 10, scale: 1, mode: "number" });

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  loc: text("loc").notNull(),
  address: text("address").notNull().default(""),
  type: text("type").notNull(),
  /** uc = under construction · done = completed · soon = upcoming */
  status: text("status").$type<"uc" | "done" | "soon">().notNull(),
  fromMn: mn("from_mn"),
  tour: boolean("tour").notNull().default(false),
  explorer: boolean("explorer").notNull().default(false),
  progress: integer("progress").notNull().default(0),
  completion: text("completion").notNull().default(""),
  uda: text("uda").notNull().default(""),
  units: integer("units").notNull().default(0),
  floors: integer("floors").notNull().default(0),
  towers: text("towers").notNull().default(""),
  beds: text("beds").notNull().default(""),
  /** Manual availability for projects without per-unit inventory. */
  availableManual: integer("available_manual").notNull().default(0),
  lat: real("lat").notNull().default(6.9271),
  lng: real("lng").notNull().default(79.8612),
  blurb: text("blurb").notNull().default(""),
  published: boolean("published").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  sort: integer("sort").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const units = pgTable(
  "units",
  {
    id: serial("id").primaryKey(),
    projectSlug: text("project_slug")
      .notNull()
      .references(() => projects.slug, { onUpdate: "cascade", onDelete: "cascade" }),
    tower: text("tower").notNull(),
    floor: integer("floor").notNull(),
    /** Position on the floor plate, A–F */
    letter: text("letter").notNull(),
    /** e.g. "14B" */
    code: text("code").notNull(),
    type: text("type").notNull(),
    beds: integer("beds").notNull(),
    label: text("label").notNull(),
    baths: real("baths").notNull(),
    sqft: integer("sqft").notNull(),
    balcony: integer("balcony").notNull(),
    facing: text("facing").notNull(),
    view: text("view").$type<"Sea" | "City">().notNull(),
    /** A = available · R = reserved · S = sold · B = blocked / not released */
    status: text("status").$type<"A" | "R" | "S" | "B">().notNull(),
    priceMn: mn("price_mn").notNull(),
    note: text("note").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("units_project_tower_code").on(t.projectSlug, t.tower, t.code), index("units_project_tower").on(t.projectSlug, t.tower)],
);

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id")
    .notNull()
    .references(() => units.id, { onDelete: "cascade" }),
  priceMn: mn("price_mn").notNull(),
  previousMn: mn("previous_mn"),
  changedBy: text("changed_by").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Who changed what and when — shown on the dashboard and the Activity page. */
export const activity = pgTable(
  "activity",
  {
    id: serial("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actor: text("actor").notNull(),
    entity: text("entity").$type<"unit" | "project" | "auth">().notNull(),
    ref: text("ref").notNull(),
    action: text("action").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index("activity_at").on(t.at)],
);

export type ProjectRow = typeof projects.$inferSelect;
export type UnitRow = typeof units.$inferSelect;
export type ActivityRow = typeof activity.$inferSelect;
