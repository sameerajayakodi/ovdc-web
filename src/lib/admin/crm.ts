import type { LeadKind, LeadStage, VisitStatus, VisitType } from "@/db/schema";

/** Leads & site visits: labels, pipeline order and Colombo-time helpers shared by server and client. */

export type { LeadKind, LeadStage, VisitStatus, VisitType };

export const STAGES: { k: LeadStage; label: string }[] = [
  { k: "new", label: "New" },
  { k: "contacted", label: "Contacted" },
  { k: "visit", label: "Site visit" },
  { k: "negotiation", label: "Negotiation" },
  { k: "reserved", label: "Reserved" },
  { k: "won", label: "Won" },
  { k: "lost", label: "Lost" },
];
export const STAGE_NAME = Object.fromEntries(STAGES.map((s) => [s.k, s.label])) as Record<LeadStage, string>;
export const isStage = (v: unknown): v is LeadStage => STAGES.some((s) => s.k === v);

export const KIND_LABEL: Record<LeadKind, string> = {
  enquiry: "Enquiry",
  brochure: "Brochure download",
  "site-visit": "Site visit request",
  reservation: "Reservation request",
  contact: "Contact form",
  newsletter: "Newsletter",
  application: "Job application",
  "portal-access": "Portal access",
};
export const KINDS = Object.keys(KIND_LABEL) as LeadKind[];
/** Forms that are buyers. Newsletter sign-ups, job applications and portal requests are kept but filtered out by default. */
export const SALES_KINDS: LeadKind[] = ["enquiry", "brochure", "site-visit", "reservation", "contact"];

export const SOURCES = ["Website", "Walk-in", "Phone call", "WhatsApp", "Referral", "Facebook", "Google Ads", "ikman.lk", "LankaPropertyWeb", "Other"];

export const VISIT_STATUSES: { k: VisitStatus; label: string }[] = [
  { k: "pending", label: "Pending" },
  { k: "confirmed", label: "Confirmed" },
  { k: "completed", label: "Completed" },
  { k: "no-show", label: "No-show" },
  { k: "rescheduled", label: "Rescheduled" },
  { k: "cancelled", label: "Cancelled" },
];
export const VISIT_STATUS_NAME = Object.fromEntries(VISIT_STATUSES.map((s) => [s.k, s.label])) as Record<VisitStatus, string>;

export const VISIT_TYPES: { k: VisitType; label: string }[] = [
  { k: "site", label: "Show apartment on site" },
  { k: "gallery", label: "Sales gallery" },
  { k: "video", label: "Live video tour" },
];
export const GALLERY = "Colombo 03 sales gallery";
export const VIDEO = "Video call";

export function visitLocation(type: VisitType, project: string) {
  if (type === "gallery") return GALLERY;
  if (type === "video") return VIDEO;
  const p = project && project !== "Not sure yet" ? project : "";
  return p ? `${p} show apartment` : "Show apartment";
}

/** Bookable times, 9.00 am – 6.00 pm every 30 minutes. */
export const VISIT_TIMES = Array.from({ length: 19 }, (_, i) => {
  const m = 9 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
export const DEFAULT_CAPACITY = 2;

/** Last nine digits of a phone number: "+94 77 312 4588" and "077 312 4588" match. */
export function phoneKey(mobile: string) {
  const d = mobile.replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : "";
}

export function initials(name: string) {
  return (
    name
      .replace(/[^\p{L}\s]/gu, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/* ───────── Colombo time (UTC+05:30, no daylight saving) ───────── */

const OFFSET = 330 * 60_000;
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function colombo(ms: number) {
  const d = new Date(ms + OFFSET);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), dow: (d.getUTCDay() + 6) % 7 };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" of the Colombo calendar day containing `ms`. */
export function ymdOf(ms: number) {
  const c = colombo(ms);
  return `${c.y}-${pad(c.m)}-${pad(c.d)}`;
}
export const isYmd = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/** Epoch ms of a Colombo wall-clock time. */
export function at(ymd: string, hhmm = "00:00") {
  return Date.parse(`${ymd}T${hhmm}:00+05:30`);
}
export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function mondayOf(ymd: string) {
  const dow = (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(ymd, -dow);
}
export function dowOf(ymd: string) {
  return (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export type CalendarView = "day" | "week" | "month" | "list";

/** The days a calendar view covers: [start, start + days). */
export function rangeOf(view: CalendarView, d: string) {
  if (view === "day") return { start: d, days: 1 };
  if (view === "month") return { start: mondayOf(`${d.slice(0, 8)}01`), days: 42 };
  return { start: mondayOf(d), days: 7 };
}

/** "9:30 AM" */
export function clock(ms: number) {
  const { h, min } = colombo(ms);
  return `${h % 12 || 12}:${pad(min)} ${h >= 12 ? "PM" : "AM"}`;
}
export function hhmmOf(ms: number) {
  const { h, min } = colombo(ms);
  return `${pad(h)}:${pad(min)}`;
}
/** "Wed 22 Oct" */
export function dayLabel(ymd: string) {
  const [, m, d] = ymd.split("-").map(Number);
  return `${DOW[dowOf(ymd)]} ${d} ${MONTHS[m - 1]}`;
}
export function hourLabel(h: number) {
  return `${h % 12 || 12} ${h >= 12 ? "PM" : "AM"}`;
}
export { DOW, MONTHS };

/** Website slots look like "9.30 am" or "2.00 pm"; the console uses "14:00". Returns "HH:MM" or null. */
export function parseSlot(slot: string) {
  const s = slot.trim().toLowerCase();
  const m = /^(\d{1,2})[.:](\d{2})\s*(am|pm)?$/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3]) h = (h % 12) + (m[3] === "pm" ? 12 : 0);
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/** Value for <input type="datetime-local"> in Colombo time. */
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const ms = Date.parse(iso);
  return `${ymdOf(ms)}T${hhmmOf(ms)}`;
}
export function fromLocalInput(v: string) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(v);
  return m ? at(m[1], m[2]) : NaN;
}

/** "Today 11:00", "Tomorrow 10:00", "Overdue 2 days", "Wed 22 Oct 11:00" */
export function relDay(iso: string, now: number) {
  const ms = Date.parse(iso);
  const today = ymdOf(now);
  const day = ymdOf(ms);
  const time = clock(ms);
  if (ms < now) {
    const days = Math.round((at(today) - at(day)) / 86_400_000);
    return { text: days <= 0 ? `Overdue · ${time}` : `Overdue ${days} day${days === 1 ? "" : "s"}`, tone: "danger" as const };
  }
  if (day === today) return { text: `Today ${time}`, tone: "gold" as const };
  if (day === addDays(today, 1)) return { text: `Tomorrow ${time}`, tone: "muted" as const };
  return { text: `${dayLabel(day)} ${time}`, tone: "muted" as const };
}

/** Digits for wa.me links: a local 07X number becomes 947X. */
export function waNumber(mobile: string) {
  let d = mobile.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) d = "94" + d.slice(1);
  return d;
}
