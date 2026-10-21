import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

/**
 * Direct database access for the e2e suite. The database is shared with
 * production, so every lead a test creates is marked (name "E2E …" or an
 * @e2e.ovdc.test email) and removed again by cleanupTestRows().
 */
try {
  process.loadEnvFile(".env.local");
} catch {}

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
export const TEST_DOMAIN = "e2e.ovdc.test";
export const testEmail = (local: string) => `${local}@${TEST_DOMAIN}`;

/** Short unique suffix so parallel tests never touch each other's rows. */
export const tag = () => `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;

/** A made-up client address, so the per-IP throttle never trips across tests. */
export const testIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;

const isTestName = (n: unknown) => typeof n === "string" && /^E2E /.test(n);

export async function cleanupTestRows() {
  if (!sql) return;
  await cleanupTestSales();
  await cleanupTestContent();
  const leads = (await sql`select id from leads where name like 'E2E %' or email like ${`%@${TEST_DOMAIN}`}`) as { id: number }[];
  const ids = leads.map((r) => r.id);
  const visitIds = ids.length ? ((await sql`select id from visits where lead_id = any(${ids})`) as { id: number }[]).map((r) => r.id) : [];

  // Activity rows about test leads and visits (single, bulk and capacity changes on test locations).
  const acts = (await sql`select id, entity, ref, detail from activity where entity in ('lead', 'visit')`) as { id: number; entity: string; ref: string; detail: Record<string, unknown> }[];
  const idSet = new Set(ids.map(String));
  const visitSet = new Set(visitIds.map(String));
  const drop = acts
    .filter((a) => {
      const d = a.detail ?? {};
      if (isTestName(d.name)) return true;
      if (a.entity === "lead" && idSet.has(a.ref)) return true;
      if (a.entity === "visit" && (visitSet.has(a.ref) || idSet.has(String(d.lead)))) return true;
      return Array.isArray(d.ids) && d.ids.length > 0 && d.ids.every((x) => idSet.has(String(x)));
    })
    .map((a) => a.id);
  if (drop.length) await sql`delete from activity where id = any(${drop})`;
  // Events and visits go with the lead (on delete cascade).
  if (ids.length) await sql`delete from leads where id = any(${ids})`;

  // Capacity entries for test-only locations.
  const [cap] = (await sql`select value from settings where key = 'visit_capacity'`) as { value: Record<string, number> }[];
  if (cap && Object.keys(cap.value).some(isTestName)) {
    const value = Object.fromEntries(Object.entries(cap.value).filter(([k]) => !isTestName(k)));
    // Only defaults left (2 per hour): the row existed just because a test saved it.
    if (Object.values(value).every((n) => n === 2)) await sql`delete from settings where key = 'visit_capacity'`;
    else await sql`update settings set value = ${JSON.stringify(value)}::jsonb where key = 'visit_capacity'`;
  }
}

/** Test uploads are named "e2e-…": delete them from Cloudinary and the library. */
export async function cleanupTestMedia() {
  if (!sql) return;
  const rows = (await sql`select id, public_id, resource_type from media where name like 'e2e-%'`) as { id: number; public_id: string; resource_type: string }[];
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  for (const r of rows) {
    if (cloud && key && secret) {
      const timestamp = Math.round(Date.now() / 1000);
      const signature = createHash("sha1").update(`invalidate=true&public_id=${r.public_id}&timestamp=${timestamp}${secret}`).digest("hex");
      await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${r.resource_type}/destroy`, {
        method: "POST",
        body: new URLSearchParams({ public_id: r.public_id, timestamp: String(timestamp), invalidate: "true", api_key: key, signature }),
      }).catch(() => {});
    }
  }
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    await sql`delete from activity where entity = 'media' and (ref = any(${ids.map(String)}) or detail->>'name' like 'e2e-%')`;
    await sql`delete from media where id = any(${ids})`;
  }
  // Test floor plans and tours
  await sql`delete from activity where entity in ('plan', 'tour') and detail->>'name' like 'E2E %'`;
  await sql`delete from floor_plans where type like 'E2E %'`;
  await sql`delete from tours where title like 'E2E %'`;
}

export async function leadIdByEmail(email: string) {
  if (!sql) throw new Error("DATABASE_URL not set");
  const [row] = (await sql`select id from leads where email = ${email} order by id desc limit 1`) as { id: number }[];
  return row?.id;
}

/**
 * Test buyers are named "E2E …". Puts any unit they still hold back on sale,
 * deletes their private documents from Cloudinary, then their rows and log entries.
 */
export async function cleanupTestSales() {
  if (!sql) return;
  const custs = ((await sql`select id from customers where name like 'E2E %'`) as { id: number }[]).map((r) => r.id);
  if (!custs.length) return;
  const held = (await sql`select unit_id, status from reservations where customer_id = any(${custs}) and status in ('reserved', 'sold')`) as { unit_id: number; status: string }[];
  for (const h of held) await sql`update units set status = 'A', updated_at = now() where id = ${h.unit_id} and status = ${h.status === "sold" ? "S" : "R"}`;
  const docs = (await sql`select public_id, resource_type from customer_documents where customer_id = any(${custs})`) as { public_id: string; resource_type: string }[];
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  for (const d of docs) {
    if (!cloud || !key || !secret) break;
    const timestamp = Math.round(Date.now() / 1000);
    const signature = createHash("sha1").update(`invalidate=true&public_id=${d.public_id}&timestamp=${timestamp}&type=authenticated${secret}`).digest("hex");
    await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${d.resource_type}/destroy`, {
      method: "POST",
      body: new URLSearchParams({ public_id: d.public_id, timestamp: String(timestamp), invalidate: "true", type: "authenticated", api_key: key, signature }),
    }).catch(() => {});
  }
  await sql`delete from activity where entity in ('sale', 'customer') and (detail->>'name' like 'E2E %' or (entity = 'customer' and ref = any(${custs.map(String)})))`;
  // Payments and documents go with their reservation and customer (on delete cascade).
  await sql`delete from reservations where customer_id = any(${custs})`;
  await sql`delete from customers where id = any(${custs})`;
}

/** Test posts, questions, roles, testimonials and awards start with "E2E ". */
export async function cleanupTestContent() {
  if (!sql) return;
  await sql`delete from activity where entity = 'content' and detail->>'name' like 'E2E %'`;
  await sql`delete from posts where title like 'E2E %'`;
  await sql`delete from faqs where q like 'E2E %'`;
  await sql`delete from jobs where title like 'E2E %'`;
  await sql`delete from testimonials where name like 'E2E %'`;
  await sql`delete from awards where title like 'E2E %'`;
}
