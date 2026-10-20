"use server";

import { refresh } from "next/cache";
import { and, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { LeadEventType, LeadStage, VisitStatus, VisitType } from "@/db/schema";
import { requireAdmin, type Admin } from "@/lib/admin/auth";
import { CAPACITY_KEY, getCapacity, getLeadDetail, getVisit } from "@/lib/admin/crmQueries";
import {
  DEFAULT_CAPACITY,
  STAGE_NAME,
  VISIT_STATUS_NAME,
  addDays,
  at,
  clock,
  dayLabel,
  isStage,
  isYmd,
  phoneKey,
  visitLocation,
  ymdOf,
} from "@/lib/admin/crm";
import type { ActionResult, AdminVisit, LeadDetail } from "@/lib/admin/types";

function need() {
  if (!db) throw new Error("The database is not configured (DATABASE_URL).");
  return db;
}

const txt = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const validId = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function event(leadId: number, actor: string, type: LeadEventType, text: string, detail: Record<string, unknown> = {}) {
  return need().insert(schema.leadEvents).values({ leadId, actor, type, text, detail });
}
function log(admin: Admin, entity: "lead" | "visit", ref: string | number, action: string, detail: Record<string, unknown> = {}) {
  return need().insert(schema.activity).values({ actor: admin.username, entity, ref: String(ref), action, detail });
}

async function detailResult(id: number, message?: string): Promise<ActionResult<LeadDetail>> {
  const detail = await getLeadDetail(id);
  refresh();
  return detail ? { ok: true, data: detail, message } : { ok: false, error: "This lead no longer exists." };
}

/* ───────── Leads ───────── */

export async function loadLead(id: number): Promise<ActionResult<LeadDetail>> {
  await requireAdmin();
  if (!validId(id)) return { ok: false, error: "Unknown lead." };
  const detail = await getLeadDetail(id);
  return detail ? { ok: true, data: detail } : { ok: false, error: "This lead no longer exists." };
}

export interface LeadPatch {
  stage?: LeadStage;
  agent?: string;
  /** ISO time, or null to clear the reminder */
  followUpAt?: string | null;
  budget?: string;
  lostReason?: string;
  name?: string;
  mobile?: string;
  email?: string;
  project?: string;
  interest?: string;
}

const EDITABLE = ["name", "mobile", "email", "project", "interest", "budget", "lostReason"] as const;
const FIELD_LABEL: Record<(typeof EDITABLE)[number], string> = {
  name: "name",
  mobile: "mobile",
  email: "email",
  project: "project",
  interest: "interest",
  budget: "budget",
  lostReason: "lost reason",
};

export async function updateLead(id: number, patch: LeadPatch): Promise<ActionResult<LeadDetail>> {
  const admin = await requireAdmin();
  const d = need();
  if (!validId(id)) return { ok: false, error: "Unknown lead." };
  const [before] = await d.select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
  if (!before) return { ok: false, error: "This lead no longer exists." };

  const set: Partial<typeof schema.leads.$inferInsert> = {};
  const events: ReturnType<typeof event>[] = [];
  const parts: string[] = [];

  if (patch.stage !== undefined && patch.stage !== before.stage) {
    if (!isStage(patch.stage)) return { ok: false, error: "Unknown stage." };
    set.stage = patch.stage;
    if (before.stage === "new" && !before.respondedAt) set.respondedAt = new Date();
    if (patch.stage === "lost" || patch.stage === "won") set.followUpAt = null;
    events.push(event(id, admin.name, "stage", `${STAGE_NAME[before.stage]} → ${STAGE_NAME[patch.stage]}`, { from: before.stage, to: patch.stage }));
    parts.push(`stage → ${STAGE_NAME[patch.stage]}`);
  }
  if (patch.agent !== undefined && txt(patch.agent, 80) !== before.agent) {
    set.agent = txt(patch.agent, 80);
    events.push(event(id, admin.name, "assign", set.agent ? `Assigned to ${set.agent}` : "Unassigned"));
    parts.push(set.agent ? `assigned to ${set.agent}` : "unassigned");
  }
  if (patch.followUpAt !== undefined) {
    const ms = patch.followUpAt === null ? null : Date.parse(patch.followUpAt);
    if (ms !== null && !Number.isFinite(ms)) return { ok: false, error: "Enter a valid follow-up date and time." };
    if ((ms ?? null) !== (before.followUpAt?.getTime() ?? null)) {
      set.followUpAt = ms === null ? null : new Date(ms);
      const label = ms === null ? "Follow-up reminder cleared" : `Follow-up set for ${dayLabel(ymdOf(ms))}, ${clock(ms)}`;
      events.push(event(id, admin.name, "follow-up", label));
      parts.push(ms === null ? "follow-up cleared" : "follow-up set");
    }
  }
  const edited: string[] = [];
  for (const k of EDITABLE) {
    if (patch[k] === undefined) continue;
    const v = k === "email" ? txt(patch[k], 160).toLowerCase() : txt(patch[k], k === "lostReason" ? 300 : 120);
    if (v === before[k]) continue;
    if (k === "email" && v && !EMAIL.test(v)) return { ok: false, error: "Check the email address.", fields: { email: "Check the email address." } };
    if (k === "name" && !v) return { ok: false, error: "Enter the lead's name.", fields: { name: "Enter the lead's name." } };
    set[k] = v;
    if (k === "mobile") set.phoneKey = phoneKey(v);
    edited.push(FIELD_LABEL[k]);
  }
  if (edited.length) {
    events.push(event(id, admin.name, "edit", `Updated ${edited.join(", ")}`, { fields: edited }));
    parts.push(`${edited.join(", ")} updated`);
  }

  if (!Object.keys(set).length) return detailResult(id);
  await d.batch([
    d.update(schema.leads).set({ ...set, updatedAt: new Date() }).where(eq(schema.leads.id, id)),
    ...events,
    log(admin, "lead", id, parts.join(" · "), { name: set.name ?? before.name, ...(set.stage ? { from: before.stage, to: set.stage } : {}) }),
  ]);
  const name = set.name ?? before.name;
  return detailResult(id, set.stage ? `${name} moved to ${STAGE_NAME[set.stage]}` : set.agent !== undefined ? `${name} ${set.agent ? `assigned to ${set.agent}` : "unassigned"}` : "Lead updated");
}

export async function bulkUpdateLeads(ids: number[], patch: { stage?: LeadStage; agent?: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const list = [...new Set(ids)].filter(validId);
  if (!list.length || list.length > 1000) return { ok: false, error: "Select at least one lead." };
  if (patch.stage !== undefined && !isStage(patch.stage)) return { ok: false, error: "Unknown stage." };
  if (patch.stage === undefined && patch.agent === undefined) return { ok: false, error: "Nothing to change." };

  const rows = await d.select({ id: schema.leads.id, stage: schema.leads.stage, agent: schema.leads.agent, respondedAt: schema.leads.respondedAt }).from(schema.leads).where(inArray(schema.leads.id, list));
  if (!rows.length) return { ok: false, error: "These leads no longer exist." };
  const agent = patch.agent !== undefined ? txt(patch.agent, 80) : undefined;
  const now = new Date();
  const ops = [];
  for (const r of rows) {
    const set: Partial<typeof schema.leads.$inferInsert> = { updatedAt: now };
    if (patch.stage && patch.stage !== r.stage) {
      set.stage = patch.stage;
      if (r.stage === "new" && !r.respondedAt) set.respondedAt = now;
      if (patch.stage === "lost" || patch.stage === "won") set.followUpAt = null;
      ops.push(event(r.id, admin.name, "stage", `${STAGE_NAME[r.stage]} → ${STAGE_NAME[patch.stage]}`, { from: r.stage, to: patch.stage, bulk: true }));
    }
    if (agent !== undefined && agent !== r.agent) {
      set.agent = agent;
      ops.push(event(r.id, admin.name, "assign", agent ? `Assigned to ${agent}` : "Unassigned", { bulk: true }));
    }
    if (Object.keys(set).length > 1) ops.push(d.update(schema.leads).set(set).where(eq(schema.leads.id, r.id)));
  }
  if (!ops.length) return { ok: true, message: "No changes to save" };
  const what = [patch.stage ? `stage → ${STAGE_NAME[patch.stage]}` : "", agent !== undefined ? (agent ? `assigned to ${agent}` : "unassigned") : ""].filter(Boolean).join(" · ");
  await d.batch([log(admin, "lead", `${rows.length} leads`, what, { ids: rows.map((r) => r.id).slice(0, 100) }), ...ops]);
  refresh();
  return { ok: true, message: `${rows.length} lead${rows.length === 1 ? "" : "s"} updated` };
}

export async function addLeadNote(id: number, text: string): Promise<ActionResult<LeadDetail>> {
  const admin = await requireAdmin();
  const d = need();
  const note = txt(text, 2000);
  if (!validId(id)) return { ok: false, error: "Unknown lead." };
  if (!note) return { ok: false, error: "Write a note first." };
  const [lead] = await d.update(schema.leads).set({ updatedAt: new Date() }).where(eq(schema.leads.id, id)).returning({ name: schema.leads.name });
  if (!lead) return { ok: false, error: "This lead no longer exists." };
  await d.batch([event(id, admin.name, "note", note), log(admin, "lead", id, "note added", { name: lead.name })]);
  return detailResult(id, `Note added to ${lead.name}`);
}

const CHANNEL = { call: "Call", whatsapp: "WhatsApp", email: "Email" } as const;

/** Records an outgoing call / WhatsApp / email. A new lead becomes "Contacted". */
export async function logContact(id: number, channel: keyof typeof CHANNEL): Promise<ActionResult<LeadDetail>> {
  const admin = await requireAdmin();
  const d = need();
  if (!validId(id) || !(channel in CHANNEL)) return { ok: false, error: "Unknown lead." };
  const [before] = await d.select({ stage: schema.leads.stage, name: schema.leads.name, respondedAt: schema.leads.respondedAt }).from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
  if (!before) return { ok: false, error: "This lead no longer exists." };
  const advance = before.stage === "new";
  const now = new Date();
  await d.batch([
    d
      .update(schema.leads)
      .set({ updatedAt: now, ...(advance ? { stage: "contacted" as const } : {}), ...(!before.respondedAt ? { respondedAt: now } : {}) })
      .where(eq(schema.leads.id, id)),
    event(id, admin.name, channel, `${CHANNEL[channel]} by ${admin.name}`),
    ...(advance ? [event(id, admin.name, "stage", "New → Contacted", { from: "new", to: "contacted" })] : []),
    log(admin, "lead", id, `${CHANNEL[channel].toLowerCase()} logged${advance ? " · stage → Contacted" : ""}`, { name: before.name }),
  ]);
  return detailResult(id, `${CHANNEL[channel]} logged for ${before.name}`);
}

export interface NewLead {
  name: string;
  mobile: string;
  email: string;
  project: string;
  interest: string;
  budget: string;
  source: string;
  agent: string;
  note: string;
}

export async function createLead(input: NewLead): Promise<ActionResult<{ id: number }>> {
  const admin = await requireAdmin();
  const d = need();
  const v = {
    name: txt(input.name, 120),
    mobile: txt(input.mobile, 30),
    email: txt(input.email, 160).toLowerCase(),
    project: txt(input.project, 80),
    interest: txt(input.interest, 80),
    budget: txt(input.budget, 60),
    source: txt(input.source, 40) || "Walk-in",
    agent: txt(input.agent, 80),
  };
  const fields: Record<string, string> = {};
  if (!v.name) fields.name = "Enter the lead's name.";
  if (!v.mobile && !v.email) fields.mobile = "Enter a mobile number or an email.";
  if (v.mobile && v.mobile.replace(/\D/g, "").length < 9) fields.mobile = "Enter a full mobile number.";
  if (v.email && !EMAIL.test(v.email)) fields.email = "Check the email address.";
  if (Object.keys(fields).length) return { ok: false, error: "Check the highlighted fields.", fields };

  const [row] = await d
    .insert(schema.leads)
    .values({ ...v, kind: "enquiry", phoneKey: phoneKey(v.mobile), page: "admin" })
    .returning({ id: schema.leads.id });
  const note = txt(input.note, 2000);
  await d.batch([
    event(row.id, admin.name, "created", `Added in the console · ${v.source}`, { source: v.source }),
    ...(note ? [event(row.id, admin.name, "note", note)] : []),
    log(admin, "lead", row.id, "created", { name: v.name, source: v.source }),
  ]);
  refresh();
  return { ok: true, data: { id: row.id }, message: `${v.name} added` };
}

/** Keeps the older lead, moves the other one's timeline and visits onto it, then deletes it. */
export async function mergeLeads(a: number, b: number): Promise<ActionResult<LeadDetail>> {
  const admin = await requireAdmin();
  const d = need();
  if (!validId(a) || !validId(b) || a === b) return { ok: false, error: "Pick two different leads." };
  const rows = await d.select().from(schema.leads).where(inArray(schema.leads.id, [a, b]));
  if (rows.length !== 2) return { ok: false, error: "One of these leads no longer exists." };
  const [keep, drop] = rows.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());

  const fill: Partial<typeof schema.leads.$inferInsert> = {};
  for (const k of ["name", "mobile", "email", "project", "unit", "interest", "budget", "agent", "message"] as const) if (!keep[k] && drop[k]) fill[k] = drop[k];
  if (fill.mobile) fill.phoneKey = phoneKey(fill.mobile);
  // The further-along stage wins (lost only if both are lost).
  const order: LeadStage[] = ["new", "contacted", "visit", "negotiation", "reserved", "won"];
  const stage = keep.stage === "lost" ? drop.stage : drop.stage === "lost" ? keep.stage : order.indexOf(drop.stage) > order.indexOf(keep.stage) ? drop.stage : keep.stage;
  if (stage !== keep.stage) fill.stage = stage;
  if (!keep.followUpAt && drop.followUpAt) fill.followUpAt = drop.followUpAt;
  const extra = drop.email && keep.email && drop.email !== keep.email ? ` · secondary email ${drop.email}` : "";

  await d.batch([
    d.update(schema.leadEvents).set({ leadId: keep.id }).where(eq(schema.leadEvents.leadId, drop.id)),
    d.update(schema.visits).set({ leadId: keep.id }).where(eq(schema.visits.leadId, drop.id)),
    d.update(schema.leads).set({ ...fill, updatedAt: new Date() }).where(eq(schema.leads.id, keep.id)),
    event(keep.id, admin.name, "merge", `Merged with ${drop.name || "lead"} #${drop.id} (${drop.source}, ${dayLabel(ymdOf(drop.createdAt.getTime()))})${extra}`, { merged: drop.id }),
    d.delete(schema.leads).where(eq(schema.leads.id, drop.id)),
    log(admin, "lead", keep.id, `merged with #${drop.id}`, { name: keep.name, merged: drop.id }),
  ]);
  return detailResult(keep.id, `Leads merged into ${keep.name || `#${keep.id}`}`);
}

/** For spam and test entries. Removes the lead's timeline and visits too. */
export async function deleteLead(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  if (!validId(id)) return { ok: false, error: "Unknown lead." };
  const res = await d.delete(schema.leads).where(eq(schema.leads.id, id)).returning({ name: schema.leads.name, kind: schema.leads.kind });
  if (!res.length) return { ok: false, error: "This lead no longer exists." };
  await log(admin, "lead", id, "deleted", { name: res[0].name, kind: res[0].kind });
  refresh();
  return { ok: true, message: `${res[0].name || "Lead"} deleted` };
}

/* ───────── Site visits ───────── */

export interface NewVisit {
  leadId?: number;
  /** When booking for someone who is not a lead yet */
  name?: string;
  mobile?: string;
  project: string;
  type: VisitType;
  location?: string;
  date: string;
  time: string;
  party: number;
  agent: string;
  note: string;
}

const VISIT_TYPES: VisitType[] = ["site", "gallery", "video"];

/** How many visits a location already has in the hour starting at `ms`. */
async function bookedInHour(location: string, ms: number, exceptId?: number) {
  // Colombo is UTC+05:30, so its hours start at :30 past the UTC hour.
  const hour = ms - ((ms + 330 * 60_000) % 3_600_000);
  const [{ n }] = await need()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.visits)
    .where(
      and(
        eq(schema.visits.location, location),
        gte(schema.visits.startsAt, new Date(hour)),
        lt(schema.visits.startsAt, new Date(hour + 3_600_000)),
        ne(schema.visits.status, "cancelled"),
        ...(exceptId ? [ne(schema.visits.id, exceptId)] : []),
      ),
    );
  return n;
}

export async function createVisit(input: NewVisit, force = false): Promise<ActionResult<{ id: number; date: string }>> {
  const admin = await requireAdmin();
  const d = need();
  const fields: Record<string, string> = {};
  const type = VISIT_TYPES.includes(input.type) ? input.type : "site";
  const project = txt(input.project, 80);
  const location = txt(input.location, 80) || visitLocation(type, project);
  if (!isYmd(input.date)) fields.date = "Choose a date.";
  if (!/^\d{2}:\d{2}$/.test(input.time ?? "")) fields.time = "Choose a time.";
  const party = Number(input.party) || 1;
  if (!Number.isInteger(party) || party < 1 || party > 30) fields.party = "Enter 1 to 30 people.";
  let leadId = validId(input.leadId) ? input.leadId : undefined;
  const name = txt(input.name, 120);
  const mobile = txt(input.mobile, 30);
  if (!leadId) {
    if (!name) fields.name = "Enter the visitor's name.";
    if (mobile.replace(/\D/g, "").length < 9) fields.mobile = "Enter a full mobile number.";
  }
  if (Object.keys(fields).length) return { ok: false, error: "Check the highlighted fields.", fields };

  const startsAt = at(input.date, input.time);
  if (startsAt < Date.now() - 86_400_000) return { ok: false, error: "That date has passed.", fields: { date: "Choose today or a later date." } };

  if (!force) {
    const cap = (await getCapacity())[location] ?? DEFAULT_CAPACITY;
    const n = await bookedInHour(location, startsAt);
    if (n >= cap) return { ok: false, error: `${location} is full at ${clock(startsAt)} (${n}/${cap}).`, fields: { capacity: `${n}/${cap}` } };
  }

  let leadName = name;
  if (leadId) {
    const [lead] = await d.select({ name: schema.leads.name, stage: schema.leads.stage, respondedAt: schema.leads.respondedAt }).from(schema.leads).where(eq(schema.leads.id, leadId)).limit(1);
    if (!lead) return { ok: false, error: "This lead no longer exists." };
    leadName = lead.name;
    if (lead.stage === "new" || lead.stage === "contacted") {
      await d.batch([
        d.update(schema.leads).set({ stage: "visit", updatedAt: new Date(), ...(!lead.respondedAt ? { respondedAt: new Date() } : {}) }).where(eq(schema.leads.id, leadId)),
        event(leadId, admin.name, "stage", `${STAGE_NAME[lead.stage]} → Site visit`, { from: lead.stage, to: "visit" }),
      ]);
    }
  } else {
    const [row] = await d
      .insert(schema.leads)
      .values({ kind: "site-visit", source: "Phone call", stage: "visit", name, mobile, phoneKey: phoneKey(mobile), project, agent: txt(input.agent, 80), page: "admin", respondedAt: new Date() })
      .returning({ id: schema.leads.id });
    leadId = row.id;
    await event(leadId, admin.name, "created", "Added in the console while booking a visit");
  }

  const [visit] = await d
    .insert(schema.visits)
    .values({ leadId, startsAt: new Date(startsAt), durationMin: type === "video" ? 30 : 60, type, location, project, party, agent: txt(input.agent, 80), status: "confirmed", note: txt(input.note, 1000), bookedBy: admin.username })
    .returning({ id: schema.visits.id });
  const when = `${dayLabel(input.date)}, ${clock(startsAt)}`;
  await d.batch([
    event(leadId, admin.name, "visit", `Visit booked for ${when} · ${location}`, { visit: visit.id }),
    log(admin, "visit", visit.id, `booked for ${when}`, { name: leadName, location, lead: leadId }),
  ]);
  refresh();
  return { ok: true, data: { id: visit.id, date: input.date }, message: `Visit booked for ${leadName} · ${when}` };
}

export interface VisitPatch {
  status?: VisitStatus;
  agent?: string;
  note?: string;
  party?: number;
  date?: string;
  time?: string;
}

const STATUSES = Object.keys(VISIT_STATUS_NAME) as VisitStatus[];

export async function updateVisit(id: number, patch: VisitPatch, force = false): Promise<ActionResult<AdminVisit>> {
  const admin = await requireAdmin();
  const d = need();
  if (!validId(id)) return { ok: false, error: "Unknown visit." };
  const before = await getVisit(id);
  if (!before) return { ok: false, error: "This visit no longer exists." };

  const set: Partial<typeof schema.visits.$inferInsert> = {};
  const parts: string[] = [];
  const events: ReturnType<typeof event>[] = [];
  const leadSet: Partial<typeof schema.leads.$inferInsert> = {};

  if (patch.date !== undefined || patch.time !== undefined) {
    const date = patch.date ?? ymdOf(Date.parse(before.startsAt));
    const time = patch.time ?? "";
    if (!isYmd(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: "Choose a new date and time.", fields: { date: "Choose a date and time." } };
    const ms = at(date, time);
    if (ms !== Date.parse(before.startsAt)) {
      if (!force) {
        const cap = (await getCapacity())[before.location] ?? DEFAULT_CAPACITY;
        const n = await bookedInHour(before.location, ms, id);
        if (n >= cap) return { ok: false, error: `${before.location} is full at ${clock(ms)} (${n}/${cap}).`, fields: { capacity: `${n}/${cap}` } };
      }
      set.startsAt = new Date(ms);
      set.status = patch.status ?? "rescheduled";
      const when = `${dayLabel(date)}, ${clock(ms)}`;
      parts.push(`rescheduled to ${when}`);
      events.push(event(before.leadId, admin.name, "visit", `Visit moved to ${when}`, { visit: id }));
    }
  }
  if (patch.status !== undefined && patch.status !== before.status && !set.startsAt) {
    if (!STATUSES.includes(patch.status)) return { ok: false, error: "Unknown status." };
    set.status = patch.status;
    parts.push(VISIT_STATUS_NAME[patch.status].toLowerCase());
    const when = `${dayLabel(ymdOf(Date.parse(before.startsAt)))}, ${clock(Date.parse(before.startsAt))}`;
    const text = {
      pending: `Visit on ${when} set back to pending`,
      confirmed: `Visit on ${when} confirmed`,
      completed: `Site visit completed · ${before.location}`,
      "no-show": `No-show for the visit on ${when}`,
      rescheduled: `Visit on ${when} marked for rescheduling`,
      cancelled: `Visit on ${when} cancelled`,
    }[patch.status];
    events.push(event(before.leadId, admin.name, "visit", text, { visit: id, status: patch.status }));
    // A missed visit leaves a call-back for tomorrow morning.
    if (patch.status === "no-show") leadSet.followUpAt = new Date(at(addDays(ymdOf(Date.now()), 1), "10:00"));
  }
  if (patch.agent !== undefined && txt(patch.agent, 80) !== before.agent) {
    set.agent = txt(patch.agent, 80);
    parts.push(set.agent ? `assigned to ${set.agent}` : "unassigned");
  }
  if (patch.note !== undefined && txt(patch.note, 1000) !== before.note) {
    set.note = txt(patch.note, 1000);
    parts.push("note updated");
  }
  if (patch.party !== undefined && patch.party !== before.party) {
    if (!Number.isInteger(patch.party) || patch.party < 1 || patch.party > 30) return { ok: false, error: "Enter 1 to 30 people." };
    set.party = patch.party;
    parts.push(`party of ${patch.party}`);
  }
  if (!Object.keys(set).length) return { ok: true, data: before };

  await d.batch([
    d.update(schema.visits).set({ ...set, updatedAt: new Date() }).where(eq(schema.visits.id, id)),
    ...(Object.keys(leadSet).length ? [d.update(schema.leads).set({ ...leadSet, updatedAt: new Date() }).where(eq(schema.leads.id, before.leadId))] : []),
    ...(leadSet.followUpAt ? [event(before.leadId, admin.name, "follow-up", "Call-back set for tomorrow, 10:00 AM after the missed visit")] : []),
    ...events,
    log(admin, "visit", id, parts.join(" · "), { name: before.name, lead: before.leadId }),
  ]);
  const fresh = await getVisit(id);
  refresh();
  return {
    ok: true,
    data: fresh!,
    message: set.status === "completed" ? "Visit marked completed · add the outcome on the lead" : set.status ? `${before.name}: ${VISIT_STATUS_NAME[set.status].toLowerCase()}` : "Visit updated",
  };
}

export async function setCapacity(location: string, n: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const loc = txt(location, 80);
  if (!loc || !Number.isInteger(n) || n < 1 || n > 50) return { ok: false, error: "Capacity must be 1 to 50." };
  const current = await getCapacity();
  const value = { ...current, [loc]: n };
  await d.batch([
    d.insert(schema.settings).values({ key: CAPACITY_KEY, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } }),
    log(admin, "visit", loc, `capacity set to ${n} per hour`, { name: loc }),
  ]);
  refresh();
  return { ok: true, message: `${loc}: ${n} visit${n === 1 ? "" : "s"} per hour` };
}
