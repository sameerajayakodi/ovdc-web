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
    entity: text("entity").$type<"unit" | "project" | "auth" | "lead" | "visit" | "media" | "plan" | "tour" | "sale" | "customer" | "content" | "settings">().notNull(),
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
    /** Job applications (kind "application") move through their own hiring stages */
    hrStage: text("hr_stage").$type<HrStage>().notNull().default("new"),
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

/* ───────── Media, floor plans, 360° tours ───────── */

export type MediaKind = "image" | "360" | "video" | "pdf";

/** Files in Cloudinary. The database keeps what the admin needs: folder, alt text, size, who uploaded it. */
export const media = pgTable(
  "media",
  {
    id: serial("id").primaryKey(),
    /** Cloudinary public_id, e.g. "ovdc/ocean-view-residences/tower-a-sunset_k3j2" */
    publicId: text("public_id").notNull().unique(),
    resourceType: text("resource_type").$type<"image" | "video" | "raw">().notNull(),
    kind: text("kind").$type<MediaKind>().notNull(),
    /** A project slug, or "web" for site-wide files */
    folder: text("folder").notNull().default("web"),
    name: text("name").notNull(),
    format: text("format").notNull().default(""),
    bytes: integer("bytes").notNull().default(0),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    /** Seconds, for video */
    duration: real("duration").notNull().default(0),
    /** Pages, for PDF */
    pages: integer("pages").notNull().default(0),
    /** Original file (secure_url) */
    url: text("url").notNull(),
    version: integer("version").notNull().default(0),
    alt: text("alt").notNull().default(""),
    uploadedBy: text("uploaded_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_folder").on(t.folder, t.createdAt), index("media_kind").on(t.kind)],
);

export interface PlanRoom {
  name: string;
  /** metres */
  w: number;
  l: number;
}

/** One layout (unit type) per row: sizes, rooms and the uploaded plan drawing. Feeds the website's floor plans. */
export const floorPlans = pgTable(
  "floor_plans",
  {
    id: serial("id").primaryKey(),
    projectSlug: text("project_slug")
      .notNull()
      .references(() => projects.slug, { onUpdate: "cascade", onDelete: "cascade" }),
    /** Short key used in URLs and the explorer, e.g. "C" */
    key: text("key").notNull(),
    /** Matches units.type, e.g. "Type C" */
    type: text("type").notNull(),
    label: text("label").notNull().default(""),
    sqft: integer("sqft").notNull().default(0),
    balcony: integer("balcony").notNull().default(0),
    facing: text("facing").notNull().default(""),
    view: text("view").notNull().default(""),
    rooms: jsonb("rooms").$type<PlanRoom[]>().notNull().default([]),
    mediaId: integer("media_id").references(() => media.id, { onDelete: "set null" }),
    sort: integer("sort").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("floor_plans_project_type").on(t.projectSlug, t.type)],
);

export interface TourHotspotRow {
  t: "nav" | "info";
  yaw: number;
  pitch: number;
  /** nav: scene key to go to */
  to?: string;
  /** info */
  id?: string;
  kicker?: string;
  title?: string;
  body?: string;
}

