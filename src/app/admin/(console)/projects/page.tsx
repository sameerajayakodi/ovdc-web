import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminProjects, hasDb } from "@/lib/admin/queries";
import { photos, projectPhoto, sized } from "@/lib/data/media";
import { nowMs } from "@/lib/admin/format";
import { ProjectsTable } from "@/components/admin/projects/ProjectsTable";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage({ searchParams }: PageProps<"/admin/projects">) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Projects searchParams={searchParams} />
    </Suspense>
  );
}

async function Projects({ searchParams }: Pick<PageProps<"/admin/projects">, "searchParams">) {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const [{ q }, projects] = await Promise.all([searchParams, getAdminProjects()]);
  const thumbs = Object.fromEntries(projects.map((p) => [p.slug, projectPhoto[p.slug] ? sized(photos[projectPhoto[p.slug]], 160) : null]));
  return <ProjectsTable projects={projects} thumbs={thumbs} initialQuery={typeof q === "string" ? q : ""} now={nowMs()} />;
}
