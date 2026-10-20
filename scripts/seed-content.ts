/**
 * Copies the unit layouts (floor plans) and 360° tours that used to live in
 * src/lib/data into Neon, so they can be edited in /admin. Safe to re-run:
 * rows that already exist are left alone.
 *
 *   npm run db:seed-content
 */
import { pathToFileURL } from "node:url";
import { unitTypes } from "../src/lib/data/inventory";
import { tours } from "../src/lib/data/tours";
import type { PlanRoom } from "../src/db/schema";
import { db as cliDb, pool, schema } from "./db";

type Db = typeof cliDb;

/** "6.4 × 4.8 m" → { w: 6.4, l: 4.8 }; "4.0 × 3.8 m each" keeps the "each" in the name. */
function toRoom(name: string, dim: string): PlanRoom {
  const m = /([\d.]+)\s*×\s*([\d.]+)\s*m(.*)$/.exec(dim);
  if (!m) return { name, w: 0, l: 0 };
  const extra = m[3].trim();
  return { name: extra ? `${name} (${extra})` : name, w: Number(m[1]), l: Number(m[2]) };
}

export async function seedContent(db: Db) {
  let plans = 0;
  for (const [slug, types] of Object.entries(unitTypes)) {
    const rows = await db
      .insert(schema.floorPlans)
      .values(
        types.map((t, i) => ({
          projectSlug: slug,
          key: t.key,
          type: t.type,
          label: t.label,
          sqft: t.sqft,
          balcony: t.balcony,
          facing: t.facing,
          view: t.view,
          rooms: t.rooms.map((r) => toRoom(r.name, r.dim)),
          sort: i,
        })),
      )
      .onConflictDoNothing({ target: [schema.floorPlans.projectSlug, schema.floorPlans.type] })
      .returning({ id: schema.floorPlans.id });
    plans += rows.length;
  }

  let added = 0;
  for (const t of tours) {
    const type = Object.values(unitTypes)
      .flat()
      .find((x) => x.tourId === t.id)?.type ?? t.typeLabel;
    const [row] = await db
      .insert(schema.tours)
      .values({
        id: t.id,
        projectSlug: t.projectSlug,
        type,
        unitRef: t.unitRef,
        title: t.title,
        bedrooms: t.bedrooms,
        bathrooms: t.bathrooms,
        parking: t.parking,
        planRooms: t.planRooms,
        published: true,
      })
      .onConflictDoNothing({ target: schema.tours.id })
      .returning({ id: schema.tours.id });
    if (!row) continue;
    added++;
    await db.insert(schema.tourScenes).values(
      t.scenes.map((s, i) => ({
        tourId: t.id,
        key: s.id,
        name: s.name,
        short: s.short,
        note: s.note,
        sort: i,
        panorama: s.panorama ?? t.panorama,
        thumb: s.thumb ?? "",
        yaw: s.yaw,
        rot: s.rot,
        planX: s.plan[0],
        planY: s.plan[1],
        hotspots: s.hs.map((h) => (h.t === "nav" ? { t: "nav" as const, to: h.to, yaw: h.yaw, pitch: h.pitch } : { t: "info" as const, id: h.id, yaw: h.yaw, pitch: h.pitch, kicker: h.kicker, title: h.title, body: h.body })),
      })),
    );
  }
  return { plans, tours: added };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedContent(cliDb)
    .then((r) => console.log(`Floor plans added: ${r.plans} · tours added: ${r.tours}`))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
