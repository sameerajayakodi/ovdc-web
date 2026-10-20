"use client";

import { money, perSqft, price } from "@/lib/money";
import { usePrefs } from "@/components/providers/Preferences";

/** A price in the visitor's chosen currency. Contracts stay in LKR. */
export function Price({ mn, prefix = "", fallback }: { mn: number | null | undefined; prefix?: string; fallback?: string }) {
  const { currency } = usePrefs();
  if (mn == null) return <>{fallback ?? "Price on launch"}</>;
  return (
    <>
      {prefix}
      {money(mn, currency)}
    </>
  );
}

/** Secondary LKR line, shown only when another currency is selected. */
export function PriceLkr({ mn, className }: { mn: number | null | undefined; className?: string }) {
  const { currency } = usePrefs();
  const s = price(mn, currency).secondary;
  return s ? <span className={className}>{s}</span> : null;
}

export function PerSqft({ mn, sqft }: { mn: number; sqft: number }) {
  const { currency } = usePrefs();
  return <>{perSqft(mn, sqft, currency)}</>;
}
