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
    entity: text("entity").$type<"unit" | "project" | "auth" | "lead" | "visit">().notNull(),
    ref: text("ref").notNull(),
    action: text("action").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index("activity_at").on(t.at)],
);

/* ───────── Sales & CRM ───────── */

export type LeadKind = "enquiry" | "brochure" | "site-visit" | "newsletter" | "contact" | "reservation" | "application" | "portal-access";
/** new → contacted → visit (site visit booked) → negotiation → reserved → won, or lost at any point */
export type LeadStage = "new" | "contacted" | "visit" | "negotiation" | "reserved" | "won" | "lost";
export type LeadEventType = "created" | "note" | "stage" | "assign" | "call" | "whatsapp" | "email" | "visit" | "follow-up" | "edit" | "merge";
export type VisitStatus = "pending" | "confirmed" | "completed" | "no-show" | "rescheduled" | "cancelled";
export type VisitType = "site" | "gallery" | "video";

/** Every website form submission, plus leads staff add by hand. */
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind").$type<LeadKind>().notNull(),
    /** "Website" for form posts; Walk-in, Referral… for leads added in the console */
    source: text("source").notNull().default("Website"),
    stage: text("stage").$type<LeadStage>().notNull().default("new"),
    name: text("name").notNull().default(""),
    mobile: text("mobile").notNull().default(""),
    /** Last 9 digits of the mobile, used to spot duplicates */
    phoneKey: text("phone_key").notNull().default(""),
    email: text("email").notNull().default(""),
    project: text("project").notNull().default(""),
    unit: text("unit").notNull().default(""),
    interest: text("interest").notNull().default(""),
    budget: text("budget").notNull().default(""),
    message: text("message").notNull().default(""),
    url: text("url").notNull().default(""),
    /** Website path the form was sent from */
    page: text("page").notNull().default(""),
    /** Visit request as sent by the website form (the booked visit itself lives in `visits`) */
    visitDate: text("visit_date").notNull().default(""),
    visitSlot: text("visit_slot").notNull().default(""),
    visitType: text("visit_type").notNull().default(""),
    agent: text("agent").notNull().default(""),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    /** First time the lead left the "new" stage, for response-time stats */
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    lostReason: text("lost_reason").notNull().default(""),
    /** Salted SHA-256 of the sender's IP, for throttling. Never the raw address. */
    ipHash: text("ip_hash").notNull().default(""),
  },
  (t) => [
    index("leads_created").on(t.createdAt),
    index("leads_stage").on(t.stage),
    index("leads_phone_key").on(t.phoneKey),
    index("leads_ip_created").on(t.ipHash, t.createdAt),
  ],
);

/** A lead's timeline: notes, calls, stage changes, visits. */
export const leadEvents = pgTable(
  "lead_events",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actor: text("actor").notNull(),
    type: text("type").$type<LeadEventType>().notNull(),
    text: text("text").notNull().default(""),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index("lead_events_lead").on(t.leadId, t.at)],
);

export const visits = pgTable(
  "visits",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(60),
    type: text("type").$type<VisitType>().notNull().default("site"),
    /** Show apartment, sales gallery or "Video call" */
    location: text("location").notNull(),
    project: text("project").notNull().default(""),
    party: integer("party").notNull().default(2),
    agent: text("agent").notNull().default(""),
    status: text("status").$type<VisitStatus>().notNull().default("pending"),
    note: text("note").notNull().default(""),
    /** "website" or the admin who booked it */
    bookedBy: text("booked_by").notNull().default("website"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("visits_starts").on(t.startsAt), index("visits_lead").on(t.leadId)],
);

/** Small console settings, e.g. visit slot capacity per location. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type UnitRow = typeof units.$inferSelect;
export type ActivityRow = typeof activity.$inferSelect;
export type LeadRow = typeof leads.$inferSelect;
export type LeadEventRow = typeof leadEvents.$inferSelect;
export type VisitRow = typeof visits.$inferSelect;
