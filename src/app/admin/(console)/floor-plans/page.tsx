import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { hasDb } from "@/lib/admin/queries";
import { getAdminPlans, getPlanProjects } from "@/lib/admin/contentQueries";
import { cloudinaryConfig, usage } from "@/lib/cloudinary";
import { PlansConsole } from "@/components/admin/plans/PlansConsole";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Floor plans" };

export default function FloorPlansPage({ searchParams }: PageProps<"/admin/floor-plans">) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Plans searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Plans({ searchParams }: Pick<PageProps<"/admin/floor-plans">, "searchParams">) {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const sp = await searchParams;
  const projects = await getPlanProjects();
  if (!projects.length) return <DbMissing />;
  const slug = projects.find((p) => p.slug === one(sp.project))?.slug ?? projects[0].slug;
  const [{ plans, inventoryTypes }, plan] = await Promise.all([getAdminPlans(slug), cloudinaryConfig() ? usage() : Promise.resolve(null)]);
  const type = one(sp.type);
  return (
    <PlansConsole
      key={slug}
      projects={projects}
      slug={slug}
      plans={plans}
      inventoryTypes={inventoryTypes}
      initialId={plans.find((p) => p.type === type)?.id ?? plans[0]?.id ?? null}
      uploads={cloudinaryConfig() ? { maxPx: plan?.limits.imagePx ?? 25_000_000 } : null}
    />
  );
}
