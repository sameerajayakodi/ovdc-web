import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { hasDb } from "@/lib/admin/queries";
import { getAdminTour, getMediaOfKinds, getTourTargets, getUnitRefs } from "@/lib/admin/contentQueries";
import { cloudinaryConfig, usage } from "@/lib/cloudinary";
import { TourEditor } from "@/components/admin/tours/TourEditor";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Edit 360° tour" };

export default function TourEditPage({ params }: PageProps<"/admin/tours/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: Pick<PageProps<"/admin/tours/[id]">, "params">) {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const { id } = await params;
  const tour = await getAdminTour(id);
  if (!tour) notFound();
  const [targets, refs, library, plan] = await Promise.all([getTourTargets(), getUnitRefs(tour.projectSlug), getMediaOfKinds(["360", "image"]), cloudinaryConfig() ? usage() : Promise.resolve(null)]);
  return (
    <TourEditor
      tour={tour}
      types={targets[tour.projectSlug] ?? []}
      unitRefs={refs}
      library={library}
      uploads={cloudinaryConfig() ? { maxPx: plan?.limits.imagePx ?? 25_000_000 } : null}
    />
  );
}
