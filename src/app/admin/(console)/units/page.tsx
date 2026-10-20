import type { Metadata } from "next";
import { Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminUnits, getInventoryProjects, hasDb } from "@/lib/admin/queries";
import { getUnitTypes } from "@/lib/api";
import { parseUnitRef } from "@/lib/unitRef";
import { UnitsConsole } from "@/components/admin/units/UnitsConsole";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Units" };

export default function UnitsPage({ searchParams }: PageProps<"/admin/units">) {
  return (
    <Suspense fallback={<PageSkeleton kpis rows={10} />}>
      <Units searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Units({ searchParams }: Pick<PageProps<"/admin/units">, "searchParams">) {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const sp = await searchParams;
  const projects = await getInventoryProjects();
  if (!projects.length)
    return (
      <div className="ad-page">
        <div className="ad-empty">
          <div className="ad-empty-icon">
            <LayoutGrid size={20} />
          </div>
          <h4>No unit inventory yet</h4>
          <p className="ad-muted" style={{ margin: 0 }}>
            Run <code>npm run db:seed</code> to load the Ocean View Residences inventory.
          </p>
        </div>
      </div>
    );

  const slug = projects.find((p) => p.slug === one(sp.project))?.slug ?? projects[0].slug;
  const [{ units, history }, types] = await Promise.all([getAdminUnits(slug), getUnitTypes(slug)]);
  const ref = parseUnitRef(one(sp.unit) ?? "");
  const initialUnit = ref ? units.find((u) => u.tower === ref.tower && u.code === ref.id)?.id : undefined;
  const tower = one(sp.tower);

  return (
    <UnitsConsole
      key={slug}
      projects={projects}
      slug={slug}
      units={units}
      history={history}
      layouts={types.map((t) => ({ type: t.type, label: t.label, tourId: t.tourId ?? null }))}
      initialUnit={initialUnit}
      initialTower={tower && units.some((u) => u.tower === tower) ? tower : undefined}
    />
  );
}
