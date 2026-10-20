/** Formatting helpers shared by admin server and client components. */

export const TZ = "Asia/Colombo";

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** LKR millions → "LKR 68.5 Mn" (or "LKR 1.24 Bn" for large totals). */
export function lkr(mn: number | null | undefined) {
  if (mn == null) return "—";
  if (Math.abs(mn) >= 1000) return `LKR ${(mn / 1000).toFixed(2)} Bn`;
  return `LKR ${mn % 1 === 0 ? mn : mn.toFixed(1)} Mn`;
}

/** Compact grid label: 68.5 → "68.5M" */
export function mnShort(mn: number) {
  return `${mn % 1 === 0 ? mn : mn.toFixed(1)}M`;
}

export function perSqftLkr(mn: number, sqft: number) {
  return `LKR ${Math.round((mn * 1e6) / sqft).toLocaleString("en-US")}`;
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function dateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
}

/** Request time, read once on the server so relative times render the same everywhere. */
export function nowMs() {
  return Date.now();
}

export function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 8) return `${d} d ago`;
  return dateShort(iso);
}

export function csv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

/** Triggers a CSV download in the browser. */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const blob = new Blob(["﻿" + csv(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const STAGE_LABEL = { uc: "Under construction", done: "Completed", soon: "Upcoming" } as const;
