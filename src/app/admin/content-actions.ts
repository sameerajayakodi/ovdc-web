"use server";

import { refresh, updateTag } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { HrStage, PostBlock } from "@/db/schema";
import { requireAdmin, type Admin } from "@/lib/admin/auth";
import { slugify } from "@/lib/admin/format";
import { TAGS } from "@/lib/cacheTags";
import { POST_CATEGORIES, HR_STAGES } from "@/lib/admin/content";
import type { ActionResult } from "@/lib/admin/types";

function need() {
  if (!db) throw new Error("The database is not configured (DATABASE_URL).");
  return db;
}

const txt = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, max = 20) => (Array.isArray(v) ? v.map((x) => txt(x, 300)).filter(Boolean).slice(0, max) : []);

function log(admin: Admin, ref: string, action: string, name: string, detail: Record<string, unknown> = {}) {
  return need().insert(schema.activity).values({ actor: admin.username, entity: "content", ref, action, detail: { name, ...detail } });
}

function changed() {
  updateTag(TAGS.content);
  refresh();
}

/* ───────── News ───────── */

export interface PostInput {
  title: string;
  slug: string;
  dek: string;
  category: (typeof POST_CATEGORIES)[number];
  body: PostBlock[];
  photo: string;
  coverMediaId: number | null;
  author: string;
  published: boolean;
  /** ISO time */
  publishAt: string;
}

export async function savePost(id: number | null, input: PostInput): Promise<ActionResult<{ id: number }>> {
  const admin = await requireAdmin();
  const d = need();
  const f: Record<string, string> = {};
  const title = txt(input.title, 160);
  if (title.length < 5) f.title = "Give the post a title.";
  const slug = slugify(txt(input.slug, 80) || title);
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) f.slug = "Use lowercase letters, numbers and dashes.";
  else if (!slug && !f.title) f.slug = "Enter a web address, e.g. pool-deck-complete.";
  const category = POST_CATEGORIES.includes(input.category) ? input.category : "Company";
  const body = (Array.isArray(input.body) ? input.body : [])
    .slice(0, 60)
    .map((b) => ({ ...(txt(b.h, 160) ? { h: txt(b.h, 160) } : {}), p: txt(b.p, 4000) }))
    .filter((b) => b.p || b.h);
  if (!body.length) f.body = "Write at least one paragraph.";
  const publishAt = Date.parse(input.publishAt);
  if (!Number.isFinite(publishAt)) f.publishAt = "Choose when to publish.";
  if (slug && !f.slug) {
    const [dup] = await d.select({ id: schema.posts.id }).from(schema.posts).where(and(eq(schema.posts.slug, slug), ...(id ? [ne(schema.posts.id, id)] : []))).limit(1);
    if (dup) f.slug = "Another post already uses this web address.";
  }
  if (input.coverMediaId != null) {
    const [m] = await d.select({ kind: schema.media.kind }).from(schema.media).where(eq(schema.media.id, input.coverMediaId)).limit(1);
    if (!m || m.kind !== "image") f.cover = "Choose a photo from the Media library.";
  }
  if (Object.keys(f).length) return { ok: false, error: Object.values(f)[0], fields: f };

  const values = {
    title,
    slug,
    dek: txt(input.dek, 300),
    category,
    body,
    photo: txt(input.photo, 40),
    coverMediaId: input.coverMediaId ?? null,
    author: txt(input.author, 80),
    published: !!input.published,
    publishAt: new Date(publishAt),
    updatedAt: new Date(),
  };
  const live = values.published && publishAt <= Date.now();
  if (id == null) {
    const [row] = await d.insert(schema.posts).values(values).returning({ id: schema.posts.id });
    await log(admin, `post:${row.id}`, values.published ? (live ? "published" : "scheduled") : "drafted", title);
    changed();
    return { ok: true, data: { id: row.id }, message: values.published ? (live ? "Published · live on the website" : "Scheduled") : "Saved as draft" };
  }
  const [before] = await d.select({ published: schema.posts.published }).from(schema.posts).where(eq(schema.posts.id, id)).limit(1);
  if (!before) return { ok: false, error: "This post no longer exists." };
  await d.batch([
    d.update(schema.posts).set(values).where(eq(schema.posts.id, id)),
    log(admin, `post:${id}`, values.published !== before.published ? (values.published ? (live ? "published" : "scheduled") : "unpublished") : "updated", title),
  ]);
  changed();
  return { ok: true, data: { id }, message: values.published ? (live ? "Saved · live on the website" : "Saved · scheduled") : "Saved as draft" };
}

export async function deletePost(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const [row] = await d.delete(schema.posts).where(eq(schema.posts.id, id)).returning({ title: schema.posts.title });
  if (!row) return { ok: false, error: "This post no longer exists." };
  await log(admin, `post:${id}`, "deleted", row.title);
  changed();
  return { ok: true, message: `${row.title} deleted` };
}

/* ───────── Lists edited as a whole: FAQ, testimonials, awards, jobs ───────── */

export interface FaqInput {
  group: string;
  q: string;
  a: string;
  published: boolean;
}
export interface TestimonialInput {
  name: string;
  role: string;
  quote: string;
  published: boolean;
}
export interface AwardInput {
  year: string;
  title: string;
  by: string;
  project: string;
  shown: boolean;
}
export interface JobInput {
  slug: string;
  title: string;
  team: string;
  location: string;
  type: string;
  summary: string;
  duties: string[];
  needs: string[];
  closes: string;
  open: boolean;
}

type ListKind = "faq" | "testimonials" | "awards" | "jobs";
const LABEL: Record<ListKind, string> = { faq: "FAQ", testimonials: "Testimonials", awards: "Awards", jobs: "Careers" };

