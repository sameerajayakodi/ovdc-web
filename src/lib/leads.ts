/** Every form on the site (enquiry, brochure, site visit, newsletter, contact) posts here. */

export type LeadKind = "enquiry" | "brochure" | "site-visit" | "newsletter" | "contact" | "reservation" | "application" | "portal-access";

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

export async function submitLead(lead: LeadInput): Promise<boolean> {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, page: typeof location !== "undefined" ? location.pathname : undefined }),
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
