"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin, type Admin } from "@/lib/admin/auth";
import { destroy, uploadTicket, usage, verifyUpload } from "@/lib/cloudinary";
import { DOC_MAX_BYTES, docResource } from "@/lib/admin/customers";
import type { ActionResult } from "@/lib/admin/types";

function need() {
  if (!db) throw new Error("The database is not configured (DATABASE_URL).");
  return db;
}

const txt = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const validId = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Old (9 digits + V/X) or new (12 digits) Sri Lankan NIC */
const NIC = /^(\d{9}[vVxX]|\d{12})$/;

function log(admin: Admin, ref: string | number, action: string, detail: Record<string, unknown> = {}) {
  return need().insert(schema.activity).values({ actor: admin.username, entity: "customer", ref: String(ref), action, detail });
}

export interface CustomerPatch {
  name: string;
  nic: string;
  mobile: string;
  email: string;
  address: string;
  notes: string;
}

const LABEL: Record<keyof CustomerPatch, string> = { name: "name", nic: "NIC", mobile: "mobile", email: "email", address: "address", notes: "notes" };

export async function updateCustomer(id: number, patch: CustomerPatch): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  if (!validId(id)) return { ok: false, error: "Unknown customer." };
  const v: CustomerPatch = {
    name: txt(patch.name, 120),
    nic: txt(patch.nic, 20).replace(/\s/g, ""),
    mobile: txt(patch.mobile, 30),
    email: txt(patch.email, 160).toLowerCase(),
    address: txt(patch.address, 300),
    notes: txt(patch.notes, 2000),
  };
  const f: Record<string, string> = {};
  if (v.name.length < 2) f.name = "Enter the customer's full name.";
  if (v.nic && !NIC.test(v.nic)) f.nic = "Use 12 digits, or 9 digits and V.";
  if (v.email && !EMAIL.test(v.email)) f.email = "Check the email address.";
  if (v.mobile && v.mobile.replace(/\D/g, "").length < 9) f.mobile = "Check the mobile number.";
  if (Object.keys(f).length) return { ok: false, error: Object.values(f)[0], fields: f };

  const [before] = await d.select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
  if (!before) return { ok: false, error: "This customer no longer exists." };
  const changed = (Object.keys(v) as (keyof CustomerPatch)[]).filter((k) => before[k] !== v[k]);
  if (!changed.length) return { ok: true, message: "No changes" };
  await d.batch([
    d.update(schema.customers).set({ ...v, updatedAt: new Date() }).where(eq(schema.customers.id, id)),
    // Notes and NIC are not copied into the log.
    log(admin, id, `updated ${changed.map((k) => LABEL[k]).join(", ")}`, { name: v.name }),
  ]);
  refresh();
  return { ok: true, message: "Customer saved" };
}

/* ───────── Private documents ───────── */

export async function prepareDocument(customerId: number, file: { name: string; size: number; type: string }): Promise<ActionResult<{ url: string; fields: Record<string, string> }>> {
  await requireAdmin();
  if (!validId(customerId)) return { ok: false, error: "Unknown customer." };
  const [c] = await need().select({ id: schema.customers.id }).from(schema.customers).where(eq(schema.customers.id, customerId)).limit(1);
  if (!c) return { ok: false, error: "This customer no longer exists." };
  if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, error: "This file is empty." };
  const resource = docResource(file.name, file.type);
  const max = Math.min(DOC_MAX_BYTES, (await usage())?.limits[resource] ?? DOC_MAX_BYTES);
  if (file.size > max) return { ok: false, error: `${file.name} is larger than ${Math.round(max / 1024 / 1024)} MB.` };
  try {
    return { ok: true, data: uploadTicket(`private/customers/${customerId}`, resource, "authenticated") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Uploads are not configured." };
  }
}

export interface DocUpload {
  public_id: string;
  version: number;
  signature: string;
  resource_type: string;
  type?: string;
  format?: string;
  bytes?: number;
}

export async function saveDocument(customerId: number, r: DocUpload, name: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  if (!r?.public_id || !verifyUpload(r.public_id, r.version, r.signature)) return { ok: false, error: "The upload could not be verified. Try again." };
  if (r.type !== "authenticated" || !r.public_id.startsWith(`ovdc/private/customers/${customerId}/`)) return { ok: false, error: "The upload could not be verified. Try again." };
  const fileName = txt(name, 160) || r.public_id.split("/").pop()!;
  await d.batch([
    d.insert(schema.customerDocuments).values({
      customerId,
      publicId: r.public_id,
      resourceType: r.resource_type === "raw" ? "raw" : "image",
      name: fileName,
      format: r.format ?? "",
      bytes: Math.round(r.bytes ?? 0),
      uploadedBy: admin.username,
    }),
    log(admin, customerId, "document added", { name: fileName }),
  ]);
  refresh();
  return { ok: true, message: `${fileName} added` };
}

export async function deleteDocument(docId: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const d = need();
  if (!validId(docId)) return { ok: false, error: "Unknown document." };
  const [doc] = await d.select().from(schema.customerDocuments).where(eq(schema.customerDocuments.id, docId)).limit(1);
  if (!doc) return { ok: false, error: "This document no longer exists." };
  if (!(await destroy(doc.publicId, doc.resourceType, "authenticated"))) return { ok: false, error: "Could not delete the file from Cloudinary. Try again." };
  await d.batch([d.delete(schema.customerDocuments).where(eq(schema.customerDocuments.id, docId)), log(admin, doc.customerId, "document deleted", { name: doc.name })]);
  refresh();
  return { ok: true, message: `${doc.name} deleted` };
}
