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

export async function leadIdByEmail(email: string) {
  if (!sql) throw new Error("DATABASE_URL not set");
  const [row] = (await sql`select id from leads where email = ${email} order by id desc limit 1`) as { id: number }[];
  return row?.id;
}
