import { createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { HONEYPOT, type LeadInput, type LeadKind } from "@/lib/leads";
import { KIND_LABEL, at, dayLabel, clock, isYmd, parseSlot, phoneKey, visitLocation, ymdOf, type VisitType } from "@/lib/admin/crm";

const KINDS: LeadKind[] = ["enquiry", "brochure", "site-visit", "newsletter", "contact", "reservation", "application", "portal-access"];
const VISIT_TYPES: VisitType[] = ["site", "gallery", "video"];

/** Per-IP throttle: at most this many stored submissions in the window. */
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;

function clean(v: unknown, max = 200) {
  return typeof v === "string" ? v.trim().slice(0, max) : undefined;
}

/**
 * Vercel sets x-real-ip / x-forwarded-for itself, so clients cannot spoof them
 * in production. The address is only ever stored as a salted hash.
 */
function ipHash(req: Request) {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256")
    .update(`${process.env.ADMIN_SESSION_SECRET ?? "ovdc"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Lead intake for every website form. Validates, drops spam (honeypot + per-IP
 * throttle) and stores the lead in Neon for the admin Leads inbox. Site-visit
 * requests with a date and time also create a pending visit on the calendar.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const kind = body.kind as LeadKind;
  if (!KINDS.includes(kind)) return Response.json({ error: "Unknown form" }, { status: 400 });

  const lead: LeadInput & { page?: string } = {
    kind,
    name: clean(body.name, 120),
    mobile: clean(body.mobile, 30),
    email: clean(body.email, 160),
    project: clean(body.project, 80),
    unit: clean(body.unit, 20),
    interest: clean(body.interest, 80),
    date: clean(body.date, 20),
    slot: clean(body.slot, 20),
    visitType: clean(body.visitType, 40),
    message: clean(body.message, 2000),
    url: clean(body.url, 300),
    page: clean(body.page, 200),
  };

  if (kind === "newsletter") {
    if (!lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
      return Response.json({ error: "A valid email is required" }, { status: 422 });
    }
  } else if (!lead.mobile && !lead.email) {
    return Response.json({ error: "A mobile number or email is required" }, { status: 422 });
  }

  // Bots fill every field. Answer like a success so they don't retry.
  if (clean(body[HONEYPOT])) {
    console.warn("[lead] honeypot triggered, dropped", kind);
    return Response.json({ ok: true }, { status: 201 });
  }

  if (!db) {
    // Fresh checkout without DATABASE_URL: keep the forms working.
    console.info("[lead]", JSON.stringify(lead));
    return Response.json({ ok: true }, { status: 201 });
  }

  const hash = ipHash(req);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.leads)
    .where(and(eq(schema.leads.ipHash, hash), gt(schema.leads.createdAt, new Date(Date.now() - WINDOW_MS))));
  if (n >= MAX_PER_WINDOW) {
    return Response.json(
      { error: "Too many submissions. Please try again in a few minutes, or call us." },
      { status: 429, headers: { "Retry-After": String(WINDOW_MS / 1000) } },
    );
  }

  // A visit goes on the calendar only when the form sent a valid, future date and time.
  const type = (VISIT_TYPES as string[]).includes(lead.visitType ?? "") ? (lead.visitType as VisitType) : "site";
  const hhmm = lead.slot ? parseSlot(lead.slot) : null;
  const now = Date.now();
  const startsAt = isYmd(lead.date) && hhmm ? at(lead.date, hhmm) : NaN;
  const bookVisit = (kind === "site-visit" || kind === "reservation") && startsAt > now && startsAt < now + 180 * 86_400_000;

  try {
    const [row] = await db
      .insert(schema.leads)
      .values({
        kind,
        source: "Website",
        stage: bookVisit ? "visit" : "new",
        name: lead.name ?? "",
        mobile: lead.mobile ?? "",
        phoneKey: phoneKey(lead.mobile ?? ""),
        email: (lead.email ?? "").toLowerCase(),
        project: lead.project ?? "",
        unit: lead.unit ?? "",
        interest: lead.interest ?? "",
        message: lead.message ?? "",
        url: lead.url ?? "",
        page: lead.page ?? "",
        visitDate: lead.date ?? "",
        visitSlot: lead.slot ?? "",
        visitType: lead.visitType ?? "",
        ipHash: hash,
      })
      .returning({ id: schema.leads.id });

    const location = visitLocation(type, lead.project ?? "");
    await db.batch([
      db.insert(schema.leadEvents).values({
        leadId: row.id,
        actor: "Website",
        type: "created",
        text: `${KIND_LABEL[kind]} form${lead.page ? ` on ${lead.page}` : ""}`,
        detail: { kind, page: lead.page ?? "" },
      }),
      ...(bookVisit
        ? [
            db.insert(schema.visits).values({
              leadId: row.id,
              startsAt: new Date(startsAt),
              durationMin: type === "video" ? 30 : 60,
              type,
              location,
              project: lead.project ?? "",
              status: "pending",
              note: lead.message ?? "",
            }),
            db.insert(schema.leadEvents).values({
              leadId: row.id,
              actor: "Website",
              type: "visit",
              text: `Visit requested for ${dayLabel(ymdOf(startsAt))}, ${clock(startsAt)} · ${location}`,
            }),
          ]
        : []),
    ]);
  } catch (e) {
    // Keep the submission in the logs so it can be recovered by hand.
    console.error("[lead] could not be stored", JSON.stringify(lead), e);
    return Response.json({ error: "We couldn't send this right now. Please try again." }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 201 });
}
