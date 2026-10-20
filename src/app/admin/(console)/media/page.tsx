import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { hasDb } from "@/lib/admin/queries";
import { getMedia, getPlanProjects } from "@/lib/admin/contentQueries";
import { cloudinaryConfig, usage } from "@/lib/cloudinary";
import { MediaLibrary } from "@/components/admin/media/MediaLibrary";
import { CloudinaryMissing } from "@/components/admin/media/CloudinaryMissing";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Media library" };

export default function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Media searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Media({ searchParams }: Pick<PageProps<"/admin/media">, "searchParams">) {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  if (!cloudinaryConfig()) return <CloudinaryMissing />;
  const sp = await searchParams;
  const [items, projects, plan] = await Promise.all([getMedia(), getPlanProjects(), usage()]);
  const folder = one(sp.folder);
  const open = Number(one(sp.file));
  return (
    <MediaLibrary
      items={items}
      projects={projects}
      plan={plan ? { name: plan.plan, creditsPct: plan.creditsPct, maxPx: plan.limits.imagePx, maxImage: plan.limits.image, maxVideo: plan.limits.video } : null}
      initialFolder={folder && (folder === "web" || projects.some((p) => p.slug === folder)) ? folder : "all"}
      initialOpen={Number.isInteger(open) && open > 0 ? open : null}
    />
  );
}
