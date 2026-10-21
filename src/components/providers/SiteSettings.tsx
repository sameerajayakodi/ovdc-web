"use client";

import { createContext, useContext, type ReactNode } from "react";
import { company as defaultCompany } from "@/lib/data/content";
import { FX, setRates } from "@/lib/money";
import type { Company } from "@/lib/api";
import type { Currency } from "@/lib/types";

/**
 * Company details and exchange rates saved in admin Settings, for client
 * components. Server components read getSiteSettings() directly.
 */
interface Site {
  company: Company;
  fx: Record<Currency, number>;
}

const fallback: Site = { company: { ...defaultCompany, vat: "", socials: {} }, fx: FX };
const Ctx = createContext<Site>(fallback);

export function SiteSettingsProvider({ value, children }: { value: Site; children: ReactNode }) {
  // money() reads the rates from module scope; the same values run on the server and in the browser.
  setRates(value.fx);
  return <Ctx value={value}>{children}</Ctx>;
}

/** Saved company details, or the built-in defaults outside a provider (e.g. the admin's tour preview). */
export function useSite() {
  return useContext(Ctx);
}
