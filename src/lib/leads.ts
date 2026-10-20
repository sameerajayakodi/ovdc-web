/** Every form on the site (enquiry, brochure, site visit, newsletter, contact) posts here. */

import type { LeadKind } from "@/db/schema";

export type { LeadKind };

/** Name of the hidden honeypot field rendered by <Honeypot /> in every lead form. */
export const HONEYPOT = "website";

export interface LeadInput {
  kind: LeadKind;
  name?: string;
  mobile?: string;
  email?: string;
  project?: string;
  unit?: string;
  interest?: string;
  date?: string;
  slot?: string;
  visitType?: string;
  message?: string;
  /** LinkedIn / portfolio link (careers) */
  url?: string;
}

/** Posts a form to /api/leads. Pass the form's FormData so the honeypot travels with it. */
export async function submitLead(lead: LeadInput, form?: FormData): Promise<boolean> {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...lead,
        [HONEYPOT]: form?.get(HONEYPOT) ?? undefined,
        page: typeof location !== "undefined" ? location.pathname : undefined,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Sri Lankan or international mobile: 9–15 digits, optional +. */
export function isPhone(v: string) {
  return /^\+?[\d\s-]{9,18}$/.test(v.trim()) && v.replace(/\D/g, "").length >= 9;
}
