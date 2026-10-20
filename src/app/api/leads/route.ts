import type { LeadInput, LeadKind } from "@/lib/leads";

const KINDS: LeadKind[] = ["enquiry", "brochure", "site-visit", "newsletter", "contact", "reservation", "application", "portal-access"];

function clean(v: unknown, max = 200) {
  return typeof v === "string" ? v.trim().slice(0, max) : undefined;
}

/**
 * Lead intake. Validates and acknowledges every website form.
 * TODO(admin): persist to the CRM (Leads / Site visits) once the admin API exists,
 * and forward to WhatsApp / email notifications.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = body.kind as LeadKind;
  if (!KINDS.includes(kind)) return Response.json({ error: "Unknown form" }, { status: 400 });

  const lead: LeadInput & { page?: string; receivedAt: string } = {
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
    receivedAt: new Date().toISOString(),
  };

  if (kind === "newsletter") {
    if (!lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
      return Response.json({ error: "A valid email is required" }, { status: 422 });
    }
  } else if (!lead.mobile && !lead.email) {
    return Response.json({ error: "A mobile number or email is required" }, { status: 422 });
  }

  console.info("[lead]", JSON.stringify(lead));
  return Response.json({ ok: true }, { status: 201 });
}
