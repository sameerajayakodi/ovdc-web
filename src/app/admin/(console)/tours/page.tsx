import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { hasDb } from "@/lib/admin/queries";
import { getAdminTours, getPlanProjects, getTourTargets } from "@/lib/admin/contentQueries";
import { ToursList } from "@/components/admin/tours/ToursList";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "360° Tours" };

export default function ToursPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Tours />
    </Suspense>
  );
}

async function Tours() {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const [tours, projects, targets] = await Promise.all([getAdminTours(), getPlanProjects(), getTourTargets()]);
  return <ToursList tours={tours} projects={projects} targets={targets} />;
}
