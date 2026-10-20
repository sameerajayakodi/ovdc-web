import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { hasDb } from "@/lib/admin/queries";
import { ProjectEditor } from "@/components/admin/projects/ProjectEditor";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <NewProject />
    </Suspense>
  );
}

async function NewProject() {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  return <ProjectEditor project={null} />;
}
