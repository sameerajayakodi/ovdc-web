"use server";

import { refresh, updateTag } from "next/cache";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin/auth";
import { TAGS } from "@/lib/cacheTags";
import type { Office } from "@/lib/api";
import { RATE_KEYS, SOCIAL_KEYS } from "@/lib/admin/settings";
import type { ActionResult } from "@/lib/admin/types";

function need() {
  if (!db) throw new Error("The database is not configured (DATABASE_URL).");
  return db;
}

const txt = (v: unknown, max = 160) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneOk = (v: string) => /^\+?[\d\s()-]{9,20}$/.test(v) && v.replace(/\D/g, "").length >= 9;

export interface SettingsInput {
  company: {
    name: string;
    short: string;
    reg: string;
    vat: string;
    address: [string, string];
    hours: string;
    hotline: string;
    whatsapp: string;
    email: string;
    socials: Partial<Record<(typeof SOCIAL_KEYS)[number], string>>;
  };
  offices: Office[];
  fx: Record<(typeof RATE_KEYS)[number], number>;
}

/** Saves every Settings tab at once. The website picks the changes up on the next request. */
export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  const f: Record<string, string> = {};
  const c = input.company;

  const company = {
    name: txt(c.name, 120),
    short: txt(c.short, 20),
    reg: txt(c.reg, 40),
    vat: txt(c.vat, 40),
    address: [txt(c.address?.[0], 120), txt(c.address?.[1], 120)],
    hours: txt(c.hours, 160),
    hotline: txt(c.hotline, 30),
    whatsapp: txt(c.whatsapp, 30),
    email: txt(c.email, 120).toLowerCase(),
    socials: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, txt(c.socials?.[k], 300)])),
  };
  if (company.name.length < 3) f.name = "Enter the company's legal name.";
  if (!company.short) f.short = "Enter the short name, e.g. OVDC.";
  if (!company.address[0]) f.address = "Enter the registered address.";
  if (!phoneOk(company.hotline)) f.hotline = "Enter the hotline with its area code, e.g. +94 11 234 5678.";
  if (!phoneOk(company.whatsapp)) f.whatsapp = "Enter the WhatsApp number with the country code.";
  if (!EMAIL.test(company.email)) f.email = "Check the sales email address.";
  for (const k of SOCIAL_KEYS) {
    const v = company.socials[k];
    if (v && !/^https:\/\/[^\s]+\.[^\s]+/.test(v)) f[`social_${k}`] = "Use a full https:// link, or leave it empty.";
  }

  const offices: Office[] = (Array.isArray(input.offices) ? input.offices : []).slice(0, 12).map((o, i) => {
    const row = {
      city: txt(o.city, 60),
      label: txt(o.label, 80),
      lines: [txt(o.lines?.[0], 120), txt(o.lines?.[1], 120)],
      phone: txt(o.phone, 30),
      email: txt(o.email, 120).toLowerCase(),
      hours: txt(o.hours, 160),
      lat: Number(o.lat),
      lng: Number(o.lng),
    };
    if (!row.city || !row.label) f[`office${i}`] = `Office ${i + 1}: enter the city and a label.`;
    else if (row.phone && !phoneOk(row.phone)) f[`office${i}`] = `${row.city}: check the phone number.`;
    else if (row.email && !EMAIL.test(row.email)) f[`office${i}`] = `${row.city}: check the email address.`;
    else if (!(row.lat >= 5.5 && row.lat <= 10.2 && row.lng >= 79.4 && row.lng <= 82.1)) f[`office${i}`] = `${row.city}: the map position must be in Sri Lanka.`;
    return row;
  });
  if (!offices.length) f.offices = "Keep at least one office.";

  const fx = Object.fromEntries(
    RATE_KEYS.map((k) => {
      const v = Math.round(Number(input.fx?.[k]) * 100) / 100;
      if (!(v > 0 && v < 100000)) f[`fx_${k}`] = `Enter how many rupees one ${k} buys.`;
      return [k, v];
    }),
  );

  if (Object.keys(f).length) return { ok: false, error: Object.values(f)[0], fields: f };

  const stored = await d.select().from(schema.settings).where(inArray(schema.settings.key, ["company", "offices", "fx"]));
  const same = (k: string, v: unknown) => JSON.stringify(stored.find((r) => r.key === k)?.value) === JSON.stringify(v);
  const rows = (
    [
      ["company", company],
      ["offices", offices],
      ["fx", fx],
    ] as const
  ).filter(([k, v]) => !same(k, v));
  if (!rows.length) return { ok: true, message: "No changes to save" };

  const now = new Date();
  await d.batch([
    d.insert(schema.activity).values({
      actor: admin.username,
      entity: "settings",
      ref: rows.map(([k]) => k).join(","),
      action: "updated",
      detail: { name: rows.map(([k]) => ({ company: "Company & contacts", offices: "Offices", fx: "Exchange rates" })[k]).join(", ") },
    }),
    ...rows.map(([key, value]) => d.insert(schema.settings).values({ key, value, updatedAt: now }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: now } })),
  ]);
  updateTag(TAGS.settings);
  refresh();
  return { ok: true, message: "Saved · live on the website" };
}
