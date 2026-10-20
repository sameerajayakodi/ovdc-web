import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProject, getProjects, getTowers, getUnitTypes } from "@/lib/api";
import { BuildingExplorer } from "@/components/explorer/BuildingExplorer";

type Params = PageProps<"/projects/[slug]/explorer">["params"];

export async function generateStaticParams() {
  return (await getProjects()).filter((p) => p.explorer).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]/explorer">): Promise<Metadata> {
  const p = await getProject((await params).slug);
  if (!p) return {};
  return {
    title: `${p.name} building explorer · live availability`,
    description: `Pick a floor of ${p.name} and see which homes are available today, with prices, floor plans and 360° tours.`,
  };
}

export default function ExplorerPage({ params }: PageProps<"/projects/[slug]/explorer">) {
  return (
    <Suspense fallback={<div style={{ minHeight: "100svh", background: "var(--color-navy-ink)" }} />}>
      <Explorer params={params} />
    </Suspense>
  );
}

async function Explorer({ params }: { params: Params }) {
  const slug = (await params).slug;
  const [p, towers, types] = await Promise.all([getProject(slug), getTowers(slug), getUnitTypes(slug)]);
  if (!p || !towers) notFound();
  return (
    <Suspense fallback={<div style={{ minHeight: "100svh", background: "var(--color-navy-ink)" }} />}>
      <BuildingExplorer slug={slug} projectName={p.name} towers={towers} types={types} />
    </Suspense>
  );
}