/** Replaces the whole list in one transaction: order, edits, additions and removals together. */
export async function saveList(kind: "faq", rows: FaqInput[]): Promise<ActionResult>;
export async function saveList(kind: "testimonials", rows: TestimonialInput[]): Promise<ActionResult>;
export async function saveList(kind: "awards", rows: AwardInput[]): Promise<ActionResult>;
export async function saveList(kind: "jobs", rows: JobInput[]): Promise<ActionResult>;
export async function saveList(kind: ListKind, rows: unknown[]): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  if (!Array.isArray(rows) || rows.length > 300) return { ok: false, error: "Too many rows." };
  const f: Record<string, string> = {};
  const bad = (i: number, msg: string) => (f[`row${i}`] ??= msg);
  const del = { faq: schema.faqs, testimonials: schema.testimonials, awards: schema.awards, jobs: schema.jobs }[kind];

  let insert;
  if (kind === "faq") {
    const v = (rows as FaqInput[]).map((r, i) => {
      const row = { group: txt(r.group, 60), q: txt(r.q, 300), a: txt(r.a, 3000), published: r.published !== false, sort: i };
      if (!row.group) bad(i, `Question ${i + 1}: choose a group.`);
      else if (!row.q || !row.a) bad(i, `Question ${i + 1}: enter the question and the answer.`);
      return row;
    });
    insert = v.length ? d.insert(schema.faqs).values(v) : null;
  } else if (kind === "testimonials") {
    const v = (rows as TestimonialInput[]).map((r, i) => {
      const row = { name: txt(r.name, 120), role: txt(r.role, 120), quote: txt(r.quote, 800), published: r.published !== false, sort: i };
      if (!row.name || !row.quote) bad(i, `Testimonial ${i + 1}: enter the name and the quote.`);
      return row;
    });
    insert = v.length ? d.insert(schema.testimonials).values(v) : null;
  } else if (kind === "awards") {
    const v = (rows as AwardInput[]).map((r, i) => {
      const row = { year: txt(r.year, 4), title: txt(r.title, 160), by: txt(r.by, 160), project: txt(r.project, 120), shown: r.shown !== false, sort: i };
      if (!/^(19|20)\d\d$/.test(row.year)) bad(i, `Award ${i + 1}: enter the year, e.g. 2025.`);
      else if (!row.title) bad(i, `Award ${i + 1}: enter the award title.`);
      return row;
    });
    insert = v.length ? d.insert(schema.awards).values(v) : null;
  } else {
    const slugs = new Set<string>();
    const v = (rows as JobInput[]).map((r, i) => {
      const title = txt(r.title, 120);
      const slug = slugify(txt(r.slug, 80) || title);
      const row = { slug, title, team: txt(r.team, 60), location: txt(r.location, 80), type: txt(r.type, 40) || "Full-time", summary: txt(r.summary, 400), duties: list(r.duties), needs: list(r.needs), closes: /^\d{4}-\d{2}-\d{2}$/.test(r.closes ?? "") ? r.closes : "", open: r.open !== false, sort: i, updatedAt: new Date() };
      if (!title) bad(i, `Role ${i + 1}: enter the job title.`);
      else if (slugs.has(slug)) bad(i, `${title}: two roles share the web address “${slug}”.`);
      slugs.add(slug);
      return row;
    });
    insert = v.length ? d.insert(schema.jobs).values(v) : null;
  }
  if (Object.keys(f).length) return { ok: false, error: Object.values(f)[0], fields: f };

  await d.batch([d.delete(del), ...(insert ? [insert] : []), log(admin, kind, "updated", LABEL[kind], { rows: rows.length })]);
  changed();
  return { ok: true, message: `${LABEL[kind]} saved · live on the website` };
}

/* ───────── Applications and form submissions (stored as leads) ───────── */

export async function setHrStage(leadId: number, stage: HrStage): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  if (!HR_STAGES.some((s) => s.k === stage)) return { ok: false, error: "Unknown stage." };
  const [row] = await d
    .update(schema.leads)
    .set({ hrStage: stage, updatedAt: new Date() })
    .where(and(eq(schema.leads.id, leadId), eq(schema.leads.kind, "application")))
    .returning({ name: schema.leads.name, interest: schema.leads.interest });
  if (!row) return { ok: false, error: "This application no longer exists." };
  const label = HR_STAGES.find((s) => s.k === stage)!.label;
  await d.batch([
    d.insert(schema.leadEvents).values({ leadId, actor: admin.name, type: "stage", text: `Application → ${label}` }),
    log(admin, `application:${leadId}`, `application → ${label}`, row.name || "Applicant", { role: row.interest }),
  ]);
  refresh();
  return { ok: true, message: `${row.name || "Applicant"}: ${label}` };
}

/** Turns a newsletter, contact or portal form into a sales enquiry in the Leads inbox. */
export async function convertToLead(leadId: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const [row] = await d
    .update(schema.leads)
    .set({ kind: "enquiry", stage: "new", updatedAt: new Date() })
    .where(and(eq(schema.leads.id, leadId), ne(schema.leads.kind, "enquiry")))
    .returning({ name: schema.leads.name, email: schema.leads.email });
  if (!row) return { ok: false, error: "This submission is already a lead." };
  await d.batch([
    d.insert(schema.leadEvents).values({ leadId, actor: admin.name, type: "edit", text: "Converted from a website form to a sales lead" }),
    d.insert(schema.activity).values({ actor: admin.username, entity: "lead", ref: String(leadId), action: "converted to a lead", detail: { name: row.name || row.email } }),
  ]);
  refresh();
  return { ok: true, message: `${row.name || row.email} is now in the Leads inbox` };
}
