import type { Currency } from "./types";

/** LKR per one unit of each currency. Sample rates (Oct 2026) — move to admin Settings. */
export const FX: Record<Currency, number> = { LKR: 1, USD: 300, AUD: 198, AED: 81.7 };

export const CURRENCIES: Currency[] = ["LKR", "USD", "AUD", "AED"];

export const CURRENCY_NAMES: Record<Currency, string> = {
  LKR: "Sri Lankan rupee",
  USD: "US dollar",
  AUD: "Australian dollar",
  AED: "UAE dirham",
};

const mn = (v: number) => (v % 1 === 0 ? String(v) : v.toFixed(1));

/** Format a price held in LKR millions in the chosen currency. */
export function money(lkrMn: number | null | undefined, cur: Currency = "LKR"): string {
  if (lkrMn == null) return "Price on launch";
  if (cur === "LKR") return `LKR ${mn(lkrMn)} Mn`;
  const v = Math.round((lkrMn * 1e6) / FX[cur] / 1000) * 1000;
  return `${cur} ${v.toLocaleString("en-US")}`;
}

/** Primary price in the chosen currency plus the LKR line underneath when converted. */
export function price(lkrMn: number | null | undefined, cur: Currency = "LKR") {
  return {
    primary: money(lkrMn, cur),
    secondary: cur !== "LKR" && lkrMn != null ? money(lkrMn, "LKR") : "",
  };
}

export function perSqft(lkrMn: number, sqft: number, cur: Currency = "LKR") {
  const v = (lkrMn * 1e6) / sqft / FX[cur];
  return `${cur} ${Math.round(v).toLocaleString("en-US")} / sqft`;
}

export function lkrFull(n: number) {
  return `LKR ${Math.round(n).toLocaleString("en-US")}`;
}