export const tours = pgTable("tours", {
  /** URL slug, e.g. "ovr-type-c" */
  id: text("id").primaryKey(),
  projectSlug: text("project_slug")
    .notNull()
    .references(() => projects.slug, { onUpdate: "cascade", onDelete: "cascade" }),
  /** Unit type the tour shows, e.g. "Type C" — every unit of that type links to it */
  type: text("type").notNull().default(""),
  /** Unit used for the price and status shown in the tour, e.g. "A-14B" */
  unitRef: text("unit_ref").notNull().default(""),
  title: text("title").notNull(),
  source: text("source").$type<"pano" | "embed">().notNull().default("pano"),
  /** Matterport or Kuula link when source = embed */
  embedUrl: text("embed_url").notNull().default(""),
  coverMediaId: integer("cover_media_id").references(() => media.id, { onDelete: "set null" }),
  bedrooms: text("bedrooms").notNull().default(""),
  bathrooms: text("bathrooms").notNull().default(""),
  parking: text("parking").notNull().default(""),
  /** Minimap rooms in a 200 × 140 plan space */
  planRooms: jsonb("plan_rooms").$type<{ id: string; x: number; y: number; w: number; h: number; label: string; outdoor?: boolean }[]>().notNull().default([]),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tourScenes = pgTable(
  "tour_scenes",
  {
    id: serial("id").primaryKey(),
    tourId: text("tour_id")
      .notNull()
      .references(() => tours.id, { onUpdate: "cascade", onDelete: "cascade" }),
    /** Stable id that hotspots link to, e.g. "living" */
    key: text("key").notNull(),
    name: text("name").notNull(),
    short: text("short").notNull().default(""),
    note: text("note").notNull().default(""),
    sort: integer("sort").notNull().default(0),
    /** Equirectangular image URL (Cloudinary or /public) */
    panorama: text("panorama").notNull(),
    thumb: text("thumb").notNull().default(""),
    mediaId: integer("media_id").references(() => media.id, { onDelete: "set null" }),
    /** Starting view (deg) */
    yaw: real("yaw").notNull().default(0),
    rot: real("rot").notNull().default(0),
    planX: real("plan_x").notNull().default(100),
    planY: real("plan_y").notNull().default(70),
    hotspots: jsonb("hotspots").$type<TourHotspotRow[]>().notNull().default([]),
  },
  (t) => [uniqueIndex("tour_scenes_key").on(t.tourId, t.key), index("tour_scenes_sort").on(t.tourId, t.sort)],
);

/* ───────── Reservations, sales and customers ───────── */

export type ReservationStatus = "reserved" | "sold" | "released" | "cancelled";
export type PaymentPlan = "construction" | "30-70" | "fx";
export type HrStage = "new" | "shortlisted" | "interview" | "offer" | "rejected";

/** Buyers: created from a lead when a unit is reserved, or added by hand. */
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    nic: text("nic").notNull().default(""),
    mobile: text("mobile").notNull().default(""),
    email: text("email").notNull().default(""),
    address: text("address").notNull().default(""),
    notes: text("notes").notNull().default(""),
    leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_name").on(t.name)],
);

/** A unit on hold for a customer (reserved) or sold to them. */
export const reservations = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    /** RS-2026-0001 */
    ref: text("ref").notNull().unique(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: text("status").$type<ReservationStatus>().notNull().default("reserved"),
    /** Agreed price, LKR millions */
    priceMn: mn("price_mn").notNull(),
    plan: text("plan").$type<PaymentPlan>().notNull().default("construction"),
    /** 0 draft · 1 sent · 2 signed by customer · 3 countersigned · 4 registered */
    agreementStep: integer("agreement_step").notNull().default(0),
    holdUntil: timestamp("hold_until", { withTimezone: true }),
    agent: text("agent").notNull().default(""),
    note: text("note").notNull().default(""),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reservations_unit").on(t.unitId), index("reservations_customer").on(t.customerId), index("reservations_status").on(t.status)],
);

/** The payment schedule of a reservation, one row per milestone; paid rows carry the receipt. */
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    sort: integer("sort").notNull().default(0),
    milestone: text("milestone").notNull(),
    condition: text("condition").notNull().default(""),
    /** Share of the price, percent (the booking fee row uses its fixed amount) */
    pct: real("pct").notNull().default(0),
    /** LKR */
    amount: integer("amount").notNull(),
    /** "YYYY-MM-DD", or "" until the milestone is reached */
    dueDate: text("due_date").notNull().default(""),
    paidAt: text("paid_at").notNull().default(""),
    paidAmount: integer("paid_amount").notNull().default(0),
    method: text("method").notNull().default(""),
    reference: text("reference").notNull().default(""),
    /** RC-2026-0001 */
    receiptNo: text("receipt_no").unique(),
    recordedBy: text("recorded_by").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_reservation").on(t.reservationId, t.sort)],
);

/** Private files (NIC copies, agreements). Stored as authenticated Cloudinary assets, never public URLs. */
export const customerDocuments = pgTable("customer_documents", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  publicId: text("public_id").notNull().unique(),
  resourceType: text("resource_type").$type<"image" | "raw">().notNull(),
  name: text("name").notNull(),
  format: text("format").notNull().default(""),
  bytes: integer("bytes").notNull().default(0),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────── Website content ───────── */

export interface PostBlock {
  h?: string;
  p: string;
}

/** News & blog posts. Shown on the site when published and the publish time has passed. */
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  dek: text("dek").notNull().default(""),
  category: text("category").$type<"Construction" | "Buying guide" | "Lifestyle" | "Company">().notNull().default("Company"),
  body: jsonb("body").$type<PostBlock[]>().notNull().default([]),
  /** Stock photo key (src/lib/data/media.ts) used when no cover is uploaded */
  photo: text("photo").notNull().default(""),
  coverMediaId: integer("cover_media_id").references(() => media.id, { onDelete: "set null" }),
  author: text("author").notNull().default(""),
  published: boolean("published").notNull().default(false),
  publishAt: timestamp("publish_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  group: text("group").notNull(),
  q: text("q").notNull(),
  a: text("a").notNull(),
  sort: integer("sort").notNull().default(0),
  published: boolean("published").notNull().default(true),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  team: text("team").notNull().default(""),
  location: text("location").notNull().default(""),
  type: text("type").notNull().default("Full-time"),
  summary: text("summary").notNull().default(""),
  duties: jsonb("duties").$type<string[]>().notNull().default([]),
  needs: jsonb("needs").$type<string[]>().notNull().default([]),
  /** "YYYY-MM-DD" or "" for open until filled */
  closes: text("closes").notNull().default(""),
  open: boolean("open").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  quote: text("quote").notNull(),
  published: boolean("published").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const awards = pgTable("awards", {
  id: serial("id").primaryKey(),
  year: text("year").notNull(),
  title: text("title").notNull(),
  by: text("by").notNull().default(""),
  project: text("project").notNull().default(""),
  shown: boolean("shown").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export type ProjectRow = typeof projects.$inferSelect;
export type UnitRow = typeof units.$inferSelect;
export type ActivityRow = typeof activity.$inferSelect;
export type LeadRow = typeof leads.$inferSelect;
export type LeadEventRow = typeof leadEvents.$inferSelect;
export type VisitRow = typeof visits.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type FloorPlanRow = typeof floorPlans.$inferSelect;
export type TourRow = typeof tours.$inferSelect;
export type TourSceneRow = typeof tourScenes.$inferSelect;
export type CustomerRow = typeof customers.$inferSelect;
export type ReservationRow = typeof reservations.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type CustomerDocumentRow = typeof customerDocuments.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type FaqRow = typeof faqs.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type TestimonialRow = typeof testimonials.$inferSelect;
export type AwardRow = typeof awards.$inferSelect;
