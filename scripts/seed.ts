/**
 * Seeds Neon with the sample portfolio and Ocean View Residences inventory.
 *
 *   npm run db:seed            # only if the database is empty
 *   npm run db:seed -- --reset # wipe and re-seed (destroys admin edits)
 */
import { sql } from "drizzle-orm";
import { db, pool, schema } from "./db";
import { projects as sampleProjects } from "../src/lib/data/projects";
import { inventory } from "../src/lib/data/inventory";

const reset = process.argv.includes("--reset");

const FEATURED = new Set(["ocean-view-residences", "the-marine-crest", "lagoon-terraces"]);

async function main() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.projects);
  if (n > 0 && !reset) {
    console.log(`Database already has ${n} projects — skipping. Use --reset to re-seed.`);
    return;
  }

  await db.transaction(async (tx) => {
    if (reset) await tx.execute(sql`truncate activity, price_history, units, projects restart identity cascade`);

    await tx.insert(schema.projects).values(
      sampleProjects.map((p, i) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        loc: p.loc,
        address: p.address,
        type: p.type,
        status: p.status,
        fromMn: p.from,
        tour: p.tour,
        explorer: p.explorer,
        progress: p.progress,
        completion: p.completion,
        uda: p.uda,
        units: p.units,
        floors: p.floors,
        towers: p.towers,
        beds: p.beds,
        availableManual: p.available,
        lat: p.lat,
        lng: p.lng,
        blurb: p.blurb,
        published: true,
        featured: FEATURED.has(p.slug),
        sort: i,
      })),
    );

    let unitCount = 0;
    for (const [slug, towers] of Object.entries(inventory)) {
      for (const [tower, floors] of Object.entries(towers)) {
        const rows = floors.flatMap((f) =>
          f.units.map((u) => ({
            projectSlug: slug,
            tower,
            floor: u.floor,
            letter: u.u,
            code: u.id,
            type: u.type,
            beds: u.beds,
            label: u.label,
            baths: u.baths,
            sqft: u.sqft,
            balcony: u.balcony,
            facing: u.facing,
            view: u.view,
            status: u.status,
            priceMn: u.price,
          })),
        );
        const inserted = await tx.insert(schema.units).values(rows).returning({ id: schema.units.id, priceMn: schema.units.priceMn });
        await tx.insert(schema.priceHistory).values(
          inserted.map((r) => ({ unitId: r.id, priceMn: r.priceMn, previousMn: null, changedBy: "seed" })),
        );
        unitCount += inserted.length;
      }
    }

    await tx.insert(schema.activity).values({
      actor: "system",
      entity: "project",
      ref: "*",
      action: "seeded",
      detail: { projects: sampleProjects.length, units: unitCount },
    });
    console.log(`Seeded ${sampleProjects.length} projects and ${unitCount} units.`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
