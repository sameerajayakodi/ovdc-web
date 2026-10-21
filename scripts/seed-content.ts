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
import { articles, awards, faqGroups, roles } from "../src/lib/data/editorial";
import { testimonials } from "../src/lib/data/content";
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
  // Website content: only into empty tables, so admin edits are never overwritten.
  const empty = async (t: typeof schema.posts | typeof schema.faqs | typeof schema.jobs | typeof schema.testimonials | typeof schema.awards) =>
    (await db.select({ id: t.id }).from(t).limit(1)).length === 0;
  let content = 0;
  if (await empty(schema.posts)) {
    await db.insert(schema.posts).values(
      articles.map((a) => ({ slug: a.slug, title: a.title, dek: a.dek, category: a.category, body: a.body, photo: a.photo, author: "OVDC", published: true, publishAt: new Date(`${a.date}T09:00:00+05:30`) })),
    );
    content += articles.length;
  }
  if (await empty(schema.faqs)) {
    const rows = faqGroups.flatMap((g, gi) => g.items.map((q, i) => ({ group: g.group, q: q.q, a: q.a, sort: gi * 100 + i })));
    await db.insert(schema.faqs).values(rows);
    content += rows.length;
  }
  if (await empty(schema.jobs)) {
    await db.insert(schema.jobs).values(roles.map((r, i) => ({ slug: r.slug, title: r.title, team: r.team, location: r.location, type: r.type, summary: r.summary, duties: r.duties, needs: r.needs, sort: i })));
    content += roles.length;
  }
  if (await empty(schema.testimonials)) {
    await db.insert(schema.testimonials).values(testimonials.map((t, i) => ({ name: t.name, role: t.role, quote: t.quote, sort: i })));
    content += testimonials.length;
  }
  if (await empty(schema.awards)) {
    await db.insert(schema.awards).values(awards.map((a, i) => ({ year: a.year, title: a.title, by: a.by, sort: i })));
    content += awards.length;
  }
  return { plans, tours: added, content };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedContent(cliDb)
    .then((r) => console.log(`Floor plans added: ${r.plans} · tours added: ${r.tours} · content rows added: ${r.content}`))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
