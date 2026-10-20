import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminProject, hasDb } from "@/lib/admin/queries";
import { ProjectEditor } from "@/components/admin/projects/ProjectEditor";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Edit project" };

export default function EditProjectPage(props: PageProps<"/admin/projects/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Editor {...props} />
    </Suspense>
  );
}

async function Editor({ params, searchParams }: PageProps<"/admin/projects/[slug]">) {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const project = await getAdminProject(slug);
  if (!project) notFound();
  return <ProjectEditor project={project} created={sp.created === "1"} />;
}
